import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongoose";
import Shipment from "@/models/Shipment";
import User from "@/models/User";
import { verifyToken } from "@/lib/auth";
import { hasModulePermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { linkBookingToShipmentsBulk, linkContainerToShipmentsBulk, BulkShipmentResult } from "@/lib/tracking/sync";
import { getAdapter } from "@/lib/tracking/adapters";
import { CARRIER_CODES, CARRIER_LABELS, CarrierCode } from "@/lib/tracking/schema";

const REFERENCE_RE = /^[A-Z0-9-]{5,35}$/;
const CONTAINER_NUMBER_RE = /^[A-Z]{4}\d{7}$/;
const MAX_SHIPMENTS = 100;

async function authorize() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const actor = verifyToken(token);
  if (!actor) return { error: NextResponse.json({ error: "Invalid session token" }, { status: 401 }) };

  await connectDB();
  const actorUser = await User.findById(actor.userId).lean<any>();
  if (!actorUser || !hasModulePermission(actorUser, "shipments")) {
    return {
      error: NextResponse.json(
        { error: "Forbidden: You do not have permission to manage shipment tracking." },
        { status: 403 }
      ),
    };
  }
  return { actor };
}

type ItemResult = {
  id: string; // tracking number, as shown in the directory
  status: "updated" | "unchanged" | "skipped" | "failed";
  containersAdded: string[];
  error?: string;
};

/**
 * POST — assigns one carrier booking/B-L reference (mode "booking") or one
 * container number (mode "container") to many shipments with a single carrier
 * call. A shipment that already tracks a different booking is skipped unless
 * its tracking number is listed in `overwriteIds`.
 */
export async function POST(req: Request) {
  const auth = await authorize();
  if (auth.error) return auth.error;
  const { actor } = auth;

  const body = await req.json().catch(() => ({}));
  const mode = body?.mode === "container" ? "container" : body?.mode === "booking" ? "booking" : null;
  const reference = String(body?.reference || "").trim().toUpperCase();
  const carrierInput = String(body?.carrier || "");
  const carrier = (carrierInput || null) as CarrierCode | null;
  const ids: string[] = Array.isArray(body?.shipmentIds)
    ? [...new Set<string>(body.shipmentIds.map((v: unknown) => String(v)))]
    : [];
  const overwrite = new Set<string>(Array.isArray(body?.overwriteIds) ? body.overwriteIds.map((v: unknown) => String(v)) : []);

  if (!mode) return NextResponse.json({ error: "Choose booking reference or container number." }, { status: 400 });
  if (ids.length === 0) return NextResponse.json({ error: "Select at least one shipment." }, { status: 400 });
  if (ids.length > MAX_SHIPMENTS) {
    return NextResponse.json({ error: `Select at most ${MAX_SHIPMENTS} shipments at a time.` }, { status: 400 });
  }
  if (carrier && !CARRIER_CODES.includes(carrier)) {
    return NextResponse.json({ error: `Unsupported carrier "${carrier}".` }, { status: 400 });
  }

  if (mode === "booking") {
    if (!carrier) return NextResponse.json({ error: "Choose the carrier this booking was made with." }, { status: 400 });
    if (!REFERENCE_RE.test(reference)) {
      return NextResponse.json(
        { error: "Enter the booking or B/L reference exactly as the carrier shows it, e.g. CAN1028600." },
        { status: 400 }
      );
    }
    if (!getAdapter(carrier).fetchByReference) {
      return NextResponse.json(
        { error: `Tracking by booking reference isn't available for ${CARRIER_LABELS[carrier]}. Assign a container number instead.` },
        { status: 400 }
      );
    }
  } else if (!CONTAINER_NUMBER_RE.test(reference)) {
    return NextResponse.json(
      { error: "Container number must be 4 letters followed by 7 digits (ISO 6346), e.g. MAEU1234565." },
      { status: 400 }
    );
  }

  const shipments = await Shipment.find({ trackingNumber: { $in: ids } });
  const byTracking = new Map<string, any>(shipments.map((s) => [s.trackingNumber, s]));

  const items: ItemResult[] = [];
  const eligible: string[] = []; // Mongo _ids
  const trackingOf = new Map<string, string>();
  for (const id of ids) {
    const shipment = byTracking.get(id);
    if (!shipment) {
      items.push({ id, status: "failed", containersAdded: [], error: "Shipment not found" });
      continue;
    }
    const current = shipment.carrierBooking;
    const differentBooking =
      mode === "booking" && current?.reference && (current.reference !== reference || current.carrier !== carrier);
    if (differentBooking && !overwrite.has(id)) {
      items.push({
        id,
        status: "skipped",
        containersAdded: [],
        error: `Already tracking ${CARRIER_LABELS[current.carrier as CarrierCode] || current.carrier} ${current.reference}`,
      });
      continue;
    }
    const mongoId = shipment._id.toString();
    eligible.push(mongoId);
    trackingOf.set(mongoId, id);
  }

  let warning: string | undefined;
  if (eligible.length > 0) {
    let results: BulkShipmentResult[];
    if (mode === "booking") {
      const out = await linkBookingToShipmentsBulk(eligible, carrier as CarrierCode, reference);
      results = out.results;
      if (out.lookupError) {
        warning = `Reference saved, but the ${CARRIER_LABELS[carrier as CarrierCode]} lookup failed: ${out.lookupError}`;
      }
    } else {
      const out = await linkContainerToShipmentsBulk(eligible, reference, carrier);
      results = out.results;
      if (out.syncError) warning = `Container added, but the first tracking sync failed: ${out.syncError}`;
    }
    for (const r of results) {
      items.push({
        id: trackingOf.get(r.shipmentId) || r.shipmentId,
        status: r.status,
        containersAdded: r.containersAdded,
        error: r.error,
      });
    }
  }

  const done = items.filter((i) => i.status === "updated" || i.status === "unchanged");
  if (done.length > 0) {
    await logAudit({
      actor: actor!,
      action: mode === "booking" ? "BOOKING_LINKED" : "CONTAINER_LINKED",
      resourceType: "Shipment",
      resourceId: done.map((i) => i.id).join(", "),
      details: `Bulk-assigned ${mode === "booking" ? `${carrier ? CARRIER_LABELS[carrier] : ""} booking` : "container"} ${reference} to ${done.length} shipment(s): ${done
        .map((i) => i.id)
        .join(", ")}.`,
    });
  }

  return NextResponse.json({
    success: true,
    items,
    warning,
    counts: {
      updated: items.filter((i) => i.status === "updated").length,
      unchanged: items.filter((i) => i.status === "unchanged").length,
      skipped: items.filter((i) => i.status === "skipped").length,
      failed: items.filter((i) => i.status === "failed").length,
    },
  });
}

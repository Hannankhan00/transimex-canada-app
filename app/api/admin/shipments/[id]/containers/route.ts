import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongoose";
import Shipment from "@/models/Shipment";
import User from "@/models/User";
import { verifyToken } from "@/lib/auth";
import { hasModulePermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { linkContainerToShipmentAndSync, getContainerTracking } from "@/lib/tracking/sync";
import { CARRIER_CODES, CarrierCode } from "@/lib/tracking/schema";

const CONTAINER_NUMBER_RE = /^[A-Z]{4}\d{7}$/;

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
        { error: "Forbidden: You do not have permission to manage shipment containers." },
        { status: 403 }
      ),
    };
  }
  return { actor };
}

async function findShipment(id: string) {
  return Shipment.findOne({
    $or: [{ trackingNumber: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
  });
}

/** GET — list containers on this shipment along with their cached tracking (reads the cache only, never an adapter). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorize();
  if (auth.error) return auth.error;

  const { id } = await params;
  const shipment = await findShipment(id);
  if (!shipment) return NextResponse.json({ error: "Shipment not found" }, { status: 404 });

  const containers = await Promise.all(
    (shipment.containers || []).map(async (c: any) => ({
      containerNumber: c.containerNumber,
      carrier: c.carrier || null,
      tracking: await getContainerTracking(c.containerNumber),
    }))
  );

  return NextResponse.json({ success: true, containers });
}

/** POST — adds a container number to the shipment (the primary tracking entry point) and runs its first sync immediately. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorize();
  if (auth.error) return auth.error;
  const { actor } = auth;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const containerNumber = String(body?.containerNumber || "").trim().toUpperCase();
  const carrier = (body?.carrier || null) as CarrierCode | null;

  if (!CONTAINER_NUMBER_RE.test(containerNumber)) {
    return NextResponse.json(
      { error: "Container number must be 4 letters followed by 7 digits (ISO 6346), e.g. MAEU1234565." },
      { status: 400 }
    );
  }
  if (carrier && !CARRIER_CODES.includes(carrier)) {
    return NextResponse.json({ error: `Unsupported carrier "${carrier}".` }, { status: 400 });
  }

  const shipment = await findShipment(id);
  if (!shipment) return NextResponse.json({ error: "Shipment not found" }, { status: 404 });

  if ((shipment.containers || []).some((c: any) => c.containerNumber === containerNumber)) {
    return NextResponse.json({ error: `Container ${containerNumber} is already on this shipment.` }, { status: 409 });
  }

  shipment.containers = [...(shipment.containers || []), { containerNumber, carrier: carrier || undefined }];
  await shipment.save();

  try {
    const tracking = await linkContainerToShipmentAndSync(containerNumber, shipment._id.toString(), carrier);

    await logAudit({
      actor: actor!,
      action: "CONTAINER_LINKED",
      resourceType: "Shipment",
      resourceId: shipment.trackingNumber,
      details: `Linked container ${containerNumber} (${tracking.carrier}, detected via ${tracking.carrierDetectionSource}) to shipment ${shipment.trackingNumber}.`,
    });

    return NextResponse.json({ success: true, containerNumber, carrier: tracking.carrier, tracking });
  } catch (error: any) {
    // The container is saved on the shipment either way — the sync can be retried via the refresh endpoint.
    return NextResponse.json(
      {
        success: true,
        containerNumber,
        carrier,
        tracking: null,
        warning: `Container saved, but the first tracking sync failed: ${error.message || error}`,
      },
      { status: 207 }
    );
  }
}

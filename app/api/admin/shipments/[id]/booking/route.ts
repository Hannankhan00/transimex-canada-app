import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongoose";
import Shipment from "@/models/Shipment";
import User from "@/models/User";
import { verifyToken } from "@/lib/auth";
import { hasModulePermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { linkBookingToShipmentAndSync } from "@/lib/tracking/sync";
import { getAdapter } from "@/lib/tracking/adapters";
import { CARRIER_CODES, CARRIER_LABELS, CarrierCode } from "@/lib/tracking/schema";

// Booking and B/L references: letters, digits and dashes (e.g. CAN1028600, CMDUCAN1028600).
const REFERENCE_RE = /^[A-Z0-9-]{5,35}$/;

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

async function findShipment(id: string) {
  return Shipment.findOne({
    $or: [{ trackingNumber: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
  });
}

/**
 * PUT — sets (or re-syncs) the carrier booking / B/L reference for this shipment.
 * One carrier call: saves the vessel, voyage, route and events on the shipment
 * and adds every container the carrier has assigned to the booking.
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorize();
  if (auth.error) return auth.error;
  const { actor } = auth;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const reference = String(body?.reference || "").trim().toUpperCase();
  const carrier = body?.carrier as CarrierCode;

  if (!CARRIER_CODES.includes(carrier)) {
    return NextResponse.json({ error: "Choose the carrier this booking was made with." }, { status: 400 });
  }
  if (!REFERENCE_RE.test(reference)) {
    return NextResponse.json(
      { error: "Enter the booking or B/L reference exactly as the carrier shows it, e.g. CAN1028600." },
      { status: 400 }
    );
  }
  if (!getAdapter(carrier).fetchByReference) {
    return NextResponse.json(
      {
        error: `Tracking by booking reference isn't available for ${CARRIER_LABELS[carrier]} yet. Add its container numbers below instead.`,
      },
      { status: 400 }
    );
  }

  const shipment = await findShipment(id);
  if (!shipment) return NextResponse.json({ error: "Shipment not found" }, { status: 404 });

  try {
    const { booking, containersAdded } = await linkBookingToShipmentAndSync(
      shipment._id.toString(),
      carrier,
      reference
    );

    await logAudit({
      actor: actor!,
      action: "BOOKING_LINKED",
      resourceType: "Shipment",
      resourceId: shipment.trackingNumber,
      details: `Tracked ${CARRIER_LABELS[carrier]} booking ${reference} on shipment ${shipment.trackingNumber}${
        booking.vesselName ? ` (vessel ${booking.vesselName})` : ""
      }; ${containersAdded.length} container(s) added.`,
    });

    return NextResponse.json({ success: true, booking, containersAdded });
  } catch (error: any) {
    // The reference is saved on the shipment either way, so it can be retried.
    return NextResponse.json(
      {
        success: true,
        booking: null,
        warning: `Booking reference saved, but the ${CARRIER_LABELS[carrier]} lookup failed: ${error.message || error}`,
      },
      { status: 207 }
    );
  }
}

/** DELETE — stops tracking the booking reference. Containers already added stay on the shipment. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorize();
  if (auth.error) return auth.error;
  const { actor } = auth;

  const { id } = await params;
  const shipment = await findShipment(id);
  if (!shipment) return NextResponse.json({ error: "Shipment not found" }, { status: 404 });

  const reference = shipment.carrierBooking?.reference;
  shipment.carrierBooking = undefined;
  await shipment.save();

  if (reference) {
    await logAudit({
      actor: actor!,
      action: "BOOKING_UNLINKED",
      resourceType: "Shipment",
      resourceId: shipment.trackingNumber,
      details: `Stopped tracking booking ${reference} on shipment ${shipment.trackingNumber}.`,
    });
  }

  return NextResponse.json({ success: true });
}

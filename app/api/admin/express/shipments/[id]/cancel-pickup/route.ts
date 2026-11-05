import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import connectDB from "@/lib/mongoose";
import ExpressShipment from "@/models/ExpressShipment";
import { logAudit } from "@/lib/audit";
import { requireExpressStaff } from "@/lib/express/access";
import { cancelShipmentPickup } from "@/lib/express/pickupCancel";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Staff cancel the DHL pickup of a booking without cancelling the booking (or retry it after a failed automatic
 * cancel on a cancelled booking). No money moves.
 */
export async function POST(_req: Request, { params }: Ctx) {
  try {
    const access = await requireExpressStaff();
    if (access.error) return access.error;

    const { id } = await params;
    if (!isValidObjectId(id)) return NextResponse.json({ error: "Shipment not found" }, { status: 404 });

    const result = await cancelShipmentPickup({ shipmentId: id, actor: { id: access.actor.userId, staff: true }, reason: "Cancelled by Transimex" });
    if (!result.ok) return NextResponse.json({ error: result.message, code: result.code }, { status: result.status });

    await connectDB();
    const sh = await ExpressShipment.findById(id).select("reference pickupConfirmation").lean();
    await logAudit({
      actor: access.actor,
      action: "EXPRESS_PICKUP_CANCELLED",
      resourceType: "ExpressShipment",
      resourceId: id,
      details: `Cancelled DHL pickup ${sh?.pickupConfirmation || ""} for ${sh?.reference || id} (${result.state})`,
    });
    return NextResponse.json({ success: true, state: result.state });
  } catch (error) {
    console.error("Express admin pickup cancel error:", error);
    return NextResponse.json({ error: "Failed to cancel the pickup" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { requireExpressClient } from "@/lib/express/access";
import { cancelShipmentPickup } from "@/lib/express/pickupCancel";

type Ctx = { params: Promise<{ id: string }> };

/**
 * A client cancels the DHL pickup of their own booking, for example because they will drop the parcel off instead.
 * The booking, label and payment are untouched. Cancelling the booking itself stays with staff once it is paid.
 */
export async function POST(_req: Request, { params }: Ctx) {
  try {
    const access = await requireExpressClient();
    if (access.error) return access.error;

    const { id } = await params;
    if (!isValidObjectId(id)) return NextResponse.json({ error: "Shipment not found" }, { status: 404 });

    const result = await cancelShipmentPickup({ shipmentId: id, actor: { id: access.actor.userId, staff: false }, reason: "Cancelled by customer" });
    if (!result.ok) return NextResponse.json({ error: result.message, code: result.code }, { status: result.status });
    return NextResponse.json({ success: true, state: result.state });
  } catch (error) {
    console.error("Express client pickup cancel error:", error);
    return NextResponse.json({ error: "Failed to cancel the pickup" }, { status: 500 });
  }
}

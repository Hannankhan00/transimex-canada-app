import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { requireExpressClient } from "@/lib/express/access";
import { cancelShipment } from "@/lib/express/cancelService";
import { getPaymentProvider } from "@/lib/express/payments";

type Ctx = { params: Promise<{ id: string }> };

/** A client cancels their own booking that has not been paid. Paid bookings are cancelled by staff. */
export async function POST(_req: Request, { params }: Ctx) {
  try {
    const access = await requireExpressClient();
    if (access.error) return access.error;

    const { id } = await params;
    if (!isValidObjectId(id)) return NextResponse.json({ error: "Shipment not found" }, { status: 404 });

    let provider = null;
    try {
      provider = getPaymentProvider();
    } catch {
      /* cancelling an unpaid booking does not need the provider */
    }

    const result = await cancelShipment({
      shipmentId: id,
      actor: { id: access.actor.userId, staff: false },
      reason: "Cancelled by client",
      provider,
    });
    if (!result.ok) return NextResponse.json({ error: result.message, code: result.code }, { status: result.status });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Express client cancel error:", error);
    return NextResponse.json({ error: "Failed to cancel booking" }, { status: 500 });
  }
}

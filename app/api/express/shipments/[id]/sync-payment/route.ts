import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { requireExpressClient } from "@/lib/express/access";
import { syncShipmentPayment } from "@/lib/express/paymentService";
import { getPaymentProvider } from "@/lib/express/payments";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Asks the payment provider whether the caller's own booking was paid, and finishes it (marks it paid and creates
 * the label) if so. The page calls this when the client returns from the payment page, so the label does not depend
 * on the provider's webhook arriving. Safe to call repeatedly.
 */
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
      provider = null;
    }
    if (!provider) return NextResponse.json({ success: true, paid: false });

    const result = await syncShipmentPayment({ shipmentId: id, userId: access.actor.userId, provider });
    return NextResponse.json({ success: true, paid: result.paid });
  } catch (error) {
    // Never break the page: the webhook can still confirm the payment.
    console.error("Express payment sync error:", error);
    return NextResponse.json({ success: true, paid: false });
  }
}

import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import ExpressShipment from "@/models/ExpressShipment";
import ExpressInvoice from "@/models/ExpressInvoice";
import { requireExpressClient } from "@/lib/express/access";
import { buildPaymentHistory } from "@/lib/express/paymentHistory";

/** The caller's own payment history: card payments for bookings, paid invoices and refunds. */
export async function GET() {
  try {
    const access = await requireExpressClient();
    if (access.error) return access.error;

    await connectDB();
    const userId = access.actor.userId;
    const [shipments, invoices] = await Promise.all([
      ExpressShipment.find({ userId, "payment.state": "paid", "payment.provider": { $ne: "invoice" } })
        .select("reference payment.provider payment.state payment.amountCents payment.paidAt payment.refunds")
        .sort({ "payment.paidAt": -1 })
        .limit(500)
        .lean(),
      ExpressInvoice.find({ userId, status: "paid" }).select("number totalCents paidAt paidMethod").sort({ paidAt: -1 }).limit(500).lean(),
    ]);

    return NextResponse.json({ success: true, currency: "CAD", ...buildPaymentHistory(shipments as any[], invoices as any[]) });
  } catch (error) {
    console.error("Express payments history error:", error);
    return NextResponse.json({ error: "Failed to load payments" }, { status: 500 });
  }
}

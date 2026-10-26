import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { requireExpressClient } from "@/lib/express/access";
import { syncInvoicePayment } from "@/lib/express/invoicePayment";
import { getPaymentProvider } from "@/lib/express/payments";

type Ctx = { params: Promise<{ id: string }> };

/** Asks the payment provider whether the caller's own invoice was paid, and marks it paid if so. Safe to repeat. */
export async function POST(_req: Request, { params }: Ctx) {
  try {
    const access = await requireExpressClient();
    if (access.error) return access.error;

    const { id } = await params;
    if (!isValidObjectId(id)) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    let provider = null;
    try {
      provider = getPaymentProvider();
    } catch {
      provider = null;
    }
    if (!provider) return NextResponse.json({ success: true, paid: false });

    const result = await syncInvoicePayment({ invoiceId: id, userId: access.actor.userId, provider });
    return NextResponse.json({ success: true, paid: result.paid });
  } catch (error) {
    console.error("Express invoice payment sync error:", error);
    return NextResponse.json({ success: true, paid: false });
  }
}

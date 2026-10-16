import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import connectDB from "@/lib/mongoose";
import ExpressInvoice from "@/models/ExpressInvoice";
import { requireExpressClient } from "@/lib/express/access";
import { toClientInvoiceDTO } from "@/lib/express/invoiceDto";

type Ctx = { params: Promise<{ id: string }> };

/** One of the caller's own invoices. Someone else's invoice, and a voided one, is a 404. */
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const access = await requireExpressClient();
    if (access.error) return access.error;

    const { id } = await params;
    if (!isValidObjectId(id)) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    await connectDB();
    const doc = await ExpressInvoice.findOne({ _id: id, userId: access.actor.userId, status: { $ne: "void" } }).lean();
    if (!doc) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    return NextResponse.json({ success: true, invoice: toClientInvoiceDTO(doc as any) });
  } catch (error) {
    console.error("Express invoice fetch error:", error);
    return NextResponse.json({ error: "Failed to load the invoice" }, { status: 500 });
  }
}

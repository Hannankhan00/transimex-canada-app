import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import ExpressAccount from "@/models/ExpressAccount";
import ExpressInvoice from "@/models/ExpressInvoice";
import { requireExpressClient } from "@/lib/express/access";
import { creditSummary } from "@/lib/express/credit";
import { toClientInvoiceDTO } from "@/lib/express/invoiceDto";

/** The caller's own invoices, newest first, with their credit position. */
export async function GET() {
  try {
    const access = await requireExpressClient();
    if (access.error) return access.error;

    await connectDB();
    const account = await ExpressAccount.findOne({ userId: access.actor.userId }).lean();
    const docs = await ExpressInvoice.find({ userId: access.actor.userId, status: { $ne: "void" } }).sort({ issuedAt: -1 }).limit(100).lean();
    // Credit only exists for business accounts with invoice billing.
    const onCredit = Boolean(account && account.type === "b2b" && account.billingModes?.includes("invoice"));
    return NextResponse.json({
      success: true,
      invoices: docs.map((d) => toClientInvoiceDTO(d as any)),
      credit: onCredit && account ? await creditSummary(account) : null,
    });
  } catch (error) {
    console.error("Express invoices list error:", error);
    return NextResponse.json({ error: "Failed to load invoices" }, { status: 500 });
  }
}

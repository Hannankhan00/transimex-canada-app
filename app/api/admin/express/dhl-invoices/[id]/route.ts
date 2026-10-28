import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import connectDB from "@/lib/mongoose";
import ExpressDhlInvoice from "@/models/ExpressDhlInvoice";
import { logAudit } from "@/lib/audit";
import { requireExpressStaff, validationError } from "@/lib/express/access";
import { dhlInvoicePatchSchema } from "@/lib/express/dhlCost";

type Ctx = { params: Promise<{ id: string }> };

/** Marks a DHL invoice paid (or unpaid again). */
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const access = await requireExpressStaff();
    if (access.error) return access.error;

    const { id } = await params;
    if (!isValidObjectId(id)) return NextResponse.json({ error: "DHL invoice not found" }, { status: 404 });

    const parsed = dhlInvoicePatchSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return validationError(parsed.error);
    const { status, paidNote } = parsed.data;

    await connectDB();
    const update = status === "paid" ? { $set: { status, paidAt: new Date(), ...(paidNote ? { paidNote } : {}) } } : { $set: { status }, $unset: { paidAt: "", paidNote: "" } };
    const invoice = await ExpressDhlInvoice.findByIdAndUpdate(id, update, { returnDocument: "after" }).lean();
    if (!invoice) return NextResponse.json({ error: "DHL invoice not found" }, { status: 404 });

    await logAudit({ actor: access.actor, action: "EXPRESS_DHL_INVOICE_STATUS", resourceType: "ExpressDhlInvoice", resourceId: id, details: `DHL invoice ${invoice.number} marked ${status}` });
    return NextResponse.json({ success: true, status: invoice.status, paidAt: invoice.paidAt ? new Date(invoice.paidAt).toISOString() : null });
  } catch (error) {
    console.error("Express DHL invoice update error:", error);
    return NextResponse.json({ error: "Failed to update the DHL invoice" }, { status: 500 });
  }
}

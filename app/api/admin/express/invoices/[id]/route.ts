import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import ExpressInvoice from "@/models/ExpressInvoice";
import { logAudit } from "@/lib/audit";
import { requireExpressStaff, validationError } from "@/lib/express/access";
import { toAdminInvoiceDTO } from "@/lib/express/invoiceDto";
import { markInvoicePaidManually, voidInvoice } from "@/lib/express/invoicing";
import { formatCad } from "@/lib/shipping/core/money";

type Ctx = { params: Promise<{ id: string }> };

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("markPaid"), reference: z.string().trim().min(2, "Enter the payment reference").max(200) }),
  z.object({ action: z.literal("void"), reason: z.string().trim().min(3, "Please give a reason").max(500) }),
]);

const notFound = () => NextResponse.json({ error: "Invoice not found" }, { status: 404 });

async function load(id: string) {
  const doc = await ExpressInvoice.findById(id).lean();
  if (!doc) return null;
  const owner = isValidObjectId(doc.userId) ? await User.findById(doc.userId).select("name email companyName").lean<any>() : null;
  return toAdminInvoiceDTO(doc as any, owner);
}

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const access = await requireExpressStaff();
    if (access.error) return access.error;
    const { id } = await params;
    if (!isValidObjectId(id)) return notFound();
    await connectDB();
    const invoice = await load(id);
    if (!invoice) return notFound();
    return NextResponse.json({ success: true, invoice });
  } catch (error) {
    console.error("Error fetching Express invoice:", error);
    return NextResponse.json({ error: "Failed to load the invoice" }, { status: 500 });
  }
}

/** Staff record an outside payment, or void an unpaid invoice (its bookings are billed again by the next run). */
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const access = await requireExpressStaff();
    if (access.error) return access.error;
    const { id } = await params;
    if (!isValidObjectId(id)) return notFound();

    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return validationError(parsed.error);

    await connectDB();
    const before = await ExpressInvoice.findById(id).select("number totalCents").lean();
    if (!before) return notFound();

    const result =
      parsed.data.action === "markPaid"
        ? await markInvoicePaidManually(id, access.actor.userId, parsed.data.reference)
        : await voidInvoice(id, access.actor.userId, parsed.data.reason);
    if (!result.ok) return NextResponse.json({ error: result.message, code: result.code }, { status: result.code === "not_found" ? 404 : 409 });

    await logAudit({
      actor: access.actor,
      action: parsed.data.action === "markPaid" ? "EXPRESS_INVOICE_PAID" : "EXPRESS_INVOICE_VOIDED",
      resourceType: "ExpressInvoice",
      resourceId: id,
      details:
        parsed.data.action === "markPaid"
          ? `${before.number} (${formatCad(before.totalCents)}) marked paid manually. Reference: ${parsed.data.reference}`
          : `${before.number} (${formatCad(before.totalCents)}) voided: ${parsed.data.reason}`,
    });

    return NextResponse.json({ success: true, invoice: await load(id) });
  } catch (error) {
    console.error("Error updating Express invoice:", error);
    return NextResponse.json({ error: "Failed to update the invoice" }, { status: 500 });
  }
}

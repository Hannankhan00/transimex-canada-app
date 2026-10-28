import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import ExpressDhlInvoice from "@/models/ExpressDhlInvoice";
import ExpressShipment from "@/models/ExpressShipment";
import { logAudit } from "@/lib/audit";
import { requireExpressStaff, validationError } from "@/lib/express/access";
import { dhlInvoiceCreateSchema } from "@/lib/express/dhlCost";

const toDto = (d: any, linked: { count: number; cents: number }) => ({
  id: String(d._id),
  number: d.number,
  totalCents: d.totalCents,
  issuedOn: d.issuedOn ? new Date(d.issuedOn).toISOString() : null,
  status: d.status as "unpaid" | "paid",
  paidAt: d.paidAt ? new Date(d.paidAt).toISOString() : null,
  paidNote: d.paidNote || "",
  note: d.note || "",
  /** Shipments whose DHL charge came from this invoice, and what those charges add up to. */
  linkedCount: linked.count,
  linkedCents: linked.cents,
  createdAt: new Date(d.createdAt).toISOString(),
});

/** Every DHL invoice, newest first, with how much of it is matched to shipments. */
export async function GET() {
  try {
    const access = await requireExpressStaff();
    if (access.error) return access.error;
    await connectDB();

    const invoices = await ExpressDhlInvoice.find().sort({ createdAt: -1 }).limit(200).lean();
    const sums = await ExpressShipment.aggregate([
      { $match: { "dhlActual.invoiceNumber": { $in: invoices.map((i) => i.number) } } },
      { $group: { _id: "$dhlActual.invoiceNumber", count: { $sum: 1 }, cents: { $sum: "$dhlActual.chargeCents" } } },
    ]);
    const byNumber = new Map(sums.map((s) => [String(s._id), { count: s.count as number, cents: s.cents as number }]));
    const unpaidCents = invoices.filter((i) => i.status === "unpaid").reduce((s, i) => s + i.totalCents, 0);

    return NextResponse.json({ success: true, invoices: invoices.map((i) => toDto(i, byNumber.get(i.number) ?? { count: 0, cents: 0 })), unpaidCents });
  } catch (error) {
    console.error("Express DHL invoices error:", error);
    return NextResponse.json({ error: "Failed to load DHL invoices" }, { status: 500 });
  }
}

/** Records a bill received from DHL. */
export async function POST(req: Request) {
  try {
    const access = await requireExpressStaff();
    if (access.error) return access.error;

    const parsed = dhlInvoiceCreateSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return validationError(parsed.error);
    const { number, total, issuedOn, note } = parsed.data;

    await connectDB();
    if (await ExpressDhlInvoice.exists({ number })) return NextResponse.json({ error: "A DHL invoice with this number is already recorded.", code: "duplicate" }, { status: 409 });

    const created = await ExpressDhlInvoice.create({ number, totalCents: total, issuedOn: issuedOn ? new Date(`${issuedOn}T00:00:00.000Z`) : undefined, note, createdBy: access.actor.userId });
    await logAudit({ actor: access.actor, action: "EXPRESS_DHL_INVOICE_ADDED", resourceType: "ExpressDhlInvoice", resourceId: String(created._id), details: `Recorded DHL invoice ${number}` });
    return NextResponse.json({ success: true, invoice: toDto(created.toObject(), { count: 0, cents: 0 }) }, { status: 201 });
  } catch (error) {
    console.error("Express DHL invoice create error:", error);
    return NextResponse.json({ error: "Failed to record the DHL invoice" }, { status: 500 });
  }
}

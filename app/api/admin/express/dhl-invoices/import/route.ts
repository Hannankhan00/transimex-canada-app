import { NextResponse } from "next/server";
import { z } from "zod";
import connectDB from "@/lib/mongoose";
import ExpressShipment from "@/models/ExpressShipment";
import { logAudit } from "@/lib/audit";
import { requireExpressStaff, validationError } from "@/lib/express/access";
import { parseDhlInvoiceCsv } from "@/lib/express/dhlCost";

const bodySchema = z.object({
  csv: z.string().min(1, "Paste or choose the DHL invoice file").max(2_000_000, "The file is too large"),
  invoiceNumber: z.string().trim().min(1, "Enter the DHL invoice number").max(60),
  /** false (default) only shows what would change; true saves it. */
  apply: z.boolean().default(false),
});

/**
 * Reads a DHL invoice detail file and matches each waybill to a booking. Without apply it is a preview, so staff
 * can see the matches and the differences against what was quoted before anything is saved.
 */
export async function POST(req: Request) {
  try {
    const access = await requireExpressStaff();
    if (access.error) return access.error;

    const parsedBody = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsedBody.success) return validationError(parsedBody.error);
    const { csv, invoiceNumber, apply } = parsedBody.data;

    const file = parseDhlInvoiceCsv(csv);
    if (file.error) return NextResponse.json({ error: file.error, code: "unreadable" }, { status: 422 });

    await connectDB();
    const shipments = await ExpressShipment.find({ trackingNumber: { $in: file.lines.map((l) => l.waybill) }, status: { $in: ["label_ready", "cancelled"] } })
      .select("reference trackingNumber dhlActual quoteId")
      .lean();
    const byWaybill = new Map(shipments.map((s) => [s.trackingNumber as string, s]));

    const matched = file.lines.flatMap((l) => {
      const s = byWaybill.get(l.waybill);
      return s ? [{ waybill: l.waybill, chargeCents: l.chargeCents, shipmentId: String(s._id), reference: s.reference, previousCents: s.dhlActual?.chargeCents ?? null }] : [];
    });
    const unmatched = file.lines.filter((l) => !byWaybill.has(l.waybill));

    if (apply && matched.length) {
      const now = new Date();
      await ExpressShipment.bulkWrite(
        matched.map((m) => ({
          updateOne: { filter: { _id: m.shipmentId }, update: { $set: { dhlActual: { chargeCents: m.chargeCents, source: "invoice", recordedAt: now, recordedBy: access.actor.userId, invoiceNumber } } } },
        }))
      );
      await logAudit({ actor: access.actor, action: "EXPRESS_DHL_INVOICE_IMPORTED", resourceType: "ExpressDhlInvoice", resourceId: invoiceNumber, details: `Imported ${matched.length} DHL charges from invoice ${invoiceNumber}` });
    }

    return NextResponse.json({
      success: true,
      applied: apply && matched.length > 0,
      matched,
      unmatched,
      skipped: file.skipped,
      matchedCents: matched.reduce((s, m) => s + m.chargeCents, 0),
      unmatchedCents: unmatched.reduce((s, m) => s + m.chargeCents, 0),
    });
  } catch (error) {
    console.error("Express DHL invoice import error:", error);
    return NextResponse.json({ error: "Failed to read the DHL invoice file" }, { status: 500 });
  }
}

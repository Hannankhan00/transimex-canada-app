import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import connectDB from "@/lib/mongoose";
import ExpressShipment from "@/models/ExpressShipment";
import { logAudit } from "@/lib/audit";
import { requireExpressStaff, validationError } from "@/lib/express/access";
import { cancelShipment } from "@/lib/express/cancelService";
import { getPaymentProvider } from "@/lib/express/payments";
import { formatCad } from "@/lib/shipping/core/money";

type Ctx = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  reason: z.string().trim().min(3, "Please give a reason").max(500),
  /** Required when a label already exists: how much to refund, in cents. */
  refundCents: z.number().int("Whole cents only").min(0).max(100_000_000).optional(),
});

/**
 * Staff cancel a booking.
 *  unpaid                 -> cancelled
 *  paid, no label         -> cancelled and refunded in full
 *  label exists           -> staff choose the refund amount
 *  cancelled, refund failed -> repeats the refund
 */
export async function POST(req: Request, { params }: Ctx) {
  try {
    const access = await requireExpressStaff();
    if (access.error) return access.error;

    const { id } = await params;
    if (!isValidObjectId(id)) return NextResponse.json({ error: "Shipment not found" }, { status: 404 });

    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return validationError(parsed.error);

    let provider = null;
    try {
      provider = getPaymentProvider();
    } catch (error) {
      console.error("[Express] Payments misconfigured:", error);
    }

    const result = await cancelShipment({
      shipmentId: id,
      actor: { id: access.actor.userId, staff: true },
      reason: parsed.data.reason,
      refundCents: parsed.data.refundCents,
      provider,
    });
    if (!result.ok) return NextResponse.json({ error: result.message, code: result.code }, { status: result.status });

    await connectDB();
    const sh = await ExpressShipment.findById(id).select("reference").lean();
    const ref = sh?.reference || id;
    await logAudit({
      actor: access.actor,
      action: "EXPRESS_SHIPMENT_CANCELLED",
      resourceType: "ExpressShipment",
      resourceId: id,
      details: `Cancelled ${ref}: ${parsed.data.reason}`,
    });
    if (result.refundedCents > 0) {
      await logAudit({
        actor: access.actor,
        action: "EXPRESS_REFUND_ISSUED",
        resourceType: "ExpressShipment",
        resourceId: id,
        details: `Refunded ${formatCad(result.refundedCents)} for ${ref}`,
      });
    }

    return NextResponse.json({ success: true, refundedCents: result.refundedCents, refundFailed: result.refundFailed });
  } catch (error) {
    console.error("Express admin cancel error:", error);
    return NextResponse.json({ error: "Failed to cancel booking" }, { status: 500 });
  }
}

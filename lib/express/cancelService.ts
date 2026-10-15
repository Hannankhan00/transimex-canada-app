import connectDB from "@/lib/mongoose";
import ExpressShipment, { type IExpressShipment } from "@/models/ExpressShipment";
import { PaymentError, type PaymentProvider } from "./payments/types";
import { notifyShipmentEvent } from "./shipmentNotify";

export type CancelFailure = {
  ok: false;
  code: "not_found" | "forbidden" | "conflict" | "payments_unavailable" | "invalid";
  status: number;
  message: string;
};

export interface CancelSuccess {
  ok: true;
  /** What was refunded in this call, in cents. */
  refundedCents: number;
  /** True when the booking is cancelled but the refund still has to be retried. */
  refundFailed: boolean;
}

export type CancelResult = CancelSuccess | CancelFailure;

const fail = (code: CancelFailure["code"], status: number, message: string): CancelFailure => ({ ok: false, code, status, message });

export const refundableCents = (sh: Pick<IExpressShipment, "payment">) => Math.max(0, (sh.payment?.amountCents ?? 0) - (sh.payment?.refundedCents ?? 0));

/**
 * Issues a refund and records it on the booking. The provider key is derived
 * from how many refunds are already recorded, so retrying after a failure
 * repeats the same refund (never a second one), while a later partial refund
 * gets a new key.
 */
async function issueRefund(sh: IExpressShipment, amountCents: number, reason: string, by: string, provider: PaymentProvider): Promise<{ ok: true; amountCents: number } | { ok: false }> {
  if (amountCents <= 0) return { ok: true, amountCents: 0 };
  if (!sh.payment?.paymentIntentId) return { ok: false };

  try {
    const refund = await provider.refund({
      paymentIntentId: sh.payment.paymentIntentId,
      amountCents,
      idempotencyKey: `express-refund-${sh._id}-${sh.payment.refunds?.length ?? 0}-${amountCents}`,
      reason,
      shipmentId: String(sh._id),
    });
    if (refund.status === "failed") throw new PaymentError("provider", "Refund failed");
    await ExpressShipment.updateOne(
      { _id: sh._id },
      {
        $inc: { "payment.refundedCents": amountCents },
        $push: { "payment.refunds": { refundId: refund.refundId, amountCents, at: new Date(), reason, by } },
        $set: { "payment.refundState": "done" },
        $unset: { "payment.refundError": "" },
      }
    );
    return { ok: true, amountCents };
  } catch (error) {
    const detail = error instanceof PaymentError ? error.detail || error.message : error instanceof Error ? error.message : String(error);
    console.error("[Express] Refund failed for", sh.reference, detail);
    await ExpressShipment.updateOne({ _id: sh._id }, { $set: { "payment.refundState": "failed", "payment.refundError": detail.slice(0, 300) } });
    return { ok: false };
  }
}

/**
 * Cancels a booking.
 *  - unpaid: just cancelled, nothing to refund (clients and staff).
 *  - paid, no label yet: cancelled and the full payment refunded (staff).
 *  - label already created: staff decide the refund amount. DHL's shipment is
 *    NOT cancelled automatically; staff handle that with DHL.
 */
export async function cancelShipment(params: {
  shipmentId: string;
  actor: { id: string; staff: boolean; ownerId?: string };
  reason: string;
  /** Only used when a label exists: how much to refund. */
  refundCents?: number;
  provider: PaymentProvider | null;
}): Promise<CancelResult> {
  await connectDB();
  const { actor, reason } = params;

  const sh = await ExpressShipment.findById(params.shipmentId).lean<IExpressShipment>().catch(() => null);
  if (!sh) return fail("not_found", 404, "Shipment not found");
  if (!actor.staff && sh.userId !== actor.id) return fail("not_found", 404, "Shipment not found");

  const now = new Date();
  const history = (note: string) => ({ status: "cancelled" as const, at: now, by: actor.id, note });

  // ---- already cancelled: staff may retry a failed refund ----
  if (sh.status === "cancelled") {
    if (!actor.staff) return fail("conflict", 409, "This booking is already cancelled.");
    if (sh.payment?.refundState !== "failed") return fail("conflict", 409, "This booking is already cancelled.");
    if (!params.provider) return fail("payments_unavailable", 503, "Payments are not available.");
    const left = refundableCents(sh);
    const wanted = sh.cancellation?.refundCents ? Math.min(sh.cancellation.refundCents - (sh.payment.refundedCents ?? 0), left) : left;
    const r = await issueRefund(sh, Math.max(0, wanted), `Retry: ${reason}`, actor.id, params.provider);
    if (!r.ok) return { ok: true, refundedCents: 0, refundFailed: true };
    await notifyShipmentEvent(String(sh._id), "refunded");
    return { ok: true, refundedCents: r.amountCents, refundFailed: false };
  }

  // ---- unpaid ----
  if (sh.status === "awaiting_payment") {
    const updated = await ExpressShipment.findOneAndUpdate(
      { _id: sh._id, status: "awaiting_payment" },
      { $set: { status: "cancelled", cancellation: { reason, by: actor.id, at: now, refundCents: 0 } }, $push: { statusHistory: history(reason) } },
      { returnDocument: "after" }
    );
    if (!updated) return fail("conflict", 409, "This booking changed while you were cancelling it. Reload and try again.");
    // The open payment page must not take money for a cancelled booking.
    if (sh.payment?.sessionId && params.provider) await params.provider.expireSession(sh.payment.sessionId);
    await notifyShipmentEvent(String(sh._id), "cancelled");
    return { ok: true, refundedCents: 0, refundFailed: false };
  }

  // Everything below moves money: staff only.
  if (!actor.staff) return fail("forbidden", 403, "Only Transimex staff can cancel a paid booking. Please contact us.");
  if (!params.provider) return fail("payments_unavailable", 503, "Payments are not available, so a refund cannot be issued.");

  // ---- paid, no label yet: full refund ----
  if (sh.status === "paid") {
    const state = sh.fulfilment?.state ?? "none";
    if (state === "pending") return fail("conflict", 409, "The label is being created right now. Wait a moment and try again.");
    if (state === "unknown") return fail("conflict", 409, "DHL may already have booked this shipment. Check with DHL and enter its tracking number instead of cancelling.");
    if (sh.trackingNumber) return fail("conflict", 409, "DHL already booked this shipment. Upload its label instead of cancelling, or cancel it with DHL first.");

    const full = refundableCents(sh);
    const updated = await ExpressShipment.findOneAndUpdate(
      { _id: sh._id, status: "paid", "fulfilment.state": { $in: ["none", "failed"] }, trackingNumber: { $exists: false } },
      { $set: { status: "cancelled", cancellation: { reason, by: actor.id, at: now, refundCents: full } }, $push: { statusHistory: history(reason) } },
      { returnDocument: "after" }
    ).lean<IExpressShipment>();
    if (!updated) return fail("conflict", 409, "This booking changed while you were cancelling it. Reload and try again.");

    const r = await issueRefund(updated, full, reason, actor.id, params.provider);
    await notifyShipmentEvent(String(sh._id), r.ok ? "refunded" : "cancelled");
    return { ok: true, refundedCents: r.ok ? r.amountCents : 0, refundFailed: !r.ok };
  }

  // ---- label exists: staff decide ----
  if (sh.status === "label_ready") {
    const left = refundableCents(sh);
    const amount = params.refundCents;
    if (amount === undefined || !Number.isInteger(amount) || amount < 0 || amount > left) {
      return fail("invalid", 422, `Choose a refund between $0.00 and ${(left / 100).toFixed(2)}.`);
    }
    const updated = await ExpressShipment.findOneAndUpdate(
      { _id: sh._id, status: "label_ready" },
      { $set: { status: "cancelled", cancellation: { reason, by: actor.id, at: now, refundCents: amount } }, $push: { statusHistory: history(`${reason} (label existed; DHL shipment not cancelled automatically)`) } },
      { returnDocument: "after" }
    ).lean<IExpressShipment>();
    if (!updated) return fail("conflict", 409, "This booking changed while you were cancelling it. Reload and try again.");

    const r = await issueRefund(updated, amount, reason, actor.id, params.provider);
    await notifyShipmentEvent(String(sh._id), r.ok && amount > 0 ? "refunded" : "cancelled");
    return { ok: true, refundedCents: r.ok ? r.amountCents : 0, refundFailed: !r.ok };
  }

  return fail("conflict", 409, "This booking cannot be cancelled.");
}

import connectDB from "@/lib/mongoose";
import ExpressShipment, { type IExpressShipment } from "@/models/ExpressShipment";
import { recordPartnerReversal } from "./partnerPayouts";
import type { PaymentEvent } from "./payments/types";

/**
 * Records a refund on a booking exactly once, whoever made it. The refund id is the key: the app's own refund and the
 * provider's "refund.created" webhook for it both call this, in either order, and only the first one counts the money.
 * Returns true when this call was the one that recorded it.
 */
export async function recordRefundOnce(params: { shipmentId: string; refundId: string; amountCents: number; reason: string; by: string }): Promise<boolean> {
  const res = await ExpressShipment.updateOne(
    { _id: params.shipmentId, "payment.refunds.refundId": { $ne: params.refundId } },
    {
      $inc: { "payment.refundedCents": params.amountCents },
      $push: { "payment.refunds": { refundId: params.refundId, amountCents: params.amountCents, at: new Date(), reason: params.reason, by: params.by } },
    }
  );
  return res.modifiedCount === 1;
}

/**
 * A refund the provider reports. If it was made outside this app (the Stripe dashboard, for example) it is recorded on
 * the booking and the partner who earned from it gives back their share. A refund this app made is already recorded, so
 * this changes nothing for it except to repair a missing partner reversal.
 */
export async function handleRefundEvent(event: PaymentEvent): Promise<string> {
  await connectDB();
  if (!event.paymentIntentId || !event.refundId || !(event.refundAmountCents && event.refundAmountCents > 0)) return "ignored";
  if (event.refundStatus === "failed" || event.refundStatus === "canceled") return "ignored";
  const sh = await ExpressShipment.findOne({ "payment.paymentIntentId": event.paymentIntentId }).select("_id payment.partnerShare payment.amountCents payment.refundedCents").lean<IExpressShipment>();
  if (!sh) return "ignored"; // an invoice payment, or a payment that is not a booking

  const recorded = await recordRefundOnce({ shipmentId: String(sh._id), refundId: event.refundId, amountCents: event.refundAmountCents, reason: "Refund made in the payment provider", by: "provider" });
  if (recorded) await ExpressShipment.updateOne({ _id: sh._id }, { $set: { "payment.refundState": "done" } });
  if (sh.payment?.partnerShare) {
    await recordPartnerReversal({ shipmentId: String(sh._id), refundKey: event.refundId, refundCents: event.refundAmountCents });
  }
  return recorded ? "refund_recorded" : "refund_already_known";
}

/**
 * A chargeback. The booking is flagged for staff, and the partner who earned from it gives back their share of the
 * amount in dispute straight away. Stripe also takes a dispute fee; staff handle that one by hand.
 */
export async function handleDisputeEvent(event: PaymentEvent): Promise<string> {
  await connectDB();
  if (!event.paymentIntentId || !event.disputeId || !(event.disputeAmountCents && event.disputeAmountCents > 0)) return "ignored";
  const sh = await ExpressShipment.findOne({ "payment.paymentIntentId": event.paymentIntentId }).select("_id reference payment.partnerShare").lean<IExpressShipment>();
  if (!sh) return "ignored";

  const flagged = await ExpressShipment.updateOne(
    { _id: sh._id, "payment.dispute.id": { $ne: event.disputeId } },
    { $set: { "payment.dispute": { id: event.disputeId, amountCents: event.disputeAmountCents, at: new Date() } } }
  );
  if (flagged.modifiedCount === 1) console.error("[Express] CHARGEBACK on booking", sh.reference, event.disputeId);
  if (sh.payment?.partnerShare) {
    await recordPartnerReversal({ shipmentId: String(sh._id), refundKey: `dispute-${event.disputeId}`, refundCents: event.disputeAmountCents, note: "Customer dispute (chargeback)" });
  }
  return flagged.modifiedCount === 1 ? "dispute_recorded" : "dispute_already_known";
}

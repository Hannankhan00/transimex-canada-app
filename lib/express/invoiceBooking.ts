import type { Types } from "mongoose";
import connectDB from "@/lib/mongoose";
import ExpressCreditNote from "@/models/ExpressCreditNote";
import ExpressShipment, { type IExpressShipment } from "@/models/ExpressShipment";
import { creditSummary } from "./credit";
import { fulfilShipment } from "./fulfilment";

export type OnAccountResult =
  | { ok: true }
  | { ok: false; code: "credit_exceeded" | "not_found" | "not_payable"; message: string };

/**
 * Puts a freshly created booking on the account's credit and starts the label.
 *
 * The caller checked the credit before creating the booking. This re-checks
 * AFTER the booking exists (and so counts it), which closes the gap between two
 * bookings made at the same moment: if the account is over its limit with this
 * booking included, it is cancelled with nothing charged. The check can be
 * over-cautious (two simultaneous bookings may both be refused), never loose.
 */
export async function authorizeOnAccount(shipmentId: string, account: { _id: unknown; creditLimitCents?: number | null }): Promise<OnAccountResult> {
  await connectDB();
  const sh = await ExpressShipment.findById(shipmentId).lean<IExpressShipment>();
  if (!sh) return { ok: false, code: "not_found", message: "Shipment not found" };
  if (sh.status !== "awaiting_payment" || sh.billing?.mode !== "invoice") return { ok: false, code: "not_payable", message: "This booking is not waiting to be put on credit." };

  const summary = await creditSummary(account);
  if (summary.limitCents == null || summary.usedCents > summary.limitCents) {
    await ExpressShipment.updateOne(
      { _id: sh._id, status: "awaiting_payment" },
      {
        $set: { status: "cancelled", "billing.creditedCents": sh.billing.chargeCents, cancellation: { reason: "Credit limit reached", by: "system", at: new Date(), refundCents: 0 } },
        $push: { statusHistory: { status: "cancelled", at: new Date(), by: "system", note: "Credit limit reached" } },
      }
    );
    return { ok: false, code: "credit_exceeded", message: "This booking would go over your credit limit." };
  }

  const now = new Date();
  const moved = await ExpressShipment.findOneAndUpdate(
    { _id: sh._id, status: "awaiting_payment", "billing.mode": "invoice" },
    {
      $set: { status: "paid", "payment.provider": "invoice", "payment.state": "paid", "payment.paidAt": now },
      $push: { statusHistory: { status: "paid", at: now, by: "system", note: "Billed to the account" } },
    },
    { returnDocument: "after" }
  ).lean<IExpressShipment>();
  if (!moved) return { ok: false, code: "not_payable", message: "This booking changed. Reload and try again." };

  // A label problem is recorded on the booking for staff; it must not turn a valid booking into an error.
  try {
    await fulfilShipment(String(moved._id));
  } catch (error) {
    console.error("[Express] Fulfilment threw for", moved.reference, error);
  }
  return { ok: true };
}

/**
 * Gives money back on an invoice booking that is being cancelled.
 *  - not invoiced yet: the credit comes straight off what will be billed
 *  - already on an invoice: a credit note is created and used on the next invoice
 * The atomic update decides which case applies, so a cancellation racing an
 * invoice run is never lost or counted twice.
 */
export async function creditInvoiceBooking(sh: Pick<IExpressShipment, "accountId" | "userId" | "billing" | "reference"> & { _id: Types.ObjectId | string }, creditCents: number, reason: string, byUserId: string): Promise<{ appliedTo: "next_invoice" | "billing" | "nothing" }> {
  await connectDB();
  if (!sh.billing || creditCents <= 0) return { appliedTo: "nothing" };

  const direct = await ExpressShipment.updateOne({ _id: sh._id, "billing.invoiceId": { $exists: false } }, { $inc: { "billing.creditedCents": creditCents } });
  if (direct.modifiedCount === 1) return { appliedTo: "billing" };

  await ExpressShipment.updateOne({ _id: sh._id }, { $inc: { "billing.creditedCents": creditCents } });
  await ExpressCreditNote.create({ accountId: sh.accountId, userId: sh.userId, amountCents: creditCents, reason: `${sh.reference}: ${reason}`.slice(0, 300), shipmentId: String(sh._id), createdBy: byUserId });
  return { appliedTo: "next_invoice" };
}

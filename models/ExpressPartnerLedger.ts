import mongoose, { Document, Model, Schema } from "mongoose";

/**
 * What Transimex owes a partner, as an append-only list (never edited, never deleted). A partner who does not use their
 * own Stripe account has their customers pay Transimex; each payment adds an "earning" here, each refund a "reversal",
 * and each payout to the partner a "payout". The balance is the sum of amountCents.
 *
 * `key` makes every entry idempotent: the same payment, refund or payout can only ever be recorded once, even if a
 * webhook is delivered twice or two requests race.
 */
export interface IExpressPartnerLedger extends Document {
  partnerAccountId: string;
  type: "earning" | "reversal" | "payout" | "adjustment";
  /** Signed whole cents: positive is owed to the partner, negative reduces it. */
  amountCents: number;
  /** From this moment the amount counts as withdrawable (earnings wait out the hold period). */
  availableAt: Date;
  /** Unique per event, for example "earn:<shipmentId>". */
  key: string;
  shipmentId?: string;
  payoutId?: string;
  note?: string;
  /** How an earning was worked out, kept so a statement can explain it. */
  detail?: { chargeCents: number; markupCents: number; feeCents: number; feeEstimated: boolean };
  createdAt: Date;
}

const ExpressPartnerLedgerSchema = new Schema<IExpressPartnerLedger>(
  {
    partnerAccountId: { type: String, required: true, index: true },
    type: { type: String, enum: ["earning", "reversal", "payout", "adjustment"], required: true },
    amountCents: {
      type: Number,
      required: true,
      validate: { validator: Number.isSafeInteger, message: "amountCents must be a whole number of cents" },
    },
    availableAt: { type: Date, required: true },
    key: { type: String, required: true, unique: true },
    shipmentId: { type: String, index: true },
    payoutId: { type: String },
    note: { type: String, maxlength: 300 },
    detail: {
      type: new Schema({ chargeCents: Number, markupCents: Number, feeCents: Number, feeEstimated: Boolean }, { _id: false }),
      default: undefined,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ExpressPartnerLedgerSchema.index({ partnerAccountId: 1, createdAt: -1 });

const ExpressPartnerLedger: Model<IExpressPartnerLedger> =
  mongoose.models.ExpressPartnerLedger || mongoose.model<IExpressPartnerLedger>("ExpressPartnerLedger", ExpressPartnerLedgerSchema);

export default ExpressPartnerLedger;

import mongoose, { Document, Model, Schema } from "mongoose";

/**
 * A partner's request to be paid what Transimex owes them. Staff send the money (e-transfer or bank transfer) and mark
 * it paid with the transfer's reference. Only then does the ledger get its negative "payout" entry.
 */
export interface IExpressPartnerPayout extends Document {
  partnerAccountId: string;
  partnerUserId: string;
  amountCents: number;
  status: "requested" | "paid" | "rejected" | "cancelled";
  /** Where the money goes, as masked text for lists (the real details stay encrypted on the account). */
  destination: string;
  /** The method and a masked label are copied here so a later change of details cannot redirect a request already made. */
  destinationMethod: "etransfer" | "bank";
  /** The details as they were when requested, encrypted (see lib/express/payoutCrypto.ts). */
  destinationCipher: string;
  requestedAt: Date;
  /** Staff identifiers. */
  resolvedBy?: string;
  resolvedAt?: Date;
  /** The bank or e-transfer reference staff entered when paying. */
  reference?: string;
  rejectedReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExpressPartnerPayoutSchema = new Schema<IExpressPartnerPayout>(
  {
    partnerAccountId: { type: String, required: true, index: true },
    partnerUserId: { type: String, required: true },
    amountCents: {
      type: Number,
      required: true,
      min: 1,
      validate: { validator: Number.isSafeInteger, message: "amountCents must be a whole number of cents" },
    },
    status: { type: String, enum: ["requested", "paid", "rejected", "cancelled"], default: "requested", index: true },
    destination: { type: String, required: true, maxlength: 200 },
    destinationMethod: { type: String, enum: ["etransfer", "bank"], required: true },
    destinationCipher: { type: String, required: true },
    requestedAt: { type: Date, required: true },
    resolvedBy: { type: String },
    resolvedAt: { type: Date },
    reference: { type: String, maxlength: 120 },
    rejectedReason: { type: String, maxlength: 300 },
  },
  { timestamps: true }
);

ExpressPartnerPayoutSchema.index({ partnerAccountId: 1, createdAt: -1 });
// A partner can have only one open request at a time (enforced by the database, so two clicks cannot make two).
ExpressPartnerPayoutSchema.index({ partnerAccountId: 1 }, { unique: true, partialFilterExpression: { status: "requested" }, name: "one_open_request_per_partner" });

const ExpressPartnerPayout: Model<IExpressPartnerPayout> =
  mongoose.models.ExpressPartnerPayout || mongoose.model<IExpressPartnerPayout>("ExpressPartnerPayout", ExpressPartnerPayoutSchema);

export default ExpressPartnerPayout;

import mongoose, { Document, Model, Schema } from "mongoose";

/**
 * Money owed back to an invoice account, for example when a booking that was
 * already invoiced is cancelled. It is subtracted from the next invoice
 * (appliedInvoiceId says which). It is never paid out in cash by this app.
 */
export interface IExpressCreditNote extends Document {
  accountId: string;
  userId: string;
  /** Positive integer CAD cents. */
  amountCents: number;
  reason: string;
  shipmentId?: string;
  createdBy: string;
  /** Set when an invoice has used this credit. */
  appliedInvoiceId?: string;
  createdAt: Date;
}

const ExpressCreditNoteSchema = new Schema<IExpressCreditNote>(
  {
    accountId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    amountCents: { type: Number, required: true, min: 1 },
    reason: { type: String, required: true, maxlength: 300 },
    shipmentId: { type: String },
    createdBy: { type: String, required: true },
    appliedInvoiceId: { type: String, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ExpressCreditNoteSchema.index({ accountId: 1, appliedInvoiceId: 1 });

const ExpressCreditNote: Model<IExpressCreditNote> =
  mongoose.models.ExpressCreditNote || mongoose.model<IExpressCreditNote>("ExpressCreditNote", ExpressCreditNoteSchema);

export default ExpressCreditNote;

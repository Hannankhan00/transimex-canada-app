import mongoose, { Document, Model, Schema } from "mongoose";

/**
 * A bill from DHL to Transimex (its weekly invoice). Kept so staff can see which DHL invoices are paid and which
 * shipment charges came from which bill. Not a client invoice: see ExpressInvoice for those.
 */
export interface IExpressDhlInvoice extends Document {
  /** DHL's own invoice number, e.g. YULR003322211. Unique. */
  number: string;
  /** Total DHL billed, CAD cents, tax included. */
  totalCents: number;
  issuedOn?: Date;
  status: "unpaid" | "paid";
  paidAt?: Date;
  paidNote?: string;
  note?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExpressDhlInvoiceSchema = new Schema<IExpressDhlInvoice>(
  {
    number: { type: String, required: true, trim: true, maxlength: 60, unique: true },
    totalCents: { type: Number, required: true, min: 0 },
    issuedOn: { type: Date },
    status: { type: String, enum: ["unpaid", "paid"], default: "unpaid", index: true },
    paidAt: { type: Date },
    paidNote: { type: String, trim: true, maxlength: 300 },
    note: { type: String, trim: true, maxlength: 300 },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

const ExpressDhlInvoice: Model<IExpressDhlInvoice> =
  mongoose.models.ExpressDhlInvoice || mongoose.model<IExpressDhlInvoice>("ExpressDhlInvoice", ExpressDhlInvoiceSchema);

export default ExpressDhlInvoice;

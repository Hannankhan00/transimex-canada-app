import mongoose, { Document, Model, Schema } from "mongoose";

export type ExpressInvoiceStatus = "issued" | "paid" | "void";

export interface IExpressInvoiceLine {
  kind: "shipment" | "credit";
  /** The booking this line bills (shipment lines) or credits (credit lines). */
  shipmentId?: string;
  reference?: string;
  description: string;
  /** Integer CAD cents. Negative for a credit. */
  amountCents: number;
}

export interface IExpressInvoicePayment {
  provider?: "stripe" | "mock";
  state: "none" | "pending" | "paid" | "expired" | "mismatch";
  attempts: number;
  sessionId?: string;
  sessionUrl?: string;
  sessionExpiresAt?: Date;
  paymentIntentId?: string;
  mismatchNote?: string;
  /** Payments that arrived after the invoice was already paid or void, refunded automatically. */
  duplicatePayments: { paymentIntentId: string; refundId?: string; at: Date }[];
}

/**
 * A weekly invoice for a B2B account that books on credit. Lines are a snapshot:
 * once issued, the amounts never change. A correction is a void (which releases
 * the bookings and credits back) followed by the next invoice run, or a credit
 * line on a later invoice.
 */
export interface IExpressInvoice extends Document {
  /** Human-readable, sequential, e.g. EXI-2026-000123. */
  number: string;
  accountId: string;
  /** The account owner's CRM user. */
  userId: string;
  status: ExpressInvoiceStatus;
  lines: IExpressInvoiceLine[];
  /** Sum of the lines. Always above zero: an invoice is never issued for nothing. */
  totalCents: number;
  currency: "CAD";
  issuedAt: Date;
  /** issuedAt plus the account's payment terms in days. */
  dueAt: Date;
  paymentTermsDays: number;

  paidAt?: Date;
  paidMethod?: "card" | "manual";
  /** For a manual payment: the bank transfer reference or cheque number staff recorded. */
  paidReference?: string;
  paidBy?: string;
  payment: IExpressInvoicePayment;

  /** When an overdue reminder was last sent, so reminders are spaced out. */
  lastReminderAt?: Date;
  reminderCount: number;

  voidedAt?: Date;
  voidReason?: string;
  voidedBy?: string;

  createdAt: Date;
  updatedAt: Date;
}

const LineSchema = new Schema(
  {
    kind: { type: String, enum: ["shipment", "credit"], required: true },
    shipmentId: { type: String },
    reference: { type: String },
    description: { type: String, required: true, maxlength: 300 },
    amountCents: { type: Number, required: true },
  },
  { _id: false }
);

const PaymentSchema = new Schema(
  {
    provider: { type: String, enum: ["stripe", "mock"] },
    state: { type: String, enum: ["none", "pending", "paid", "expired", "mismatch"], default: "none" },
    attempts: { type: Number, default: 0, min: 0 },
    sessionId: { type: String },
    sessionUrl: { type: String },
    sessionExpiresAt: { type: Date },
    paymentIntentId: { type: String },
    mismatchNote: { type: String },
    duplicatePayments: {
      type: [new Schema({ paymentIntentId: String, refundId: String, at: Date }, { _id: false })],
      default: [],
    },
  },
  { _id: false }
);

const ExpressInvoiceSchema = new Schema<IExpressInvoice>(
  {
    number: { type: String, required: true, unique: true },
    accountId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    status: { type: String, enum: ["issued", "paid", "void"], required: true, default: "issued" },
    lines: { type: [LineSchema], required: true },
    totalCents: { type: Number, required: true, min: 1 },
    currency: { type: String, enum: ["CAD"], default: "CAD" },
    issuedAt: { type: Date, required: true },
    dueAt: { type: Date, required: true },
    paymentTermsDays: { type: Number, required: true, min: 1 },

    paidAt: { type: Date },
    paidMethod: { type: String, enum: ["card", "manual"] },
    paidReference: { type: String, maxlength: 200 },
    paidBy: { type: String },
    payment: { type: PaymentSchema, default: () => ({}) },

    lastReminderAt: { type: Date },
    reminderCount: { type: Number, default: 0, min: 0 },

    voidedAt: { type: Date },
    voidReason: { type: String, maxlength: 500 },
    voidedBy: { type: String },
  },
  { timestamps: true }
);

ExpressInvoiceSchema.index({ accountId: 1, status: 1, dueAt: 1 });
ExpressInvoiceSchema.index({ status: 1, dueAt: 1 });
ExpressInvoiceSchema.index({ "payment.sessionId": 1 });

const ExpressInvoice: Model<IExpressInvoice> = mongoose.models.ExpressInvoice || mongoose.model<IExpressInvoice>("ExpressInvoice", ExpressInvoiceSchema);

export default ExpressInvoice;

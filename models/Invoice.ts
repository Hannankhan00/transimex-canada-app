import mongoose, { Document, Model, Schema } from "mongoose";
import { BankAccountCurrency } from "./BankAccount";

export type InvoiceStatus = "unpaid" | "pending_verification" | "paid";

export interface IInvoiceLineItem {
  description: string;
  amount: number;
}

export interface IInvoiceBankSnapshot {
  bankName: string;
  beneficiaryName: string;
  accountNumber: string;
  transitNumber?: string;
  institutionNumber?: string;
  swiftBic?: string;
  bankAddress?: string;
  currency: BankAccountCurrency;
}

export interface IInvoicePaymentProof {
  fileKey?: string;
  fileUrl?: string;
  storageProvider?: "r2" | "mongodb";
  fileData?: Buffer;
  mimeType?: string;
  fileSize?: number;
  uploadedAt?: string;
}

export type InvoiceKind = "freight" | "duties";

export interface IInvoice extends Document {
  invoiceNumber: string; // e.g. "INV-2026-00124"
  kind: InvoiceKind;
  quoteRefNumber: string;
  shipmentTrackingNumber: string;
  client: {
    name: string;
    companyName: string;
    email: string;
    phone?: string;
    userId?: string;
  };
  route: {
    origin: string;
    destination: string;
  };
  currency: BankAccountCurrency;
  lineItems: IInvoiceLineItem[];
  subtotal: number;
  total: number;
  amountDisplay: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  bankSnapshot?: IInvoiceBankSnapshot;
  paymentProof?: IInvoicePaymentProof;
  paymentRejectionReason?: string;
  rejectedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: { type: String, required: true, unique: true, trim: true, index: true },
    kind: { type: String, enum: ["freight", "duties"], default: "freight", index: true },
    quoteRefNumber: { type: String, required: true, index: true },
    shipmentTrackingNumber: { type: String, required: true, index: true },
    client: {
      name: { type: String, required: true },
      companyName: { type: String, default: "" },
      email: { type: String, required: true, lowercase: true, trim: true },
      phone: { type: String, default: "" },
      userId: { type: String, default: "", index: true },
    },
    route: {
      origin: { type: String, default: "" },
      destination: { type: String, default: "" },
    },
    currency: { type: String, enum: ["CAD", "USD"], required: true },
    lineItems: [
      {
        description: { type: String, required: true },
        amount: { type: Number, required: true },
      },
    ],
    subtotal: { type: Number, required: true, default: 0 },
    total: { type: Number, required: true, default: 0 },
    amountDisplay: { type: String, default: "" },
    status: {
      type: String,
      enum: ["unpaid", "pending_verification", "paid"],
      default: "unpaid",
      index: true,
    },
    issueDate: { type: String, required: true },
    dueDate: { type: String, required: true },
    bankSnapshot: {
      bankName: { type: String, default: "" },
      beneficiaryName: { type: String, default: "" },
      accountNumber: { type: String, default: "" },
      transitNumber: { type: String, default: "" },
      institutionNumber: { type: String, default: "" },
      swiftBic: { type: String, default: "" },
      bankAddress: { type: String, default: "" },
      currency: { type: String, enum: ["CAD", "USD"], default: "CAD" },
    },
    paymentProof: {
      fileKey: { type: String, default: "" },
      fileUrl: { type: String, default: "" },
      storageProvider: { type: String, enum: ["r2", "mongodb"], default: "mongodb" },
      fileData: { type: Buffer },
      mimeType: { type: String, default: "" },
      fileSize: { type: Number, default: 0 },
      uploadedAt: { type: String, default: "" },
    },
    paymentRejectionReason: { type: String, default: "" },
    rejectedAt: { type: String, default: "" },
    verifiedAt: { type: String, default: "" },
    verifiedBy: { type: String, default: "" },
  },
  { timestamps: true }
);

const Invoice: Model<IInvoice> =
  mongoose.models.Invoice || mongoose.model<IInvoice>("Invoice", InvoiceSchema);

export default Invoice;

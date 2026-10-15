import mongoose, { Document, Model, Schema } from "mongoose";

export type ExpressAccountType = "b2c" | "b2b";
export type ExpressAccountStatus = "pending" | "active" | "rejected" | "suspended";
export type ExpressBillingMode = "pay_at_booking" | "invoice";
export type ExpressLanguage = "en" | "fr";

export interface IExpressAccount extends Document {
  /** The CRM user this Express account belongs to. One account per user. */
  userId: string;
  type: ExpressAccountType;
  status: ExpressAccountStatus;
  /** Language the client applied in; used for emails. */
  language: ExpressLanguage;

  contactName: string;
  phone: string;
  /** ISO 3166-1 alpha-2. */
  country: string;

  /** B2B only. */
  company?: {
    name: string;
    address: string;
    contactPerson: string;
    businessType: string;
    expectedMonthlyVolume: string;
  };

  /** B2B only. Percent off base freight, 0-100. B2C uses the global setting. */
  discountPct: number | null;
  /** B2B only. Pay at booking, invoice, or both. Set by staff. */
  billingModes: ExpressBillingMode[];
  /** B2B invoice only. Integer cents, CAD. */
  creditLimitCents: number | null;
  /** B2B invoice only. Days after an invoice is issued by which it must be paid. */
  paymentTermsDays: number | null;

  terms: { version: string; acceptedAt: Date };

  rejectionReason?: string;
  suspensionReason?: string;
  reviewedBy?: string;
  reviewedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const ExpressAccountSchema = new Schema<IExpressAccount>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    type: { type: String, enum: ["b2c", "b2b"], required: true },
    status: { type: String, enum: ["pending", "active", "rejected", "suspended"], required: true },
    language: { type: String, enum: ["en", "fr"], default: "en" },

    contactName: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 40 },
    country: { type: String, required: true, uppercase: true, minlength: 2, maxlength: 2 },

    company: {
      type: new Schema(
        {
          name: { type: String, required: true, trim: true, maxlength: 160 },
          address: { type: String, required: true, trim: true, maxlength: 300 },
          contactPerson: { type: String, required: true, trim: true, maxlength: 120 },
          businessType: { type: String, required: true, trim: true, maxlength: 120 },
          expectedMonthlyVolume: { type: String, required: true, trim: true, maxlength: 60 },
        },
        { _id: false }
      ),
      default: undefined,
    },

    // A typo must never create a free or negative-priced shipment.
    discountPct: { type: Number, default: null, min: 0, max: 100 },
    billingModes: {
      type: [{ type: String, enum: ["pay_at_booking", "invoice"] }],
      default: [],
    },
    creditLimitCents: { type: Number, default: null, min: 0 },
    paymentTermsDays: { type: Number, default: null, min: 1, max: 365 },

    terms: {
      version: { type: String, required: true },
      acceptedAt: { type: Date, required: true },
    },

    rejectionReason: { type: String, maxlength: 1000 },
    suspensionReason: { type: String, maxlength: 1000 },
    reviewedBy: { type: String },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

ExpressAccountSchema.index({ status: 1, type: 1, createdAt: -1 });

const ExpressAccount: Model<IExpressAccount> =
  mongoose.models.ExpressAccount || mongoose.model<IExpressAccount>("ExpressAccount", ExpressAccountSchema);

export default ExpressAccount;

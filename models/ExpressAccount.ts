import mongoose, { Document, Model, Schema } from "mongoose";
import {
  CATEGORY_VALUES,
  CLIENT_COUNT_VALUES,
  PAYMENT_VALUES,
  RESTRICTED_VALUES,
  SHIPS_FOR_VALUES,
  VALUE_VALUES,
  WEIGHT_VALUES,
  type ShippingProfile,
} from "@/lib/express/shippingProfile";

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

  /** B2B only. What they ship and for whom, so staff can decide. Absent on accounts made before it existed. */
  shippingProfile?: ShippingProfile;

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

    shippingProfile: {
      type: new Schema(
        {
          categories: { type: [{ type: String, enum: CATEGORY_VALUES }], default: [] },
          goodsDescription: { type: String, required: true, trim: true, maxlength: 500 },
          shipsFor: { type: String, enum: SHIPS_FOR_VALUES, required: true },
          clientCount: { type: String, enum: CLIENT_COUNT_VALUES },
          clientsDescription: { type: String, trim: true, maxlength: 300 },
          destinations: { type: String, required: true, trim: true, maxlength: 200 },
          typicalWeight: { type: String, enum: WEIGHT_VALUES, required: true },
          typicalValue: { type: String, enum: VALUE_VALUES, required: true },
          restrictedGoods: { type: [{ type: String, enum: RESTRICTED_VALUES }], default: [] },
          currentCarriers: { type: String, trim: true, maxlength: 200 },
          paymentPreference: { type: String, enum: PAYMENT_VALUES, required: true },
          businessNumber: { type: String, trim: true, maxlength: 60 },
          website: { type: String, trim: true, maxlength: 200 },
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

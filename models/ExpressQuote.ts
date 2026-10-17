import mongoose, { Document, Model, Schema } from "mongoose";
import type { PriceBreakdown } from "@/lib/express/pricing";

export interface IExpressQuoteRequest {
  origin: { countryCode: string; postalCode: string; city: string };
  destination: { countryCode: string; postalCode: string; city: string };
  parcels: { weightKg: number; lengthCm: number; widthCm: number; heightCm: number }[];
  /** Absent on quotes from before documents existed: those are goods. */
  contentType?: "documents" | "goods";
  declaredValueCents: number;
  isCustomsDeclarable: boolean;
  pickupRequested: boolean;
  /** YYYY-MM-DD. */
  plannedShipDate: string;
}

/**
 * A priced quote. It is a snapshot: once saved it never changes, so a later
 * change to a discount, the DHL contract discount or the pickup fee affects
 * new quotes only. The only legitimate price change after saving is a DHL
 * weight correction, which is billed separately (Phase 8), not edited here.
 */
export interface IExpressQuote extends Document {
  userId: string;
  accountId: string;
  accountType: "b2c" | "b2b" | "customer";
  /** Set when a partner priced this for one of their customers. */
  partnerCustomerId?: string;
  partnerCustomerName?: string;
  /** The markup percent applied on top of the partner's price. */
  partnerMarkupPct?: number;
  carrier: "dhl";
  serviceCode: string;
  serviceName: string;
  estimatedDelivery: Date | null;
  request: IExpressQuoteRequest;
  /** Full breakdown including STAFF-ONLY fields (account rate, profit, contract discount). */
  pricing: PriceBreakdown;
  expiresAt: Date;
  createdAt: Date;
}

const ExpressQuoteSchema = new Schema<IExpressQuote>(
  {
    userId: { type: String, required: true, index: true },
    accountId: { type: String, required: true, index: true },
    accountType: { type: String, enum: ["b2c", "b2b", "customer"], required: true },
    partnerCustomerId: { type: String, index: true },
    partnerCustomerName: { type: String },
    partnerMarkupPct: { type: Number },
    carrier: { type: String, enum: ["dhl"], required: true },
    serviceCode: { type: String, required: true },
    serviceName: { type: String, required: true },
    estimatedDelivery: { type: Date, default: null },
    request: { type: Schema.Types.Mixed, required: true },
    pricing: { type: Schema.Types.Mixed, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Immutable: refuse every update path once the quote exists.
const refuse = function () {
  throw new Error("ExpressQuote is immutable and cannot be modified after it is saved.");
};
ExpressQuoteSchema.pre("save", function () {
  if (!this.isNew) refuse();
});
for (const op of ["updateOne", "updateMany", "findOneAndUpdate", "replaceOne", "findOneAndReplace"] as const) {
  ExpressQuoteSchema.pre(op, refuse);
}

const ExpressQuote: Model<IExpressQuote> =
  mongoose.models.ExpressQuote || mongoose.model<IExpressQuote>("ExpressQuote", ExpressQuoteSchema);

export default ExpressQuote;

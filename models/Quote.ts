import mongoose, { Document, Model, Schema } from "mongoose";

export type QuoteStatus = "under_review" | "reviewing" | "accepted" | "rejected" | "expired";

export interface IQuoteBreakdown {
  lineHaul: string;
  fuelSurcharge: string;
  crossBorderFee?: string;
  accessorials?: string;
  total: string;
}

export interface IQuote extends Document {
  refNumber: string; // e.g. "QT-2026-00124"
  client: {
    name: string;
    companyName: string;
    email: string;
    phone?: string;
    userId?: string;
  };
  route: {
    origin: string;
    originDetail: string;
    destination: string;
    destinationDetail: string;
  };
  cargo: {
    transportMode: string;
    equipment: string;
    cargoType?: "General Freight" | "Hazardous Materials" | "Perishable / Cold-Chain" | "Heavy Haul Oversize";
    weight: string;
    palletCount?: number;
    dimensions?: string;
    commodity: string;
    preferredPickupDate?: string;
    specialInstructions?: string;
  };
  status: QuoteStatus;
  priceCad?: string;
  priceUsd?: string;
  breakdown?: IQuoteBreakdown;
  shipmentId?: string; // Linked tracking ID once converted, e.g. "TMX-2026-00847"
  rejectionReason?: string;
  adminNotes?: string;
  submittedDate: string;
  validUntil?: string;
  createdAt: Date;
  updatedAt: Date;
}

const QuoteSchema = new Schema<IQuote>(
  {
    refNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    client: {
      name: { type: String, required: true },
      companyName: { type: String, required: true },
      email: { type: String, required: true, lowercase: true, trim: true },
      phone: { type: String, default: "" },
      userId: { type: String, default: "" },
    },
    route: {
      origin: { type: String, required: true },
      originDetail: { type: String, required: true },
      destination: { type: String, required: true },
      destinationDetail: { type: String, required: true },
    },
    cargo: {
      transportMode: { type: String, required: true },
      equipment: { type: String, required: true },
      cargoType: { type: String, default: "General Freight" },
      weight: { type: String, required: true },
      palletCount: { type: Number, default: 0 },
      dimensions: { type: String, default: "Standard 53ft Trailer" },
      commodity: { type: String, required: true },
      preferredPickupDate: { type: String, default: "" },
      specialInstructions: { type: String, default: "" },
    },
    status: {
      type: String,
      enum: ["under_review", "reviewing", "accepted", "rejected", "expired"],
      default: "under_review",
      index: true,
    },
    priceCad: { type: String, default: "" },
    priceUsd: { type: String, default: "" },
    breakdown: {
      lineHaul: { type: String, default: "" },
      fuelSurcharge: { type: String, default: "" },
      crossBorderFee: { type: String, default: "" },
      accessorials: { type: String, default: "" },
      total: { type: String, default: "" },
    },
    shipmentId: { type: String, default: "", index: true },
    rejectionReason: { type: String, default: "" },
    adminNotes: { type: String, default: "" },
    submittedDate: { type: String, required: true },
    validUntil: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

const Quote: Model<IQuote> =
  mongoose.models.Quote || mongoose.model<IQuote>("Quote", QuoteSchema);

export default Quote;

import mongoose, { Document, Model, Schema } from "mongoose";
import type { Address, CustomsItem, DutiesPayer, Parcel } from "@/lib/shipping/core/types";

/** Booking status. Separate from the existing freight Shipment model. */
export type ExpressShipmentStatus = "awaiting_payment" | "paid" | "label_ready" | "cancelled";

export interface IExpressShipmentStatusEntry {
  status: ExpressShipmentStatus;
  at: Date;
  /** User id of whoever caused the change, or "system". */
  by: string;
  note?: string;
}

export interface IExpressShipment extends Document {
  /** Human-readable reference shown to clients and staff, e.g. EX-261015-K7QZ4. */
  reference: string;
  userId: string;
  accountId: string;
  accountType: "b2c" | "b2b";
  /** The saved, immutable quote this booking was priced from. One shipment per quote. */
  quoteId: string;
  /** Client-generated key so a double click cannot create two bookings. */
  idempotencyKey: string;

  status: ExpressShipmentStatus;
  statusHistory: IExpressShipmentStatusEntry[];

  shipper: Address;
  recipient: Address;
  parcels: Parcel[];
  items: CustomsItem[];
  declaredValueCents: number;
  contentDescription: string;
  /** YYYY-MM-DD. */
  plannedShipDate: string;

  pickupRequested: boolean;
  dutiesPayer: DutiesPayer;

  /** Client price from the quote, CAD cents. The quote holds the full breakdown. */
  totalCents: number;
  currency: "CAD";

  termsAccepted: { version: string; acceptedAt: Date };

  /** Set when DHL books the shipment (Phase 4). */
  trackingNumber?: string;

  createdAt: Date;
  updatedAt: Date;
}

const AddressSchema = new Schema(
  {
    name: { type: String, trim: true, maxlength: 120 },
    company: { type: String, trim: true, maxlength: 120 },
    line1: { type: String, required: true, trim: true, maxlength: 120 },
    line2: { type: String, trim: true, maxlength: 120 },
    city: { type: String, required: true, trim: true, maxlength: 80 },
    region: { type: String, trim: true, maxlength: 80 },
    postalCode: { type: String, required: true, trim: true, maxlength: 20 },
    countryCode: { type: String, required: true, uppercase: true, minlength: 2, maxlength: 2 },
    phone: { type: String, trim: true, maxlength: 30 },
    email: { type: String, trim: true, lowercase: true, maxlength: 160 },
  },
  { _id: false }
);

const ParcelSchema = new Schema(
  {
    weightKg: { type: Number, required: true, min: 0.1, max: 70 },
    lengthCm: { type: Number, required: true, min: 1, max: 120 },
    widthCm: { type: Number, required: true, min: 1, max: 120 },
    heightCm: { type: Number, required: true, min: 1, max: 120 },
  },
  { _id: false }
);

const ItemSchema = new Schema(
  {
    description: { type: String, required: true, trim: true, maxlength: 100 },
    hsCode: { type: String, required: true, match: /^\d{6,10}$/ },
    quantity: { type: Number, required: true, min: 1, max: 9999 },
    unitValueCents: { type: Number, required: true, min: 1 },
    countryOfOrigin: { type: String, required: true, uppercase: true, minlength: 2, maxlength: 2 },
    netWeightKg: { type: Number, required: true, min: 0.01, max: 70 },
    exportReason: { type: String, enum: ["sale", "gift", "sample", "return", "repair", "personal_effects"], required: true },
  },
  { _id: false }
);

const StatusEntrySchema = new Schema(
  {
    status: { type: String, required: true },
    at: { type: Date, required: true },
    by: { type: String, required: true },
    note: { type: String },
  },
  { _id: false }
);

const ExpressShipmentSchema = new Schema<IExpressShipment>(
  {
    reference: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    accountId: { type: String, required: true, index: true },
    accountType: { type: String, enum: ["b2c", "b2b"], required: true },
    // One booking per quote: a second booking from the same quote is impossible.
    quoteId: { type: String, required: true, unique: true },
    idempotencyKey: { type: String, required: true },

    status: { type: String, enum: ["awaiting_payment", "paid", "label_ready", "cancelled"], required: true, index: true },
    statusHistory: { type: [StatusEntrySchema], default: [] },

    shipper: { type: AddressSchema, required: true },
    recipient: { type: AddressSchema, required: true },
    parcels: { type: [ParcelSchema], required: true },
    items: { type: [ItemSchema], required: true },
    declaredValueCents: { type: Number, required: true, min: 0 },
    contentDescription: { type: String, required: true, maxlength: 200 },
    plannedShipDate: { type: String, required: true },

    pickupRequested: { type: Boolean, required: true },
    dutiesPayer: { type: String, enum: ["recipient", "sender"], required: true },

    totalCents: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ["CAD"], default: "CAD" },

    termsAccepted: {
      version: { type: String, required: true },
      acceptedAt: { type: Date, required: true },
    },

    trackingNumber: { type: String },
  },
  { timestamps: true }
);

// The same client repeating a confirm gets the same booking back.
ExpressShipmentSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true });
ExpressShipmentSchema.index({ userId: 1, createdAt: -1 });
ExpressShipmentSchema.index({ status: 1, createdAt: -1 });

const ExpressShipment: Model<IExpressShipment> =
  mongoose.models.ExpressShipment || mongoose.model<IExpressShipment>("ExpressShipment", ExpressShipmentSchema);

export default ExpressShipment;

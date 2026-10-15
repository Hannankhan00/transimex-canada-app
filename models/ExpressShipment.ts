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

export type ExpressPaymentState = "none" | "pending" | "paid" | "expired" | "mismatch";
export type ExpressRefundState = "none" | "failed" | "done";
export type ExpressFulfilmentState = "none" | "pending" | "ok" | "failed" | "unknown";

export interface IExpressRefund {
  refundId: string;
  amountCents: number;
  at: Date;
  reason: string;
  /** User id of whoever issued it, or "system" for an automatic refund. */
  by: string;
}

export interface IExpressShipmentPayment {
  provider?: "stripe" | "mock";
  state: ExpressPaymentState;
  /** How many checkout sessions have been started; keys the provider idempotency. */
  attempts: number;
  sessionId?: string;
  sessionUrl?: string;
  sessionExpiresAt?: Date;
  paymentIntentId?: string;
  amountCents?: number;
  paidAt?: Date;
  refundedCents: number;
  refunds: IExpressRefund[];
  refundState: ExpressRefundState;
  refundError?: string;
  /** Payments that arrived after the booking was already paid or cancelled, refunded automatically. */
  duplicatePayments: { paymentIntentId: string; refundId?: string; at: Date }[];
  mismatchNote?: string;
}

export interface IExpressShipmentFulfilment {
  state: ExpressFulfilmentState;
  attempts: number;
  lastError?: string;
  lastAttemptAt?: Date;
}

export interface IExpressShipmentLabel {
  /** Object key in R2. */
  key: string;
  source: "carrier" | "manual";
  uploadedAt: Date;
  bytes: number;
}

export type ExpressTrackingStatus = "unknown" | "pre_transit" | "in_transit" | "out_for_delivery" | "delivered" | "exception" | "returned";

export interface IExpressTrackingEvent {
  at: Date;
  status: ExpressTrackingStatus;
  description: string;
  location?: string;
}

/** Where the parcel is with DHL. Separate from the booking status, which stops at label_ready. */
export interface IExpressShipmentTracking {
  status: ExpressTrackingStatus;
  /** Newest first. */
  events: IExpressTrackingEvent[];
  lastCheckedAt?: Date;
  lastChangedAt?: Date;
  deliveredAt?: Date;
  /** Consecutive failed checks. Reset by a good one. */
  failures: number;
  lastError?: string;
  /** Notification kinds already sent, so a repeated check never tells the client twice. */
  notified: string[];
}

export interface IExpressShipment extends Document {
  /** Human-readable reference shown to clients and staff, e.g. EX-261015-K7QZ4. */
  reference: string;
  userId: string;
  accountId: string;
  accountType: "b2c" | "b2b" | "customer";
  /** Set when a partner booked this for one of their customers. */
  partnerCustomerId?: string;
  partnerCustomerName?: string;
  /** What the partner adds on top of totalCents, and the price their customer is shown (totalCents + markupCents). */
  markupCents?: number;
  customerTotalCents?: number;
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

  payment: IExpressShipmentPayment;
  fulfilment: IExpressShipmentFulfilment;
  label?: IExpressShipmentLabel;

  /** Set when DHL books the shipment (or staff enter it by hand). */
  trackingNumber?: string;
  trackingUrl?: string;
  pickupConfirmation?: string;
  tracking?: IExpressShipmentTracking;

  cancellation?: { reason: string; by: string; at: Date; refundCents: number };

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

const RefundSchema = new Schema(
  {
    refundId: { type: String, required: true },
    amountCents: { type: Number, required: true, min: 0 },
    at: { type: Date, required: true },
    reason: { type: String, required: true },
    by: { type: String, required: true },
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
    amountCents: { type: Number, min: 0 },
    paidAt: { type: Date },
    refundedCents: { type: Number, default: 0, min: 0 },
    refunds: { type: [RefundSchema], default: [] },
    refundState: { type: String, enum: ["none", "failed", "done"], default: "none" },
    refundError: { type: String },
    duplicatePayments: {
      type: [new Schema({ paymentIntentId: String, refundId: String, at: Date }, { _id: false })],
      default: [],
    },
    mismatchNote: { type: String },
  },
  { _id: false }
);

const FulfilmentSchema = new Schema(
  {
    state: { type: String, enum: ["none", "pending", "ok", "failed", "unknown"], default: "none" },
    attempts: { type: Number, default: 0, min: 0 },
    lastError: { type: String },
    lastAttemptAt: { type: Date },
  },
  { _id: false }
);

const LabelSchema = new Schema(
  {
    key: { type: String, required: true },
    source: { type: String, enum: ["carrier", "manual"], required: true },
    uploadedAt: { type: Date, required: true },
    bytes: { type: Number, required: true },
  },
  { _id: false }
);

const TrackingSchema = new Schema(
  {
    status: { type: String, enum: ["unknown", "pre_transit", "in_transit", "out_for_delivery", "delivered", "exception", "returned"], default: "unknown" },
    events: {
      type: [
        new Schema(
          {
            at: { type: Date, required: true },
            status: { type: String, required: true },
            description: { type: String, required: true, maxlength: 300 },
            location: { type: String, maxlength: 120 },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    lastCheckedAt: { type: Date },
    lastChangedAt: { type: Date },
    deliveredAt: { type: Date },
    failures: { type: Number, default: 0, min: 0 },
    lastError: { type: String },
    notified: { type: [String], default: [] },
  },
  { _id: false }
);

const ExpressShipmentSchema = new Schema<IExpressShipment>(
  {
    reference: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    accountId: { type: String, required: true, index: true },
    accountType: { type: String, enum: ["b2c", "b2b", "customer"], required: true },
    partnerCustomerId: { type: String, index: true },
    partnerCustomerName: { type: String },
    markupCents: { type: Number, min: 0 },
    customerTotalCents: { type: Number, min: 0 },
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

    payment: { type: PaymentSchema, default: () => ({}) },
    fulfilment: { type: FulfilmentSchema, default: () => ({}) },
    label: { type: LabelSchema },

    trackingNumber: { type: String },
    trackingUrl: { type: String },
    pickupConfirmation: { type: String },
    tracking: { type: TrackingSchema },

    cancellation: {
      type: new Schema(
        {
          reason: { type: String, required: true },
          by: { type: String, required: true },
          at: { type: Date, required: true },
          refundCents: { type: Number, default: 0 },
        },
        { _id: false }
      ),
    },
  },
  { timestamps: true }
);

// The same client repeating a confirm gets the same booking back.
ExpressShipmentSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true });
ExpressShipmentSchema.index({ userId: 1, createdAt: -1 });
ExpressShipmentSchema.index({ status: 1, createdAt: -1 });
ExpressShipmentSchema.index({ "payment.sessionId": 1 });
// The tracking job scans label_ready parcels that are not yet delivered.
ExpressShipmentSchema.index({ status: 1, "tracking.status": 1, "tracking.lastCheckedAt": 1 });

const ExpressShipment: Model<IExpressShipment> =
  mongoose.models.ExpressShipment || mongoose.model<IExpressShipment>("ExpressShipment", ExpressShipmentSchema);

export default ExpressShipment;

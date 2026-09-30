import mongoose, { Document, Model, Schema } from "mongoose";

export type ShipmentStatus =
  | "Pending Dispatch"
  | "In Transit"
  | "Customs Hold"
  | "Out for Delivery"
  | "Delivered"
  | "Cancelled";

export interface IShipmentTimelineEvent {
  title: string;
  location: string;
  timestamp: string;
  statusText: string;
  completed: boolean;
}

export interface IShipmentContainer {
  containerNumber: string;
  /** Explicit carrier, captured here at booking/entry time — preferred over the owner-prefix guess. */
  carrier?: "MAERSK" | "CMA_CGM" | "MSC";
}

/**
 * A carrier booking or B/L reference tracked against this shipment, plus what
 * the carrier's API last reported for it — including the vessel.
 */
export interface IShipmentCarrierBooking {
  carrier: "MAERSK" | "CMA_CGM" | "MSC";
  reference: string;
  vesselName?: string;
  imoNumber?: string;
  voyageNumber?: string;
  originPort?: { unLocationCode?: string; portName?: string; facility?: string };
  destinationPort?: { unLocationCode?: string; portName?: string; facility?: string };
  portRotation: {
    sequence: number;
    role: "ORIGIN" | "TRANSSHIPMENT" | "DESTINATION";
    unLocationCode?: string;
    portName?: string;
    facility?: string;
    vesselName?: string;
    imoNumber?: string;
    voyageNumber?: string;
  }[];
  events: {
    eventType: string;
    eventClassifierCode: string;
    eventDateTime: string;
    estimatedDateTime?: string;
    actualDateTime?: string;
    location?: { unLocationCode?: string; portName?: string; facility?: string };
    vesselName?: string;
    voyageNumber?: string;
    description?: string;
  }[];
  status: "PENDING" | "IN_TRANSIT" | "DELIVERED";
  containerNumbers: string[];
  lastSyncedAt: string | null;
  lastError?: string;
}

export interface IShipment extends Document {
  trackingNumber: string; // e.g. "TMX-2026-00847"
  quoteId?: string; // Linked quote reference, e.g. "QT-2026-00124"
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
    weight: string;
    palletCount?: number;
    commodity: string;
    dimensions?: string;
    cargoType?: string;
  };
  status: ShipmentStatus;
  rateCad: string;
  carrierId?: string; // Reference to Carrier._id, set via one-click assignment
  unitId?: string; // Reference to the specific Carrier.units[]._id assigned
  assignedCarrier?: string;
  driverName?: string;
  unitNumber?: string;
  vehicleType?: string;
  plateNumber?: string;
  eta?: string;
  cbsaPars?: string;
  customsStatus?: "Pending" | "In Review" | "Released" | "Held";
  customsBroker?: string;
  portOfEntry?: string;
  cbsaNotes?: string;
  duties?: {
    amountCad?: string;
    taxGstHst?: string;
    brokerageFeeCad?: string;
    totalOwed?: string;
    status?: "Unassessed" | "Notice Dispatched" | "Settled";
    dispatchedAt?: string;
  };
  timeline: IShipmentTimelineEvent[];
  /** Ocean containers entered against this shipment — each is synced from its carrier's Track & Trace API into a linked TrackedContainer record. */
  containers: IShipmentContainer[];
  carrierBooking?: IShipmentCarrierBooking;
  createdAt: Date;
  updatedAt: Date;
}

const ShipmentSchema = new Schema<IShipment>(
  {
    trackingNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    quoteId: {
      type: String,
      default: "",
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
      weight: { type: String, required: true },
      palletCount: { type: Number, default: 0 },
      commodity: { type: String, required: true },
      dimensions: { type: String, default: "" },
      cargoType: { type: String, default: "General Freight" },
    },
    status: {
      type: String,
      enum: [
        "Pending Dispatch",
        "In Transit",
        "Customs Hold",
        "Out for Delivery",
        "Delivered",
        "Cancelled",
      ],
      default: "Pending Dispatch",
      index: true,
    },
    rateCad: { type: String, required: true },
    carrierId: { type: String, default: "" },
    unitId: { type: String, default: "" },
    assignedCarrier: { type: String, default: "Transimex Dedicated Express Fleet" },
    driverName: { type: String, default: "Assigned Dispatch" },
    unitNumber: { type: String, default: "TMX-400" },
    vehicleType: { type: String, default: "" },
    plateNumber: { type: String, default: "" },
    eta: { type: String, default: "3-5 Business Days" },
    cbsaPars: { type: String, default: "" },
    customsStatus: {
      type: String,
      enum: ["Pending", "In Review", "Released", "Held"],
      default: "Pending",
      index: true,
    },
    customsBroker: { type: String, default: "Transimex In-House Brokerage" },
    portOfEntry: { type: String, default: "Ambassador Bridge (Windsor / Detroit)" },
    cbsaNotes: { type: String, default: "" },
    duties: {
      amountCad: { type: String, default: "" },
      taxGstHst: { type: String, default: "" },
      brokerageFeeCad: { type: String, default: "" },
      totalOwed: { type: String, default: "" },
      status: {
        type: String,
        enum: ["Unassessed", "Notice Dispatched", "Settled"],
        default: "Unassessed",
      },
      dispatchedAt: { type: String, default: "" },
    },
    timeline: [
      {
        title: { type: String, required: true },
        location: { type: String, required: true },
        timestamp: { type: String, required: true },
        statusText: { type: String, required: true },
        completed: { type: Boolean, default: false },
      },
    ],
    containers: [
      {
        containerNumber: { type: String, required: true, trim: true, uppercase: true },
        carrier: { type: String, enum: ["MAERSK", "CMA_CGM", "MSC"] },
      },
    ],
    carrierBooking: {
      type: new Schema(
        {
          carrier: { type: String, enum: ["MAERSK", "CMA_CGM", "MSC"], required: true },
          reference: { type: String, required: true, trim: true, uppercase: true },
          vesselName: { type: String, default: "" },
          imoNumber: { type: String, default: "" },
          voyageNumber: { type: String, default: "" },
          originPort: { unLocationCode: String, portName: String, facility: String },
          destinationPort: { unLocationCode: String, portName: String, facility: String },
          portRotation: [
            {
              _id: false,
              sequence: Number,
              role: { type: String, enum: ["ORIGIN", "TRANSSHIPMENT", "DESTINATION"] },
              unLocationCode: String,
              portName: String,
              facility: String,
              vesselName: String,
              imoNumber: String,
              voyageNumber: String,
            },
          ],
          events: [
            {
              _id: false,
              eventType: String,
              eventClassifierCode: String,
              eventDateTime: String,
              estimatedDateTime: String,
              actualDateTime: String,
              location: { unLocationCode: String, portName: String, facility: String },
              vesselName: String,
              voyageNumber: String,
              description: String,
            },
          ],
          status: { type: String, enum: ["PENDING", "IN_TRANSIT", "DELIVERED"], default: "PENDING" },
          containerNumbers: [{ type: String }],
          lastSyncedAt: { type: String, default: null },
          lastError: { type: String, default: "" },
        },
        { _id: false }
      ),
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

const Shipment: Model<IShipment> =
  mongoose.models.Shipment || mongoose.model<IShipment>("Shipment", ShipmentSchema);

export default Shipment;

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
  assignedCarrier?: string;
  driverName?: string;
  unitNumber?: string;
  eta?: string;
  cbsaPars?: string;
  customsStatus?: "Pending" | "In Review" | "Released" | "Held";
  customsBroker?: string;
  portOfEntry?: string;
  cbsaNotes?: string;
  duties?: {
    amountCad?: string;
    taxGstHst?: string;
    totalOwed?: string;
    status?: "Unassessed" | "Notice Dispatched" | "Settled";
    dispatchedAt?: string;
  };
  timeline: IShipmentTimelineEvent[];
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
    assignedCarrier: { type: String, default: "Transimex Dedicated Express Fleet" },
    driverName: { type: String, default: "Assigned Dispatch" },
    unitNumber: { type: String, default: "TMX-400" },
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
  },
  {
    timestamps: true,
  }
);

const Shipment: Model<IShipment> =
  mongoose.models.Shipment || mongoose.model<IShipment>("Shipment", ShipmentSchema);

export default Shipment;

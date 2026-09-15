import mongoose, { Document, Model, Schema } from "mongoose";
import { CARRIER_CODES } from "@/lib/tracking/schema";

const EVENT_TYPES = [
  "BOOKING",
  "GATE_IN",
  "LOADED",
  "VESSEL_DEPARTURE",
  "TRANSSHIPMENT",
  "DISCHARGE",
  "GATE_OUT",
  "DELIVERED",
];
const PORT_ROLES = ["ORIGIN", "TRANSSHIPMENT", "DESTINATION"];
const CLASSIFIERS = ["PLN", "EST", "ACT"];

export interface ITrackingLocation {
  unLocationCode: string;
  portName: string;
  facility?: string;
}

export interface ITrackingEvent {
  eventType: string;
  eventClassifierCode: string;
  eventDateTime: string;
  estimatedDateTime?: string;
  actualDateTime?: string;
  location: ITrackingLocation;
  vesselName?: string;
  voyageNumber?: string;
  description?: string;
}

export interface IPortCall {
  sequence: number;
  role: string;
  unLocationCode: string;
  portName: string;
  facility?: string;
  vesselName?: string;
  voyageNumber?: string;
}

export interface IRawCarrierResponse {
  carrier: string;
  fetchedAt: string;
  payload: mongoose.Schema.Types.Mixed;
}

/**
 * The DB-persisted cache of a container's normalized tracking record — this
 * IS the "cache" the UI reads from (requirement 6): API routes read this
 * document only, and only the scheduled job / webhook receiver ever writes
 * to it via the adapter pipeline.
 */
export interface ITrackedContainer extends Document {
  containerNumber: string;
  containerSizeType?: string;
  containerSizeLabel?: string;
  blNumber?: string;
  bookingNumber?: string;
  carrier: string;
  carrierDetectionSource: "explicit" | "prefix";
  vesselName?: string;
  imoNumber?: string;
  voyageNumber?: string;
  originPort?: ITrackingLocation;
  destinationPort?: ITrackingLocation;
  portRotation: IPortCall[];
  events: ITrackingEvent[];
  status: "PENDING" | "IN_TRANSIT" | "DELIVERED";
  lastSyncedAt: string | null;
  raw: IRawCarrierResponse[];
  /** Optional link back to the Transimex shipment this container was entered against. */
  shipmentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LocationSubSchema = new Schema<ITrackingLocation>(
  {
    unLocationCode: { type: String, default: "" },
    portName: { type: String, default: "" },
    facility: { type: String, default: "" },
  },
  { _id: false }
);

const TrackedContainerSchema = new Schema<ITrackedContainer>(
  {
    containerNumber: { type: String, required: true, unique: true, trim: true, uppercase: true, index: true },
    containerSizeType: { type: String, default: "" },
    containerSizeLabel: { type: String, default: "" },
    blNumber: { type: String, default: "" },
    bookingNumber: { type: String, default: "" },
    carrier: { type: String, enum: CARRIER_CODES, required: true, index: true },
    carrierDetectionSource: { type: String, enum: ["explicit", "prefix"], required: true },
    vesselName: { type: String, default: "" },
    imoNumber: { type: String, default: "" },
    voyageNumber: { type: String, default: "" },
    originPort: { type: LocationSubSchema, default: undefined },
    destinationPort: { type: LocationSubSchema, default: undefined },
    portRotation: [
      {
        sequence: { type: Number, required: true },
        role: { type: String, enum: PORT_ROLES, required: true },
        unLocationCode: { type: String, default: "" },
        portName: { type: String, default: "" },
        facility: { type: String, default: "" },
        vesselName: { type: String, default: "" },
        voyageNumber: { type: String, default: "" },
      },
    ],
    events: [
      {
        eventType: { type: String, enum: EVENT_TYPES, required: true },
        eventClassifierCode: { type: String, enum: CLASSIFIERS, required: true },
        eventDateTime: { type: String, required: true },
        estimatedDateTime: { type: String, default: "" },
        actualDateTime: { type: String, default: "" },
        location: { type: LocationSubSchema, default: () => ({}) },
        vesselName: { type: String, default: "" },
        voyageNumber: { type: String, default: "" },
        description: { type: String, default: "" },
      },
    ],
    status: { type: String, enum: ["PENDING", "IN_TRANSIT", "DELIVERED"], default: "PENDING", index: true },
    lastSyncedAt: { type: String, default: null },
    raw: [
      {
        carrier: { type: String, enum: CARRIER_CODES, required: true },
        fetchedAt: { type: String, required: true },
        payload: { type: Schema.Types.Mixed },
      },
    ],
    shipmentId: { type: String, default: "", index: true },
  },
  { timestamps: true }
);

const TrackedContainer: Model<ITrackedContainer> =
  mongoose.models.TrackedContainer ||
  mongoose.model<ITrackedContainer>("TrackedContainer", TrackedContainerSchema);

export default TrackedContainer;

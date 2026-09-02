import mongoose, { Document, Model, Schema } from "mongoose";

export type TransportMode = "Road" | "Sea" | "Air" | "Rail";
export type CarrierStatus = "Active" | "Under Review" | "Suspended";

export interface ICarrier extends Document {
  name: string;
  code: string; // SCAC, DOT, or NSC code (e.g. "SWFT", "CN-RAIL", "BISO")
  primaryMode: TransportMode;
  supportedModes: TransportMode[];
  dispatchContact: {
    name: string;
    phone: string;
    email: string;
    emergency247Phone?: string;
  };
  headquarters: string;
  operatingLanes: string[]; // e.g. ["Montreal <-> Detroit", "Toronto <-> Vancouver"]
  fleetSize: string; // e.g. "120 Units (Dry Van & Reefer)"
  rating: number; // e.g. 4.8
  totalShipmentsCompleted: number;
  onTimeDeliveryRate: string; // e.g. "98.4%"
  insurance: {
    policyNumber: string;
    coverageAmount: string; // e.g. "$5,000,000 CAD"
    expiryDate: string; // e.g. "2027-04-15"
    isCompliant: boolean;
  };
  status: CarrierStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CarrierSchema = new Schema<ICarrier>(
  {
    name: { type: String, required: true, trim: true, index: true },
    code: { type: String, required: true, trim: true, uppercase: true, unique: true },
    primaryMode: {
      type: String,
      enum: ["Road", "Sea", "Air", "Rail"],
      required: true,
      index: true,
    },
    supportedModes: [{ type: String, enum: ["Road", "Sea", "Air", "Rail"] }],
    dispatchContact: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String, required: true, lowercase: true, trim: true },
      emergency247Phone: { type: String, default: "" },
    },
    headquarters: { type: String, required: true },
    operatingLanes: [{ type: String }],
    fleetSize: { type: String, default: "50+ Dedicated Units" },
    rating: { type: Number, default: 4.8, min: 1, max: 5 },
    totalShipmentsCompleted: { type: Number, default: 0 },
    onTimeDeliveryRate: { type: String, default: "98.0%" },
    insurance: {
      policyNumber: { type: String, required: true },
      coverageAmount: { type: String, default: "$5,000,000 CAD" },
      expiryDate: { type: String, required: true },
      isCompliant: { type: Boolean, default: true },
    },
    status: {
      type: String,
      enum: ["Active", "Under Review", "Suspended"],
      default: "Active",
      index: true,
    },
    notes: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

const Carrier: Model<ICarrier> =
  mongoose.models.Carrier || mongoose.model<ICarrier>("Carrier", CarrierSchema);

export default Carrier;

import mongoose, { Document, Model, Schema } from "mongoose";

export type PortalDocumentType =
  | "Bill of Lading"
  | "Air Waybill"
  | "Rail Waybill"
  | "Proof of Delivery"
  | "Customs Entry"
  | "Commercial Invoice";

export interface IPortalDocument extends Document {
  userId: string;
  shipmentId: string;
  name: string;
  type: PortalDocumentType;
  isClientVisible: boolean;
  statusText: string;
  customsPars?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PortalDocumentSchema = new Schema<IPortalDocument>(
  {
    userId: { type: String, required: true, index: true },
    shipmentId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: [
        "Bill of Lading",
        "Air Waybill",
        "Rail Waybill",
        "Proof of Delivery",
        "Customs Entry",
        "Commercial Invoice",
      ],
      required: true,
    },
    isClientVisible: { type: Boolean, default: false },
    statusText: { type: String, default: "Staff Uploaded - Broker Verified" },
    customsPars: { type: String, default: "" },
  },
  { timestamps: true }
);

const PortalDocument: Model<IPortalDocument> =
  mongoose.models.PortalDocument ||
  mongoose.model<IPortalDocument>("PortalDocument", PortalDocumentSchema);

export default PortalDocument;

import mongoose, { Document, Model, Schema } from "mongoose";

export interface IResource extends Document {
  titleEn: string;
  titleFr: string;
  category: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  fileKey?: string;
  fileUrl?: string;
  storageProvider?: "r2" | "mongodb";
  fileData?: Buffer;
  downloadsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ResourceSchema = new Schema<IResource>(
  {
    titleEn: { type: String, required: true, trim: true },
    titleFr: { type: String, required: true, trim: true },
    category: { type: String, default: "General" },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    fileKey: { type: String, default: "", index: true },
    fileUrl: { type: String, default: "" },
    storageProvider: {
      type: String,
      enum: ["r2", "mongodb"],
      default: "mongodb",
    },
    fileData: { type: Buffer },
    downloadsCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

const Resource: Model<IResource> =
  mongoose.models.Resource || mongoose.model<IResource>("Resource", ResourceSchema);

export default Resource;

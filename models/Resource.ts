import mongoose, { Document, Model, Schema } from "mongoose";

export interface IResource extends Document {
  titleEn: string;
  titleFr: string;
  category: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  fileData: Buffer;
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
    fileData: { type: Buffer, required: true },
    downloadsCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

const Resource: Model<IResource> =
  mongoose.models.Resource || mongoose.model<IResource>("Resource", ResourceSchema);

export default Resource;

import mongoose, { Document, Model, Schema } from "mongoose";

export interface IBlogMedia extends Document {
  fileName: string;
  mimeType: string;
  fileSize: number;
  fileData?: Buffer;
  fileUrl?: string;
  storageProvider: "r2" | "mongodb";
  createdAt: Date;
}

const BlogMediaSchema = new Schema<IBlogMedia>(
  {
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    fileData: { type: Buffer },
    fileUrl: { type: String, default: "" },
    storageProvider: {
      type: String,
      enum: ["r2", "mongodb"],
      default: "mongodb",
    },
  },
  {
    timestamps: true,
  }
);

const BlogMedia: Model<IBlogMedia> =
  mongoose.models.BlogMedia || mongoose.model<IBlogMedia>("BlogMedia", BlogMediaSchema);

export default BlogMedia;

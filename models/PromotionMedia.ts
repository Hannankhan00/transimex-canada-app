import mongoose, { Document, Model, Schema } from "mongoose";

export interface IPromotionMedia extends Document {
  mediaId: string;
  mimeType: string;
  data: Buffer;
  size: number;
  createdAt: Date;
}

const PromotionMediaSchema = new Schema<IPromotionMedia>(
  {
    mediaId: { type: String, required: true, unique: true, index: true },
    mimeType: { type: String, default: "image/webp" },
    data: { type: Buffer, required: true },
    size: { type: Number, required: true },
  },
  { timestamps: true }
);

const PromotionMedia: Model<IPromotionMedia> =
  mongoose.models.PromotionMedia ||
  mongoose.model<IPromotionMedia>("PromotionMedia", PromotionMediaSchema);

export default PromotionMedia;

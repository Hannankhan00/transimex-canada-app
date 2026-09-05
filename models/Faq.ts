import mongoose, { Document, Model, Schema } from "mongoose";

export type FaqCategory = "Customs" | "Tracking" | "Billing" | "Operations";

export interface IFaq extends Document {
  category: FaqCategory;
  question: { en: string; fr: string };
  answer: { en: string; fr: string };
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const FaqSchema = new Schema<IFaq>(
  {
    category: {
      type: String,
      enum: ["Customs", "Tracking", "Billing", "Operations"],
      default: "Operations",
    },
    question: {
      en: { type: String, required: true },
      fr: { type: String, required: true },
    },
    answer: {
      en: { type: String, required: true },
      fr: { type: String, required: true },
    },
    order: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

const Faq: Model<IFaq> = mongoose.models.Faq || mongoose.model<IFaq>("Faq", FaqSchema);

export default Faq;

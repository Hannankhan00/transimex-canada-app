import mongoose, { Document, Model, Schema } from "mongoose";

export type EmailTemplateCategory = "Quotes" | "Customs" | "Shipments" | "Support" | "Staff";

export interface IEmailTemplate extends Document {
  slug: string;
  name: string;
  description: string;
  category: EmailTemplateCategory;
  subject: { en: string; fr: string };
  heading: { en: string; fr: string };
  body: { en: string; fr: string };
  placeholders: string[];
  createdAt: Date;
  updatedAt: Date;
}

const EmailTemplateSchema = new Schema<IEmailTemplate>(
  {
    slug: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    category: {
      type: String,
      enum: ["Quotes", "Customs", "Shipments", "Support", "Staff"],
      default: "Quotes",
    },
    subject: {
      en: { type: String, required: true },
      fr: { type: String, required: true },
    },
    heading: {
      en: { type: String, required: true },
      fr: { type: String, required: true },
    },
    body: {
      en: { type: String, required: true },
      fr: { type: String, required: true },
    },
    placeholders: [{ type: String }],
  },
  {
    timestamps: true,
  }
);

const EmailTemplate: Model<IEmailTemplate> =
  mongoose.models.EmailTemplate || mongoose.model<IEmailTemplate>("EmailTemplate", EmailTemplateSchema);

export default EmailTemplate;

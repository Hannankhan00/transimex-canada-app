import mongoose, { Document, Model, Schema } from "mongoose";

export type InquiryCategory = "General Inquiry" | "Freight Quote" | "Partnership" | "Customs Clearance";

export interface IInquiry extends Document {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  subject: string;
  category: InquiryCategory;
  message: string;
  unread: boolean;
  replied: boolean;
  reply?: {
    text: string;
    repliedAt: Date;
    repliedBy: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const InquirySchema = new Schema<IInquiry>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, default: "" },
    company: { type: String, default: "" },
    subject: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["General Inquiry", "Freight Quote", "Partnership", "Customs Clearance"],
      default: "General Inquiry",
    },
    message: { type: String, required: true },
    unread: { type: Boolean, default: true },
    replied: { type: Boolean, default: false },
    reply: {
      text: { type: String },
      repliedAt: { type: Date },
      repliedBy: { type: String },
    },
  },
  {
    timestamps: true,
  }
);

const Inquiry: Model<IInquiry> =
  mongoose.models.Inquiry || mongoose.model<IInquiry>("Inquiry", InquirySchema);

export default Inquiry;

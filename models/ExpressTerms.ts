import mongoose, { Document, Model, Schema } from "mongoose";
import type { TermsContent } from "@/lib/express/terms";

/**
 * One published version of the Express terms of service. Versions are never
 * edited: a change is a new version, so what each client accepted stays on file.
 */
export interface IExpressTerms extends Document {
  /** "v2", "v3", ... ("v1" is the built-in default and is not stored). */
  version: string;
  number: number;
  content: TermsContent;
  publishedBy: string;
  publishedByName: string;
  createdAt: Date;
}

const SectionSchema = new Schema({ title: { type: String, required: true }, body: { type: String, required: true } }, { _id: false });
const LanguageSchema = new Schema(
  {
    heading: { type: String, required: true },
    intro: { type: String, required: true },
    sections: { type: [SectionSchema], default: [] },
  },
  { _id: false }
);

const ExpressTermsSchema = new Schema<IExpressTerms>(
  {
    version: { type: String, required: true, unique: true },
    number: { type: Number, required: true, unique: true },
    content: { en: { type: LanguageSchema, required: true }, fr: { type: LanguageSchema, required: true } },
    publishedBy: { type: String, required: true },
    publishedByName: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const ExpressTerms: Model<IExpressTerms> =
  mongoose.models.ExpressTerms || mongoose.model<IExpressTerms>("ExpressTerms", ExpressTermsSchema);

export default ExpressTerms;

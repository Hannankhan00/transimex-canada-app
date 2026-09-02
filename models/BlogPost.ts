import mongoose, { Document, Model, Schema } from "mongoose";

export interface IBlogPost extends Document {
  title: {
    en: string;
    fr: string;
  };
  slug: string;
  excerpt: {
    en: string;
    fr: string;
  };
  content: {
    en: string;
    fr: string;
  };
  author: string;
  category: string;
  featuredImage: string;
  status: "Draft" | "Published";
  publishedAt?: Date;
  tags: string[];
  views: number;
  createdAt: Date;
  updatedAt: Date;
}

const BlogPostSchema = new Schema<IBlogPost>(
  {
    title: {
      en: { type: String, required: true },
      fr: { type: String, required: true },
    },
    slug: { type: String, required: true, unique: true, index: true },
    excerpt: {
      en: { type: String, required: true },
      fr: { type: String, required: true },
    },
    content: {
      en: { type: String, required: true },
      fr: { type: String, required: true },
    },
    author: { type: String, default: "Transimex Logistics Editorial" },
    category: { type: String, default: "Industry Insights" },
    featuredImage: { type: String, default: "" },
    status: {
      type: String,
      enum: ["Draft", "Published"],
      default: "Draft",
      index: true,
    },
    publishedAt: { type: Date },
    tags: [{ type: String }],
    views: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

const BlogPost: Model<IBlogPost> =
  mongoose.models.BlogPost || mongoose.model<IBlogPost>("BlogPost", BlogPostSchema);

export default BlogPost;

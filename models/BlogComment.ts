import mongoose, { Document, Model, Schema } from "mongoose";

export interface IBlogComment extends Document {
  postId: mongoose.Types.ObjectId;
  postSlug: string;
  postTitle?: {
    en: string;
    fr: string;
  };
  authorName: string;
  authorEmail?: string;
  content: string;
  status: "Approved" | "Pending" | "Hidden";
  adminReply?: {
    content: string;
    repliedBy: string;
    repliedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const BlogCommentSchema = new Schema<IBlogComment>(
  {
    postId: {
      type: Schema.Types.ObjectId,
      ref: "BlogPost",
      required: true,
      index: true,
    },
    postSlug: {
      type: String,
      required: true,
      index: true,
    },
    postTitle: {
      en: { type: String, default: "" },
      fr: { type: String, default: "" },
    },
    authorName: {
      type: String,
      required: true,
      trim: true,
    },
    authorEmail: {
      type: String,
      trim: true,
      default: "",
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Approved", "Pending", "Hidden"],
      default: "Approved",
      index: true,
    },
    adminReply: {
      content: { type: String, default: "" },
      repliedBy: { type: String, default: "Transimex Logistics Editorial" },
      repliedAt: { type: Date },
    },
  },
  {
    timestamps: true,
  }
);

const BlogComment: Model<IBlogComment> =
  mongoose.models.BlogComment ||
  mongoose.model<IBlogComment>("BlogComment", BlogCommentSchema);

export default BlogComment;

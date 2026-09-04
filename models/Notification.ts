import mongoose, { Document, Model, Schema } from "mongoose";

export type NotificationCategory = "transit" | "customs" | "document" | "quote" | "system";

export interface INotification extends Document {
  userId: string;
  title: string;
  titleFr?: string;
  desc: string;
  descFr?: string;
  category: NotificationCategory;
  link?: string;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    titleFr: { type: String, default: "" },
    desc: { type: String, required: true },
    descFr: { type: String, default: "" },
    category: {
      type: String,
      enum: ["transit", "customs", "document", "quote", "system"],
      default: "system",
    },
    link: { type: String, default: "" },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>("Notification", NotificationSchema);

export default Notification;

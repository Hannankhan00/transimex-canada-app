import mongoose, { Document, Model, Schema } from "mongoose";

export interface ISupportMessage {
  sender: "client" | "admin";
  senderName: string;
  message: string;
  timestamp: string;
  isInternal?: boolean;
}

export interface ISupportTicket extends Document {
  ticketId: string; // e.g. "SUP-2026-0042"
  client: {
    name: string;
    companyName: string;
    email: string;
    userId?: string;
  };
  subject: string;
  shipmentId?: string;
  priority: "Low" | "Medium" | "High" | "Critical Dispatch Emergency" | "Urgent" | "Normal";
  status: "Open" | "In Progress" | "Resolved";
  category: string;
  messages: ISupportMessage[];
  internalNotes: string;
  createdAt: Date;
  updatedAt: Date;
}

const SupportMessageSchema = new Schema<ISupportMessage>(
  {
    sender: { type: String, enum: ["client", "admin"], required: true },
    senderName: { type: String, required: true },
    message: { type: String, required: true },
    timestamp: { type: String, required: true },
    isInternal: { type: Boolean, default: false },
  },
  { _id: false }
);

const SupportTicketSchema = new Schema<ISupportTicket>(
  {
    ticketId: { type: String, required: true, unique: true, index: true },
    client: {
      name: { type: String, required: true },
      companyName: { type: String, required: true },
      email: { type: String, required: true, lowercase: true, trim: true },
      userId: { type: String, default: "" },
    },
    subject: { type: String, required: true },
    shipmentId: { type: String, default: "" },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical Dispatch Emergency", "Urgent", "Normal"],
      default: "Normal",
    },
    status: {
      type: String,
      enum: ["Open", "In Progress", "Resolved"],
      default: "Open",
      index: true,
    },
    category: { type: String, default: "Operations" },
    messages: [SupportMessageSchema],
    internalNotes: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

const SupportTicket: Model<ISupportTicket> =
  mongoose.models.SupportTicket ||
  mongoose.model<ISupportTicket>("SupportTicket", SupportTicketSchema);

export default SupportTicket;

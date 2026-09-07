import mongoose, { Document, Model, Schema } from "mongoose";

export interface ISession extends Document {
  userId: string;
  sessionId: string;
  device: string;
  browser: string;
  os: string;
  ip?: string;
  createdAt: Date;
  lastActiveAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    userId: { type: String, required: true, index: true },
    sessionId: { type: String, required: true, unique: true },
    device: { type: String, default: "Unknown Device" },
    browser: { type: String, default: "Unknown Browser" },
    os: { type: String, default: "Unknown OS" },
    ip: { type: String, default: "" },
    lastActiveAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Session: Model<ISession> =
  mongoose.models.Session || mongoose.model<ISession>("Session", SessionSchema);

export default Session;

import mongoose, { Document, Model, Schema } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  address?: string;
  companyName: string;
  industry?: string;
  city?: string;
  province?: string;
  role?: string;
  googleId?: string;
  avatar?: string;
  provider?: string;
  isVerified?: boolean;
  verificationToken?: string;
  verificationTokenExpires?: Date;
  resetToken?: string;
  resetTokenExpires?: Date;
  jobTitle?: string;
  department?: string;
  emailPreferences?: {
    emailShipmentUpdates: boolean;
    emailCustomsHolds: boolean;
    emailNewDocuments: boolean;
    emailRateAlerts: boolean;
    smsUrgentAlerts: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: false,
      minlength: 6,
      select: false, // Don't return password by default
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    companyName: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
      default: "Laurentian Global Logistics Ltd.",
    },
    industry: {
      type: String,
      enum: ["Automotive", "Manufacturing", "Pharma", "Retail", "Food", "Industrial", "Other"],
      default: "Industrial",
    },
    city: {
      type: String,
      trim: true,
    },
    province: {
      type: String,
      trim: true,
      default: "QC",
    },
    role: {
      type: String,
      enum: ["client", "user", "admin", "superadmin", "subadmin", "dispatcher"],
      default: "client",
    },
    googleId: {
      type: String,
      sparse: true,
    },
    avatar: {
      type: String,
    },
    provider: {
      type: String,
      default: "credentials",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
    },
    verificationTokenExpires: {
      type: Date,
    },
    resetToken: {
      type: String,
    },
    resetTokenExpires: {
      type: Date,
    },
    jobTitle: {
      type: String,
      default: "",
    },
    department: {
      type: String,
      default: "",
    },
    emailPreferences: {
      emailShipmentUpdates: { type: Boolean, default: true },
      emailCustomsHolds: { type: Boolean, default: true },
      emailNewDocuments: { type: Boolean, default: true },
      emailRateAlerts: { type: Boolean, default: false },
      smsUrgentAlerts: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  }
);

// Prevent mongoose model overwrite error during hot reloads
const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;

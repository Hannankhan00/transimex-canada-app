import mongoose, { Document, Model, Schema } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  companyName: string;
  role?: string;
  googleId?: string;
  avatar?: string;
  provider?: string;
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
    companyName: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
      default: "Laurentian Global Logistics Ltd.",
    },
    role: {
      type: String,
      enum: ["client", "admin", "superadmin", "subadmin", "dispatcher"],
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
  },
  {
    timestamps: true,
  }
);

// Prevent mongoose model overwrite error during hot reloads
const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;

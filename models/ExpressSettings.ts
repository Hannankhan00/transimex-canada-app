import mongoose, { Document, Model, Schema } from "mongoose";

export const EXPRESS_SETTINGS_KEY = "default";

export interface IExpressSettings extends Document {
  key: string;
  /** The single discount (percent off base freight) applied to every B2C account. */
  b2cDiscountPct: number;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExpressSettingsSchema = new Schema<IExpressSettings>(
  {
    key: { type: String, required: true, unique: true, default: EXPRESS_SETTINGS_KEY },
    b2cDiscountPct: { type: Number, required: true, default: 0, min: 0, max: 100 },
    updatedBy: { type: String },
  },
  { timestamps: true }
);

const ExpressSettings: Model<IExpressSettings> =
  mongoose.models.ExpressSettings || mongoose.model<IExpressSettings>("ExpressSettings", ExpressSettingsSchema);

export default ExpressSettings;

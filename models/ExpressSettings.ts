import mongoose, { Document, Model, Schema } from "mongoose";

export const EXPRESS_SETTINGS_KEY = "default";

export interface IExpressSettings extends Document {
  key: string;
  /** The single discount (percent off base freight) applied to every B2C account. */
  b2cDiscountPct: number;
  /**
   * Transimex's discount from DHL on base freight (percent, 0 to <100). STAFF ONLY.
   * null = not set. Used to rebuild the DHL public price when the API returns
   * only our account rate. The real figure comes from the DHL contract.
   */
  dhlContractDiscountPct: number | null;
  /** Flat fee (CAD cents) added to the quote when DHL pickup is chosen. */
  pickupFeeCents: number;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExpressSettingsSchema = new Schema<IExpressSettings>(
  {
    key: { type: String, required: true, unique: true, default: EXPRESS_SETTINGS_KEY },
    b2cDiscountPct: { type: Number, required: true, default: 0, min: 0, max: 100 },
    dhlContractDiscountPct: { type: Number, default: null, min: 0, max: 99.99 },
    pickupFeeCents: { type: Number, default: 0, min: 0, max: 100000 },
    updatedBy: { type: String },
  },
  { timestamps: true }
);

const ExpressSettings: Model<IExpressSettings> =
  mongoose.models.ExpressSettings || mongoose.model<IExpressSettings>("ExpressSettings", ExpressSettingsSchema);

export default ExpressSettings;

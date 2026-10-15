import mongoose, { Document, Model, Schema } from "mongoose";

export type ExpressDiscountScope = "b2c_global" | "b2b_account";

/** Append-only record of every discount change, so a disputed price can be explained. */
export interface IExpressDiscountHistory extends Document {
  scope: ExpressDiscountScope;
  /** ExpressAccount id for b2b_account; empty for the global B2C discount. */
  accountId: string;
  /** null when no discount existed before (first approval). */
  oldPct: number | null;
  newPct: number;
  changedBy: string;
  changedByName: string;
  createdAt: Date;
}

const ExpressDiscountHistorySchema = new Schema<IExpressDiscountHistory>(
  {
    scope: { type: String, enum: ["b2c_global", "b2b_account"], required: true },
    accountId: { type: String, default: "", index: true },
    oldPct: { type: Number, default: null },
    newPct: { type: Number, required: true },
    changedBy: { type: String, required: true },
    changedByName: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ExpressDiscountHistorySchema.index({ scope: 1, createdAt: -1 });

const ExpressDiscountHistory: Model<IExpressDiscountHistory> =
  mongoose.models.ExpressDiscountHistory ||
  mongoose.model<IExpressDiscountHistory>("ExpressDiscountHistory", ExpressDiscountHistorySchema);

export default ExpressDiscountHistory;

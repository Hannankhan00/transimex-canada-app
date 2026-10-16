import mongoose, { Document, Model, Schema } from "mongoose";

/** A named, ever-increasing counter, used for gap-free invoice numbers. */
export interface IExpressCounter extends Document {
  key: string;
  seq: number;
}

const ExpressCounterSchema = new Schema<IExpressCounter>({
  key: { type: String, required: true, unique: true },
  seq: { type: Number, required: true, default: 0 },
});

const ExpressCounter: Model<IExpressCounter> = mongoose.models.ExpressCounter || mongoose.model<IExpressCounter>("ExpressCounter", ExpressCounterSchema);

export default ExpressCounter;

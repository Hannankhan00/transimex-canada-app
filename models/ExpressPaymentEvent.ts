import mongoose, { Document, Model, Schema } from "mongoose";

/**
 * One row per payment-provider webhook event we have received. The unique
 * eventId makes a repeated delivery of the same event a harmless no-op.
 */
export interface IExpressPaymentEvent extends Document {
  eventId: string;
  type: string;
  shipmentId?: string;
  invoiceId?: string;
  receivedAt: Date;
  /** Set once the event has been fully handled. A row without it is retried on redelivery. */
  processedAt?: Date;
  outcome?: string;
}

const ExpressPaymentEventSchema = new Schema<IExpressPaymentEvent>({
  eventId: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  shipmentId: { type: String },
  invoiceId: { type: String },
  receivedAt: { type: Date, required: true, default: () => new Date() },
  processedAt: { type: Date },
  outcome: { type: String },
});

const ExpressPaymentEvent: Model<IExpressPaymentEvent> =
  mongoose.models.ExpressPaymentEvent || mongoose.model<IExpressPaymentEvent>("ExpressPaymentEvent", ExpressPaymentEventSchema);

export default ExpressPaymentEvent;

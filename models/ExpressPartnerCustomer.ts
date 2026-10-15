import mongoose, { Document, Model, Schema } from "mongoose";

/**
 * A customer of an Express partner. The partner books for them, and may also
 * give them a login (loginUserId / loginAccountId) so they can see their own
 * prices and shipments.
 */
export interface IExpressPartnerCustomer extends Document {
  /** The partner's ExpressAccount id. */
  partnerAccountId: string;
  /** The partner's CRM user id (shipments and quotes are owned by it). */
  partnerUserId: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  notes?: string;
  /** Percent added on top of the partner's price. null = use the partner's default markup. */
  markupPct: number | null;
  archived: boolean;
  /** Set once the partner has created a login for this customer. */
  loginUserId?: string;
  loginAccountId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExpressPartnerCustomerSchema = new Schema<IExpressPartnerCustomer>(
  {
    partnerAccountId: { type: String, required: true, index: true },
    partnerUserId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 160 },
    phone: { type: String, trim: true, maxlength: 40 },
    company: { type: String, trim: true, maxlength: 160 },
    notes: { type: String, trim: true, maxlength: 500 },
    // Strictly below 100: pricing refuses a markup of 100% or more.
    markupPct: { type: Number, default: null, min: 0, max: 99.99 },
    archived: { type: Boolean, default: false },
    loginUserId: { type: String, index: true },
    loginAccountId: { type: String },
  },
  { timestamps: true }
);

ExpressPartnerCustomerSchema.index({ partnerAccountId: 1, archived: 1, createdAt: -1 });
// The same email cannot be added twice by one partner.
ExpressPartnerCustomerSchema.index({ partnerAccountId: 1, email: 1 }, { unique: true });

const ExpressPartnerCustomer: Model<IExpressPartnerCustomer> =
  mongoose.models.ExpressPartnerCustomer || mongoose.model<IExpressPartnerCustomer>("ExpressPartnerCustomer", ExpressPartnerCustomerSchema);

export default ExpressPartnerCustomer;

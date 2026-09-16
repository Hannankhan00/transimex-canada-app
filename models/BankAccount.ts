import mongoose, { Document, Model, Schema } from "mongoose";

export type BankAccountCurrency = "CAD" | "USD";

export interface IBankAccount extends Document {
  bankName: string;
  beneficiaryName: string;
  accountNumber: string;
  transitNumber?: string;
  institutionNumber?: string;
  swiftBic?: string;
  bankAddress?: string;
  currency: BankAccountCurrency;
  isDefault: boolean;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BankAccountSchema = new Schema<IBankAccount>(
  {
    bankName: { type: String, required: true, trim: true },
    beneficiaryName: { type: String, required: true, trim: true },
    accountNumber: { type: String, required: true, trim: true },
    transitNumber: { type: String, default: "" },
    institutionNumber: { type: String, default: "" },
    swiftBic: { type: String, default: "" },
    bankAddress: { type: String, default: "" },
    currency: { type: String, enum: ["CAD", "USD"], required: true, index: true },
    isDefault: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

const BankAccount: Model<IBankAccount> =
  mongoose.models.BankAccount || mongoose.model<IBankAccount>("BankAccount", BankAccountSchema);

export default BankAccount;

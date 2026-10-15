import mongoose, { Document, Model, Schema } from "mongoose";

export type AuditActionType =
  | "STATUS_UPDATE"
  | "QUOTE_ACCEPTED"
  | "QUOTE_REJECTED"
  | "QUOTE_PRICE_OFFERED"
  | "QUOTE_REVISED_OFFER"
  | "QUOTE_CLIENT_ACCEPTED"
  | "QUOTE_CLIENT_REJECTED"
  | "CUSTOMS_HOLD"
  | "CUSTOMS_RELEASE"
  | "DUTIES_DISPATCHED"
  | "DOCUMENT_UPLOAD"
  | "STAFF_INVITED"
  | "STAFF_CREATED"
  | "STAFF_UPDATED"
  | "STAFF_DELETED"
  | "STAFF_ROLE_UPDATED"
  | "ACCESS_REVOKED"
  | "CARRIER_ASSIGNED"
  | "EMAIL_TEMPLATE_UPDATED"
  | "ADMIN_DIRECT_ONBOARDING_QUOTE"
  | "CONTAINER_LINKED"
  | "CONTAINER_UNLINKED"
  | "BOOKING_LINKED"
  | "BOOKING_UNLINKED"
  | "INVOICE_GENERATED"
  | "PAYMENT_PROOF_UPLOADED"
  | "PAYMENT_VERIFIED"
  | "PAYMENT_REJECTED"
  | "SHIPMENT_CREATED"
  | "BANK_ACCOUNT_CREATED"
  | "BANK_ACCOUNT_UPDATED"
  | "BANK_ACCOUNT_DELETED"
  | "PROMOTION_CREATED"
  | "PROMOTION_UPDATED"
  | "PROMOTION_DELETED"
  | "EXPRESS_ACCOUNT_APPROVED"
  | "EXPRESS_ACCOUNT_REJECTED"
  | "EXPRESS_ACCOUNT_SUSPENDED"
  | "EXPRESS_ACCOUNT_REACTIVATED"
  | "EXPRESS_DISCOUNT_CHANGED"
  | "EXPRESS_BILLING_MODE_CHANGED"
  | "EXPRESS_SETTINGS_CHANGED"
  | "EXPRESS_SHIPMENT_CANCELLED"
  | "EXPRESS_REFUND_ISSUED"
  | "EXPRESS_LABEL_UPLOADED"
  | "EXPRESS_TERMS_PUBLISHED"
  | "EXPRESS_PARTNER_CHANGED";

export type AuditResourceType =
  | "Shipment"
  | "Quote"
  | "Client"
  | "StaffUser"
  | "Document"
  | "Customs"
  | "EmailTemplate"
  | "Invoice"
  | "BankAccount"
  | "Promotion"
  | "ExpressAccount"
  | "ExpressSettings"
  | "ExpressShipment"
  | "ExpressTerms";

export interface IAuditLog extends Document {
  actorId?: string;
  staffName: string;
  staffEmail: string;
  staffRole: string;
  action: AuditActionType;
  resourceType: AuditResourceType;
  resourceId: string;
  details: string;
  ipAddress?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actorId: { type: String },
    staffName: { type: String, required: true },
    staffEmail: { type: String, required: true },
    staffRole: { type: String, required: true },
    action: { type: String, required: true },
    resourceType: { type: String, required: true },
    resourceId: { type: String, required: true },
    details: { type: String, default: "" },
    ipAddress: { type: String, default: "" },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);

export default AuditLog;

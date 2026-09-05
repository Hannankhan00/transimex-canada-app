import mongoose, { Document, Model, Schema } from "mongoose";

export type AuditActionType =
  | "STATUS_UPDATE"
  | "QUOTE_ACCEPTED"
  | "QUOTE_REJECTED"
  | "CUSTOMS_HOLD"
  | "CUSTOMS_RELEASE"
  | "DUTIES_DISPATCHED"
  | "DOCUMENT_UPLOAD"
  | "STAFF_INVITED"
  | "STAFF_ROLE_UPDATED"
  | "ACCESS_REVOKED"
  | "CARRIER_ASSIGNED"
  | "EMAIL_TEMPLATE_UPDATED";

export type AuditResourceType =
  | "Shipment"
  | "Quote"
  | "Client"
  | "StaffUser"
  | "Document"
  | "Customs"
  | "EmailTemplate";

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

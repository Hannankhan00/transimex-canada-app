import { AuditActionType, AuditResourceType } from "@/models/AuditLog";

export type { AuditActionType, AuditResourceType };

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  staffName: string;
  staffEmail: string;
  staffRole: string;
  action: AuditActionType;
  resourceType: AuditResourceType;
  resourceId: string;
  details: string;
  ipAddress?: string;
}

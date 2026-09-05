import connectDB from "@/lib/mongoose";
import AuditLog, { AuditActionType, AuditResourceType } from "@/models/AuditLog";
import { TokenPayload } from "@/lib/auth";

interface LogAuditParams {
  actor: TokenPayload;
  action: AuditActionType;
  resourceType: AuditResourceType;
  resourceId: string;
  details?: string;
  ipAddress?: string;
}

export async function logAudit({
  actor,
  action,
  resourceType,
  resourceId,
  details = "",
  ipAddress = "",
}: LogAuditParams): Promise<void> {
  try {
    await connectDB();
    await AuditLog.create({
      actorId: actor.userId,
      staffName: actor.name,
      staffEmail: actor.email,
      staffRole: actor.role,
      action,
      resourceType,
      resourceId,
      details,
      ipAddress,
    });
  } catch (error) {
    console.error("Failed to write audit log entry:", error);
  }
}

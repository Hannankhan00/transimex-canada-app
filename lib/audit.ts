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

/** Writes an audit entry and THROWS if it cannot be written. For actions that must not happen unrecorded. */
export async function logAuditStrict({
  actor,
  action,
  resourceType,
  resourceId,
  details = "",
  ipAddress = "",
}: LogAuditParams): Promise<void> {
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
}

/** Best effort: a failure is logged and never blocks the action. */
export async function logAudit(params: LogAuditParams): Promise<void> {
  try {
    await logAuditStrict(params);
  } catch (error) {
    console.error("Failed to write audit log entry:", error);
  }
}

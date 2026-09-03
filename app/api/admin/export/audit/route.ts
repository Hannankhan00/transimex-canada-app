import { NextRequest } from "next/server";
import { getStoredAuditLogs } from "@/lib/mockData";
import { serializeToCsv, createCsvDownloadResponse } from "@/lib/csvExport";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const staff = searchParams.get("staff");

    let logs = getStoredAuditLogs();

    if (action && action !== "all") {
      logs = logs.filter((l) => l.action.toLowerCase() === action.toLowerCase());
    }

    if (staff && staff !== "all") {
      logs = logs.filter((l) => l.staffName.toLowerCase() === staff.toLowerCase());
    }

    const flatData = logs.map((l) => ({
      auditId: l.id,
      timestamp: l.timestamp,
      staffName: l.staffName,
      staffEmail: l.staffEmail,
      staffRole: l.staffRole,
      actionType: l.action,
      resourceType: l.resourceType,
      resourceId: l.resourceId,
      details: l.details,
      ipAddress: l.ipAddress,
    }));

    const headers = [
      { key: "auditId", label: "Audit Event ID" },
      { key: "timestamp", label: "Timestamp" },
      { key: "staffName", label: "Staff Member" },
      { key: "staffEmail", label: "Staff Email" },
      { key: "staffRole", label: "Privilege Role" },
      { key: "actionType", label: "Action Category" },
      { key: "resourceType", label: "Resource Affected" },
      { key: "resourceId", label: "Target Resource Ref" },
      { key: "details", label: "Action Audit Details" },
      { key: "ipAddress", label: "Origin Gateway / IP" },
    ];

    const csvContent = serializeToCsv(flatData, headers);
    const filename = `transimex_system_audit_log_${new Date().toISOString().slice(0, 10)}.csv`;

    return createCsvDownloadResponse(csvContent, filename);
  } catch (error: any) {
    console.error("Error exporting audit log CSV:", error);
    return new Response(`Error generating audit log export: ${error.message}`, { status: 500 });
  }
}

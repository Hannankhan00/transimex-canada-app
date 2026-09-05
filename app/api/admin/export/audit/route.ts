import { NextRequest } from "next/server";
import connectDB from "@/lib/mongoose";
import AuditLog from "@/models/AuditLog";
import { serializeToCsv, createCsvDownloadResponse } from "@/lib/csvExport";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const staff = searchParams.get("staff");

    await connectDB();
    const query: any = {};
    if (action && action !== "all") {
      query.action = action;
    }
    if (staff && staff !== "all") {
      query.staffName = staff;
    }

    const logs = await AuditLog.find(query).sort({ createdAt: -1 }).lean();

    const flatData = logs.map((l: any) => ({
      auditId: l._id.toString(),
      timestamp: new Date(l.createdAt).toISOString(),
      staffName: l.staffName,
      staffEmail: l.staffEmail,
      staffRole: l.staffRole,
      actionType: l.action,
      resourceType: l.resourceType,
      resourceId: l.resourceId,
      details: l.details,
      ipAddress: l.ipAddress || "",
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

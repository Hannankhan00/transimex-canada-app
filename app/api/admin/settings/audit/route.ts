import { NextResponse } from "next/server";
import { getStoredAuditLogs, AuditLogEntry } from "@/lib/mockData";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const staff = searchParams.get("staff");
    const search = searchParams.get("q")?.toLowerCase() || "";

    let logs: AuditLogEntry[] = getStoredAuditLogs();

    if (action && action !== "all") {
      logs = logs.filter((l) => l.action.toLowerCase() === action.toLowerCase());
    }

    if (staff && staff !== "all") {
      logs = logs.filter((l) => l.staffName.toLowerCase() === staff.toLowerCase());
    }

    if (search) {
      logs = logs.filter(
        (l) =>
          l.id.toLowerCase().includes(search) ||
          l.staffName.toLowerCase().includes(search) ||
          l.resourceId.toLowerCase().includes(search) ||
          l.details.toLowerCase().includes(search) ||
          l.action.toLowerCase().includes(search)
      );
    }

    const all = getStoredAuditLogs();
    const actions = Array.from(new Set(all.map((l) => l.action)));
    const staffMembers = Array.from(new Set(all.map((l) => l.staffName)));

    return NextResponse.json({
      success: true,
      logs,
      totalCount: logs.length,
      filters: {
        actions,
        staffMembers,
      },
    });
  } catch (error: any) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}

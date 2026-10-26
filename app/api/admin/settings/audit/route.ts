import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongoose";
import AuditLog from "@/models/AuditLog";
import User from "@/models/User";
import { verifyToken } from "@/lib/auth";

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatTimestamp(date: Date): string {
  return new Date(date).toLocaleString("en-CA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const actor = verifyToken(token);
    if (!actor) {
      return NextResponse.json({ error: "Invalid session token" }, { status: 401 });
    }

    await connectDB();
    const actorUser = await User.findById(actor.userId).lean<any>();
    if (!actorUser) {
      return NextResponse.json({ error: "User record not found" }, { status: 403 });
    }

    // Must be superadmin or have explicit settings permission
    const canViewAudit =
      actorUser.role === "superadmin" ||
      (Array.isArray(actorUser.permissions) && actorUser.permissions.includes("settings"));

    if (!canViewAudit) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to view audit logs." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const staff = searchParams.get("staff");
    const search = searchParams.get("q")?.toLowerCase() || "";

    const query: Record<string, any> = {};
    if (action && action !== "all") {
      query.action = { $regex: `^${escapeRegex(action)}$`, $options: "i" };
    }
    if (staff && staff !== "all") {
      query.staffName = { $regex: `^${escapeRegex(staff)}$`, $options: "i" };
    }

    const records = await AuditLog.find(query).sort({ createdAt: -1 }).limit(500).lean();

    let logs = records.map((l: any) => ({
      id: l._id.toString(),
      timestamp: formatTimestamp(l.createdAt),
      staffName: l.staffName,
      staffEmail: l.staffEmail,
      staffRole: l.staffRole,
      action: l.action,
      resourceType: l.resourceType,
      resourceId: l.resourceId,
      details: l.details || "",
      ipAddress: l.ipAddress || "",
    }));

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

    const allRecords = await AuditLog.find().sort({ createdAt: -1 }).limit(1000).lean();
    const actions = Array.from(new Set(allRecords.map((l: any) => l.action)));
    const staffMembers = Array.from(new Set(allRecords.map((l: any) => l.staffName)));

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


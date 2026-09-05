import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import { verifyToken } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { staffRoleToPermissionRole, toStaffUserView } from "@/lib/staffUsers";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const actor = verifyToken(token);
    if (!actor || actor.role !== "superadmin") {
      return NextResponse.json(
        { error: "Forbidden: Only Super Admin can modify staff access" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { role, status, department } = body;

    await connectDB();
    const existing = await User.findById(id);
    if (!existing) {
      return NextResponse.json({ error: "Staff user not found" }, { status: 404 });
    }

    const previousView = toStaffUserView(existing);

    if (typeof department === "string") existing.department = department;
    if (role) {
      existing.jobTitle = role;
      existing.role = staffRoleToPermissionRole(role);
    }
    if (status) {
      existing.accountStatus = status.toLowerCase() as "active" | "pending" | "revoked";
    }
    await existing.save();

    if (status && status.toLowerCase() !== previousView.status.toLowerCase()) {
      await logAudit({
        actor,
        action: status.toLowerCase() === "revoked" ? "ACCESS_REVOKED" : "STATUS_UPDATE",
        resourceType: "StaffUser",
        resourceId: existing._id.toString(),
        details: `Staff member ${existing.name} access status changed from ${previousView.status} to ${status}.`,
      });
    } else if (role && role !== previousView.role) {
      await logAudit({
        actor,
        action: "STAFF_ROLE_UPDATED",
        resourceType: "StaffUser",
        resourceId: existing._id.toString(),
        details: `Staff member ${existing.name} privilege role changed from ${previousView.role} to ${role}.`,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Staff user ${existing.name} updated`,
      user: toStaffUserView(existing),
    });
  } catch (error: any) {
    console.error("Error updating staff user:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update staff user" },
      { status: 500 }
    );
  }
}

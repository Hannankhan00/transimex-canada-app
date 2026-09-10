import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import { hashPassword, verifyToken } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getRolePreset, PermissionModule } from "@/lib/rbac";

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
    if (!actor) {
      return NextResponse.json({ error: "Invalid session token" }, { status: 401 });
    }

    await connectDB();
    const actorUser = await User.findById(actor.userId).lean<any>();
    if (!actorUser) {
      return NextResponse.json({ error: "User record not found" }, { status: 403 });
    }

    const canManageStaff =
      actorUser.role === "superadmin" ||
      (Array.isArray(actorUser.permissions) && actorUser.permissions.includes("staff"));

    if (!canManageStaff) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to modify staff accounts." },
        { status: 403 }
      );
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    // Protection: Non-superadmins cannot modify a superadmin
    if (targetUser.role === "superadmin" && actorUser.role !== "superadmin") {
      return NextResponse.json(
        { error: "Forbidden: Only Super Admins can modify Super Admin accounts." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { role, permissions, status, department, jobTitle, newPassword } = body;

    let auditNote = [];

    if (role && role !== targetUser.role) {
      auditNote.push(`Role changed from ${targetUser.role} to ${role}`);
      targetUser.role = role;
      if (!jobTitle) {
        const preset = getRolePreset(role);
        targetUser.jobTitle = preset.titleEn;
      }
    }

    if (Array.isArray(permissions)) {
      targetUser.permissions = permissions;
      auditNote.push(`Permissions updated to [${permissions.join(", ")}]`);
    }

    if (department && department !== targetUser.department) {
      targetUser.department = department;
    }

    if (jobTitle && jobTitle !== targetUser.jobTitle) {
      targetUser.jobTitle = jobTitle;
    }

    if (status && status !== targetUser.accountStatus) {
      // Prevent self-revoking
      if (id === actor.userId && status === "revoked") {
        return NextResponse.json(
          { error: "You cannot revoke access to your own active administrative account." },
          { status: 400 }
        );
      }
      targetUser.accountStatus = status as "active" | "pending" | "revoked";
      auditNote.push(`Account status updated to ${status}`);
      // Invalidate existing sessions immediately if revoked
      if (status === "revoked") {
        targetUser.tokenVersion = (targetUser.tokenVersion || 0) + 1;
      }
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: "New password must be at least 6 characters in length." },
          { status: 400 }
        );
      }
      targetUser.password = await hashPassword(newPassword);
      targetUser.tokenVersion = (targetUser.tokenVersion || 0) + 1;
      auditNote.push("Password reset by administrator");
    }

    await targetUser.save();

    await logAudit({
      actor,
      action: "STAFF_UPDATED",
      resourceType: "StaffUser",
      resourceId: targetUser._id.toString(),
      details: `Updated staff member ${targetUser.name} (${targetUser.email}): ${auditNote.join("; ") || "Metadata saved"}.`,
    });

    const preset = getRolePreset(targetUser.role);
    const activePermissions: PermissionModule[] =
      Array.isArray(targetUser.permissions) && targetUser.permissions.length > 0
        ? (targetUser.permissions as PermissionModule[])
        : preset.defaultPermissions;

    return NextResponse.json({
      success: true,
      message: `Staff member ${targetUser.name} updated successfully.`,
      staff: {
        id: targetUser._id.toString(),
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        jobTitle: targetUser.jobTitle,
        department: targetUser.department,
        permissions: activePermissions,
        status: targetUser.accountStatus,
        lastLogin: targetUser.lastLoginAt
          ? new Date(targetUser.lastLoginAt).toLocaleString("en-CA")
          : "Never",
        createdAt: targetUser.createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Error updating staff account:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update staff account" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    if (!actor) {
      return NextResponse.json({ error: "Invalid session token" }, { status: 401 });
    }

    await connectDB();
    const actorUser = await User.findById(actor.userId).lean<any>();
    if (!actorUser) {
      return NextResponse.json({ error: "User record not found" }, { status: 403 });
    }

    if (actorUser.role !== "superadmin") {
      return NextResponse.json(
        { error: "Forbidden: Only Super Admins can permanently delete staff accounts." },
        { status: 403 }
      );
    }

    if (id === actor.userId) {
      return NextResponse.json(
        { error: "Cannot delete your own administrative account." },
        { status: 400 }
      );
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    await User.findByIdAndDelete(id);

    await logAudit({
      actor,
      action: "STAFF_DELETED",
      resourceType: "StaffUser",
      resourceId: id,
      details: `Permanently removed staff account for ${targetUser.name} (${targetUser.email}).`,
    });

    return NextResponse.json({
      success: true,
      message: `Staff member ${targetUser.name} has been removed.`,
    });
  } catch (error: any) {
    console.error("Error deleting staff account:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete staff account" },
      { status: 500 }
    );
  }
}

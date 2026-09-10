import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import { hashPassword, verifyToken } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { ALL_STAFF_ROLES, getRolePreset, hasModulePermission, PermissionModule } from "@/lib/rbac";

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

    // Must be superadmin or have explicit staff permission
    const canManageStaff =
      actorUser.role === "superadmin" ||
      (Array.isArray(actorUser.permissions) && actorUser.permissions.includes("staff"));

    if (!canManageStaff) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to manage staff accounts." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("q")?.toLowerCase().trim() || "";
    const roleParam = searchParams.get("role")?.toLowerCase().trim() || "all";
    const statusParam = searchParams.get("status")?.toLowerCase().trim() || "all";

    const query: any = {
      role: { $in: ALL_STAFF_ROLES },
    };

    if (roleParam !== "all") {
      query.role = roleParam;
    }

    if (statusParam !== "all") {
      query.accountStatus = statusParam;
    }

    const staffUsers = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .lean<any[]>();

    let staff = staffUsers.map((u) => {
      const preset = getRolePreset(u.role);
      const activePermissions: PermissionModule[] =
        Array.isArray(u.permissions) && u.permissions.length > 0
          ? u.permissions
          : preset.defaultPermissions;

      return {
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: u.role || "dispatcher",
        jobTitle: u.jobTitle || preset.titleEn,
        department: u.department || "Logistics Operations",
        permissions: activePermissions,
        status: u.accountStatus || "active",
        lastLogin: u.lastLoginAt
          ? new Date(u.lastLoginAt).toLocaleString("en-CA")
          : "Never",
        createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : "",
      };
    });

    if (search) {
      staff = staff.filter(
        (s) =>
          s.name.toLowerCase().includes(search) ||
          s.email.toLowerCase().includes(search) ||
          s.department.toLowerCase().includes(search) ||
          s.jobTitle.toLowerCase().includes(search)
      );
    }

    const allStaffInDb = await User.find({ role: { $in: ALL_STAFF_ROLES } })
      .select("accountStatus role permissions")
      .lean<any[]>();

    const counts = {
      total: allStaffInDb.length,
      active: allStaffInDb.filter((u) => (u.accountStatus || "active") === "active").length,
      limited: allStaffInDb.filter((u) => u.role !== "superadmin").length,
      revoked: allStaffInDb.filter((u) => u.accountStatus === "revoked").length,
    };

    return NextResponse.json({
      success: true,
      staff,
      counts,
      currentUserId: actor.userId,
      isSuperAdmin: actorUser.role === "superadmin",
    });
  } catch (error: any) {
    console.error("Error loading staff:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load staff users" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
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

    const canManageStaff =
      actorUser.role === "superadmin" ||
      (Array.isArray(actorUser.permissions) && actorUser.permissions.includes("staff"));

    if (!canManageStaff) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to create staff accounts." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, email, password, role, department, jobTitle, permissions } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Full Name, Corporate Email, and Initial Password are required." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters in length." },
        { status: 400 }
      );
    }

    const emailLower = email.trim().toLowerCase();
    const existing = await User.findOne({ email: emailLower });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this corporate email address already exists." },
        { status: 409 }
      );
    }

    const assignedRole = (role || "dispatcher").toLowerCase();
    const preset = getRolePreset(assignedRole);
    const assignedPermissions: PermissionModule[] =
      Array.isArray(permissions) && permissions.length > 0
        ? permissions
        : preset.defaultPermissions;

    const hashedPassword = await hashPassword(password);

    const newStaff: any = await User.create({
      name: name.trim(),
      email: emailLower,
      password: hashedPassword,
      companyName: "Transimex Canada HQ",
      role: assignedRole,
      jobTitle: jobTitle?.trim() || preset.titleEn,
      department: department?.trim() || "Logistics Operations",
      permissions: assignedPermissions,
      accountStatus: "active",
      provider: "credentials",
      isVerified: true,
    });

    await logAudit({
      actor,
      action: "STAFF_CREATED",
      resourceType: "StaffUser",
      resourceId: newStaff._id.toString(),
      details: `Created new staff account for ${name} (${emailLower}) with role ${preset.titleEn} and ${assignedPermissions.length} module permissions.`,
    });

    return NextResponse.json({
      success: true,
      message: `Staff account for ${name} created successfully.`,
      staff: {
        id: newStaff._id.toString(),
        name: newStaff.name,
        email: newStaff.email,
        role: newStaff.role,
        jobTitle: newStaff.jobTitle,
        department: newStaff.department,
        permissions: newStaff.permissions,
        status: newStaff.accountStatus,
        lastLogin: "Never",
        createdAt: newStaff.createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Error creating staff account:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create staff account" },
      { status: 500 }
    );
  }
}

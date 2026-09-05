import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import { verifyToken } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { staffRoleToPermissionRole, toStaffUserView } from "@/lib/staffUsers";
import { sendStaffInviteEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const actor = verifyToken(token);
    if (!actor || actor.role !== "superadmin") {
      return NextResponse.json(
        { error: "Forbidden: Only Super Admin can invite new staff members" },
        { status: 403 }
      );
    }

    const { name, email, role, department } = await req.json();

    if (!name || !email || !role) {
      return NextResponse.json(
        { error: "Name, email, and staff role are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const emailLower = email.trim().toLowerCase();
    const existing = await User.findOne({ email: emailLower });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const inviteToken = "tx-" + crypto.randomBytes(20).toString("hex");

    const newStaff = await User.create({
      name: name.trim(),
      email: emailLower,
      companyName: "Transimex Canada",
      role: staffRoleToPermissionRole(role),
      jobTitle: role,
      department: department || "Logistics Operations",
      accountStatus: "pending",
      provider: "credentials",
      isVerified: true,
      resetToken: inviteToken,
      resetTokenExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    try {
      await sendStaffInviteEmail({
        to: emailLower,
        name: name.trim(),
        role,
        inviterName: actor.name,
        inviteToken,
      });
    } catch (mailErr) {
      console.warn("[Email Notification] Could not send staff invite email:", mailErr);
    }

    await logAudit({
      actor,
      action: "STAFF_INVITED",
      resourceType: "StaffUser",
      resourceId: newStaff._id.toString(),
      details: `Invited new staff member ${name} (${emailLower}) with role ${role}.`,
    });

    return NextResponse.json({
      success: true,
      message: `Staff invitation dispatched to ${emailLower}`,
      user: toStaffUserView(newStaff),
    });
  } catch (error: any) {
    console.error("Error inviting staff user:", error);
    return NextResponse.json(
      { error: error.message || "Failed to invite staff user" },
      { status: 500 }
    );
  }
}

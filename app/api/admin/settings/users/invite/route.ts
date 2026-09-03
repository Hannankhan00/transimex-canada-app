import { NextResponse } from "next/server";
import { inviteStaffUser, addAuditLogEntry, StaffRole } from "@/lib/mockData";
import { sendStaffInviteEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, role, department, inviterName } = body;

    if (!name || !email || !role) {
      return NextResponse.json(
        { error: "Name, email, and staff role are required" },
        { status: 400 }
      );
    }

    const newStaff = inviteStaffUser(
      name.trim(),
      email.trim().toLowerCase(),
      role as StaffRole,
      department || "Logistics Operations"
    );

    const inviteToken = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Dispatch email invitation
    try {
      await sendStaffInviteEmail({
        to: email.trim().toLowerCase(),
        name: name.trim(),
        role: role as string,
        inviterName: inviterName || "Jean-Philippe Tremblay (Super Admin)",
        inviteToken,
      });
    } catch (mailErr) {
      console.warn("[Email Notification] Could not send staff invite email:", mailErr);
    }

    // Record in immutable audit log
    addAuditLogEntry(
      inviterName || "Jean-Philippe Tremblay",
      "jptremblay@transimex.ca",
      "Super Admin",
      "STAFF_INVITED",
      "StaffUser",
      newStaff.id,
      `Invited new staff member ${name} (${email}) with role ${role}.`
    );

    return NextResponse.json({
      success: true,
      message: `Staff invitation dispatched to ${email}`,
      user: newStaff,
    });
  } catch (error: any) {
    console.error("Error inviting staff user:", error);
    return NextResponse.json(
      { error: error.message || "Failed to invite staff user" },
      { status: 500 }
    );
  }
}

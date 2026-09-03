import { NextResponse } from "next/server";
import { updateStaffUser, getStoredStaffUsers, addAuditLogEntry } from "@/lib/mockData";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { role, status, department } = body;

    const staffList = getStoredStaffUsers();
    const existing = staffList.find((s) => s.id === id);

    if (!existing) {
      return NextResponse.json({ error: "Staff user not found" }, { status: 404 });
    }

    const updates: any = {};
    if (role) updates.role = role;
    if (status) updates.status = status;
    if (department) updates.department = department;

    const updated = updateStaffUser(id, updates);

    // Audit log
    if (status && status !== existing.status) {
      addAuditLogEntry(
        "Jean-Philippe Tremblay",
        "jptremblay@transimex.ca",
        "Super Admin",
        status === "Revoked" ? "ACCESS_REVOKED" : "STATUS_UPDATE",
        "StaffUser",
        existing.id,
        `Staff member ${existing.name} access status changed from ${existing.status} to ${status}.`
      );
    } else if (role && role !== existing.role) {
      addAuditLogEntry(
        "Jean-Philippe Tremblay",
        "jptremblay@transimex.ca",
        "Super Admin",
        "STATUS_UPDATE",
        "StaffUser",
        existing.id,
        `Staff member ${existing.name} privilege role elevated/changed from ${existing.role} to ${role}.`
      );
    }

    return NextResponse.json({
      success: true,
      message: `Staff user ${existing.name} updated`,
      user: updated,
    });
  } catch (error: any) {
    console.error("Error updating staff user:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update staff user" },
      { status: 500 }
    );
  }
}

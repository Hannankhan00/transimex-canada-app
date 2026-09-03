import { NextResponse } from "next/server";
import { getStoredStaffUsers } from "@/lib/mockData";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");
    const status = searchParams.get("status");
    const search = searchParams.get("q")?.toLowerCase() || "";

    let staff = getStoredStaffUsers();

    if (role && role !== "all") {
      staff = staff.filter((s) => s.role.toLowerCase() === role.toLowerCase());
    }

    if (status && status !== "all") {
      staff = staff.filter((s) => s.status.toLowerCase() === status.toLowerCase());
    }

    if (search) {
      staff = staff.filter(
        (s) =>
          s.name.toLowerCase().includes(search) ||
          s.email.toLowerCase().includes(search) ||
          s.department.toLowerCase().includes(search) ||
          s.role.toLowerCase().includes(search)
      );
    }

    const all = getStoredStaffUsers();
    const counts = {
      total: all.length,
      active: all.filter((s) => s.status === "Active").length,
      pending: all.filter((s) => s.status === "Pending").length,
      revoked: all.filter((s) => s.status === "Revoked").length,
    };

    return NextResponse.json({
      success: true,
      staff,
      counts,
    });
  } catch (error: any) {
    console.error("Error fetching staff users:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch staff users" },
      { status: 500 }
    );
  }
}

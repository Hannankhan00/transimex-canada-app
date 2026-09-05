import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import { verifyToken } from "@/lib/auth";
import { STAFF_ROLES, toStaffUserView } from "@/lib/staffUsers";

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const payload = verifyToken(token);
    if (!payload || (payload.role !== "superadmin" && payload.role !== "admin")) {
      return NextResponse.json(
        { error: "Forbidden: Only Super Admin can manage staff access" },
        { status: 403 }
      );
    }

    await connectDB();

    const roleParam = new URL(req.url).searchParams.get("role");
    const statusParam = new URL(req.url).searchParams.get("status");
    const search = new URL(req.url).searchParams.get("q")?.toLowerCase() || "";

    const users = await User.find({
      role: { $in: ["superadmin", "admin", "subadmin", "dispatcher"] },
    })
      .select("-password")
      .sort({ createdAt: -1 });

    let staff = users.map(toStaffUserView);

    if (roleParam && roleParam !== "all") {
      staff = staff.filter((s) => s.role.toLowerCase() === roleParam.toLowerCase());
    }
    if (statusParam && statusParam !== "all") {
      staff = staff.filter((s) => s.status.toLowerCase() === statusParam.toLowerCase());
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

    const counts = {
      total: users.length,
      active: users.filter((u) => (u.accountStatus || "active") === "active").length,
      pending: users.filter((u) => u.accountStatus === "pending").length,
      revoked: users.filter((u) => u.accountStatus === "revoked").length,
    };

    return NextResponse.json({ success: true, staff, counts, staffRoles: STAFF_ROLES });
  } catch (error: any) {
    console.error("Error fetching staff users:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch staff users" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import { hashPassword, verifyToken } from "@/lib/auth";

// GET all admin & sub-admin accounts
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || (payload.role !== "superadmin" && payload.role !== "admin")) {
      return NextResponse.json(
        { error: "Forbidden: Only Super Admin can manage admin staff" },
        { status: 403 }
      );
    }

    await connectDB();

    const admins = await User.find({
      role: { $in: ["superadmin", "admin", "subadmin", "dispatcher"] },
    })
      .select("-password")
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, admins });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST create a new sub-admin account
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== "superadmin") {
      return NextResponse.json(
        { error: "Forbidden: Only Super Admin can create new sub-admins" },
        { status: 403 }
      );
    }

    const { name, email, password, role, companyName } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    await connectDB();

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);
    const newAdmin = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      companyName: companyName || "Transimex Operations HQ",
      role: role === "admin" ? "admin" : "subadmin",
      provider: "credentials",
    });

    return NextResponse.json({
      success: true,
      message: `Sub-Admin ${name} created successfully`,
      admin: {
        id: newAdmin._id.toString(),
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role,
        companyName: newAdmin.companyName,
        createdAt: newAdmin.createdAt,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    try {
      await connectDB();
      const dbUser = await User.findById(payload.userId).lean<any>();
      if (dbUser) {
        return NextResponse.json({
          user: {
            userId: dbUser._id.toString(),
            email: dbUser.email,
            name: dbUser.name,
            companyName: dbUser.companyName,
            role: dbUser.role || "client",
            phone: dbUser.phone || "",
            address: dbUser.address || "",
            industry: dbUser.industry || "",
            city: dbUser.city || "",
            province: dbUser.province || "",
            jobTitle: dbUser.jobTitle || "",
            department: dbUser.department || "",
          },
        });
      }
    } catch (dbErr) {
      console.error("DB error fetching current user, falling back to token payload:", dbErr);
    }

    return NextResponse.json({ user: payload });
  } catch (error: any) {
    return NextResponse.json({ user: null, error: error.message }, { status: 500 });
  }
}

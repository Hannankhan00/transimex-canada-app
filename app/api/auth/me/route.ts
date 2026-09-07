import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";

export async function GET() {
  try {
    const payload = await getCurrentUser();
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

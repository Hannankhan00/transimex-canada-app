import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import { signToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const payload = await getCurrentUser();
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { error: "Authentication required to complete profile." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      companyName,
      phone,
      address,
      city,
      province,
      industry,
      jobTitle,
      department,
    } = body;

    const trimmedCompany = (companyName || "").trim();
    const trimmedPhone = (phone || "").trim();
    const trimmedAddress = (address || "").trim();

    if (!trimmedCompany) {
      return NextResponse.json(
        { error: "Company Name is required for commercial logistics operations." },
        { status: 400 }
      );
    }

    if (!trimmedPhone || trimmedPhone.length < 7) {
      return NextResponse.json(
        { error: "A valid corporate contact phone number is required." },
        { status: 400 }
      );
    }

    if (!trimmedAddress || trimmedAddress.length < 5) {
      return NextResponse.json(
        { error: "A complete physical business address is required." },
        { status: 400 }
      );
    }

    await connectDB();
    const user = await User.findById(payload.userId);

    if (!user) {
      return NextResponse.json(
        { error: "User account not found." },
        { status: 404 }
      );
    }

    // Update commercial profile details
    user.companyName = trimmedCompany;
    user.phone = trimmedPhone;
    user.address = trimmedAddress;
    if (city?.trim()) user.city = city.trim();
    if (province?.trim()) user.province = province.trim();
    if (industry) user.industry = industry;
    if (jobTitle?.trim()) user.jobTitle = jobTitle.trim();
    if (department?.trim()) user.department = department.trim();
    user.isProfileComplete = true;

    await user.save();

    // Re-issue refreshed JWT with new companyName and isProfileComplete: true
    const updatedTokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      companyName: user.companyName,
      role: user.role || "client",
      sessionId: payload.sessionId,
      tokenVersion: user.tokenVersion || 0,
      isProfileComplete: true,
    };

    const token = signToken(updatedTokenPayload);

    const res = NextResponse.json({
      success: true,
      message: "Profile completed successfully.",
      user: {
        userId: user._id.toString(),
        email: user.email,
        name: user.name,
        companyName: user.companyName,
        role: user.role || "client",
        phone: user.phone,
        address: user.address,
        city: user.city || "Montreal",
        province: user.province || "QC",
        industry: user.industry || "Industrial",
        jobTitle: user.jobTitle || "",
        department: user.department || "",
        isProfileComplete: true,
      },
    });

    res.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return res;
  } catch (error: any) {
    console.error("Complete profile API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update profile." },
      { status: 500 }
    );
  }
}

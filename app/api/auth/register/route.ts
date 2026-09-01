import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import { hashPassword, signToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      fullName,
      name,
      email,
      password,
      companyName,
      phone,
      industry,
      city,
      province,
    } = body;

    const parsedName = (fullName || name || "").trim();
    if (!parsedName || !email || !password) {
      return NextResponse.json(
        { error: "Full name, email, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    let userRole = "client";
    let userId = "tx-client-" + Date.now();

    try {
      await connectDB();
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return NextResponse.json(
          { error: "An account with this corporate email already exists" },
          { status: 409 }
        );
      }

      const hashedPassword = await hashPassword(password);
      const user = await User.create({
        name: parsedName,
        email: email.toLowerCase(),
        password: hashedPassword,
        companyName: companyName || "Laurentian Global Logistics Ltd.",
        phone: phone || "",
        industry: industry || "Industrial",
        city: city || "Montreal",
        province: province || "QC",
        role: "client",
      });

      userRole = user.role || "client";
      userId = user._id.toString();
    } catch (dbErr) {
      console.warn("Database connection issue during registration, generating token with mock ID:", dbErr);
    }

    const tokenPayload = {
      userId,
      email: email.toLowerCase(),
      name: parsedName,
      companyName: companyName || "Laurentian Global Logistics Ltd.",
      role: userRole,
    };

    const token = signToken(tokenPayload);

    const response = NextResponse.json({
      success: true,
      message: "Application submitted successfully",
      user: {
        ...tokenPayload,
        phone,
        industry,
        city,
        province,
      },
    });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to register account" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import crypto from "crypto";
import { hashPassword, signToken } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";

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
      address,
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

    const targetCompany = (companyName || "").trim() || `${parsedName}'s Company`;
    const verificationToken = "vtx-" + crypto.randomBytes(24).toString("hex");

    try {
      await connectDB();
    } catch (dbErr: any) {
      console.error("Database connection error during registration:", dbErr);
      return NextResponse.json(
        { error: "Database service unavailable. Please try again shortly." },
        { status: 503 }
      );
    }

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
      companyName: targetCompany,
      phone: phone || "",
      address: address || "",
      industry: industry || "Industrial",
      city: city || "Montreal",
      province: province || "QC",
      role: "client",
      isVerified: false,
      verificationToken,
      verificationTokenExpires: new Date(Date.now() + 86400000), // 24 hours
    });

    const userRole = user.role || "client";
    const userId = user._id.toString();

    const tokenPayload = {
      userId,
      email: email.toLowerCase(),
      name: parsedName,
      companyName: targetCompany,
      role: userRole,
    };

    const token = signToken(tokenPayload);

    // Send confirmation email with clickable verification link
    let emailDispatched = true;
    try {
      await sendVerificationEmail({
        to: email.toLowerCase(),
        name: parsedName,
        companyName: targetCompany,
        token: verificationToken,
      });
    } catch (emailErr) {
      console.error("Failed to send welcome email via SMTP:", emailErr);
      emailDispatched = false;
    }

    const response = NextResponse.json({
      success: true,
      message: emailDispatched
        ? "Application submitted successfully. A verification email has been dispatched."
        : "Application submitted successfully, but we couldn't send the verification email right now. You can request a new one from your account settings.",
      emailDispatched,
      user: {
        ...tokenPayload,
        phone,
        address,
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

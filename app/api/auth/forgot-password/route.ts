import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email address is required" },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase().trim();
    const resetToken = "tx-" + crypto.randomBytes(20).toString("hex");

    try {
      await connectDB();
      const user = await User.findOne({ email: emailLower });
      if (user) {
        user.resetToken = resetToken;
        user.resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour
        await user.save();
      }
    } catch (dbErr) {
      console.warn("Database unavailable during forgot-password, using simulated token:", dbErr);
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists for this email, a secure password recovery link has been generated.",
      mockResetToken: resetToken,
    });
  } catch (err: any) {
    console.error("Forgot password error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process recovery request" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/lib/email";

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

    try {
      await connectDB();
      const user = await User.findOne({ email: emailLower });
      if (user) {
        const resetToken = "tx-" + crypto.randomBytes(20).toString("hex");
        user.resetToken = resetToken;
        user.resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour
        await user.save();

        sendPasswordResetEmail({
          to: emailLower,
          name: user.name,
          token: resetToken,
        }).catch((emailErr) => {
          console.error("Failed to send password reset email via SMTP:", emailErr);
        });
      }
    } catch (dbErr) {
      console.error("Database error during forgot-password:", dbErr);
    }

    // Always return the same neutral response, whether or not the account exists,
    // so this endpoint can't be used to enumerate registered emails.
    return NextResponse.json({
      success: true,
      message: "If an account exists for this email, a secure password recovery link has been sent to it.",
    });
  } catch (err: any) {
    console.error("Forgot password error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process recovery request" },
      { status: 500 }
    );
  }
}

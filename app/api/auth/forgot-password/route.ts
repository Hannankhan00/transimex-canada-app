import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/lib/email";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

// Neutral message — same wording whether the email exists or not (OWASP best practice)
const NEUTRAL_RESPONSE = {
  success: true,
  message:
    "If an account with that email exists, a password recovery link has been sent.",
};

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const { isRateLimited, retryAfterSeconds } = checkRateLimit("auth:forgot-password", ip, {
      windowMs: 15 * 60 * 1000,
      max: 5,
    });
    if (isRateLimited) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before trying again.", retryAfterSeconds },
        { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
      );
    }

    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email address is required" },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase().trim();

    await connectDB();
    const user = await User.findOne({ email: emailLower });

    // Always return the neutral 200 response — do NOT reveal whether the
    // email is registered. Returning a 404 lets attackers enumerate accounts.
    if (!user) {
      return NextResponse.json(NEUTRAL_RESPONSE);
    }

    const resetToken = "tx-" + crypto.randomBytes(20).toString("hex");
    user.resetToken = resetToken;
    user.resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    try {
      await sendPasswordResetEmail({
        to: emailLower,
        name: user.name,
        token: resetToken,
      });
    } catch (emailErr) {
      console.error("Failed to send password reset email:", emailErr);
      // Still return neutral response — do not expose the failure reason
    }

    return NextResponse.json(NEUTRAL_RESPONSE);
  } catch (err: any) {
    console.error("Forgot password error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process recovery request" },
      { status: 500 }
    );
  }
}

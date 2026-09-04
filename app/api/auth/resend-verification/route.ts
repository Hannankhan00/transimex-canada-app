import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import crypto from "crypto";
import { sendVerificationEmail } from "@/lib/email";

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

      if (user && !user.isVerified) {
        const verificationToken = "vtx-" + crypto.randomBytes(24).toString("hex");
        user.verificationToken = verificationToken;
        user.verificationTokenExpires = new Date(Date.now() + 86400000); // 24 hours
        await user.save();

        await sendVerificationEmail({
          to: emailLower,
          name: user.name,
          companyName: user.companyName,
          token: verificationToken,
        }).catch((emailErr) => {
          console.error("Failed to resend verification email via SMTP:", emailErr);
        });
      }
    } catch (dbErr) {
      console.error("Database error during resend-verification:", dbErr);
    }

    // Always return the same neutral response, whether or not the account exists
    // or was already verified, so this endpoint can't be used to enumerate emails.
    return NextResponse.json({
      success: true,
      message: "If an unverified account exists for this email, a new verification link has been sent.",
    });
  } catch (err: any) {
    console.error("Resend verification error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to resend verification email" },
      { status: 500 }
    );
  }
}

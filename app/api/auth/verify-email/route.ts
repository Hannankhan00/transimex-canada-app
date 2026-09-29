import { NextResponse, after } from "next/server";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json(
        { error: "Verification token is required" },
        { status: 400 }
      );
    }

    await connectDB();
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json(
        { error: "This verification link is invalid or has expired. Please request a new one." },
        { status: 400 }
      );
    }

    const wasVerified = user.isVerified;

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    if (!wasVerified) {
      const { email: to, name, companyName } = user;
      after(() =>
        sendWelcomeEmail({ to, name, companyName }).catch((err) =>
          console.warn("[Email] Could not send welcome email:", err)
        )
      );
    }

    return NextResponse.json({
      success: true,
      message: "Email address successfully verified! Your account is active.",
    });
  } catch (err: any) {
    console.error("Email verification error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to verify email" },
      { status: 500 }
    );
  }
}

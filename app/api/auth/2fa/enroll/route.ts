import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import { buildEnrollment, encryptSecret, generateTotpSecret, verifyChallenge } from "@/lib/twoFactor";
import { isStaffRole } from "@/lib/rbac";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

/** Mandatory enrolment for staff, step 1: returns a fresh secret + QR code. Needs the challenge from the password step. */
export async function POST(req: Request) {
  try {
    const { challengeToken } = await req.json();
    const challenge = verifyChallenge(challengeToken, "2fa-setup");
    if (!challenge) {
      return NextResponse.json(
        { error: "Your sign-in session expired. Please enter your password again.", code: "CHALLENGE_EXPIRED" },
        { status: 401 }
      );
    }
    const rl = checkRateLimit("auth:2fa:enroll", getClientIp(req), { windowMs: 15 * 60 * 1000, max: 20 });
    if (rl.isRateLimited) {
      return NextResponse.json({ error: "Too many attempts. Please wait." }, { status: 429 });
    }

    await connectDB();
    const user = await User.findById(challenge.userId);
    if (!user || user.twoFactorEnabled || !isStaffRole(user.role)) {
      return NextResponse.json({ error: "Two-factor setup is not available for this account." }, { status: 400 });
    }

    const secret = generateTotpSecret();
    await User.updateOne({ _id: user._id }, { $set: { twoFactorPendingSecret: encryptSecret(secret) } });
    return NextResponse.json({ success: true, ...(await buildEnrollment(secret, user.email)) });
  } catch (error: any) {
    console.error("2FA enroll error:", error);
    return NextResponse.json({ error: "Failed to start two-factor setup" }, { status: 500 });
  }
}

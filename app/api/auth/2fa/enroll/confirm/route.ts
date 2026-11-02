import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import { completeLogin } from "@/lib/authSession";
import { checkRateLimit } from "@/lib/rateLimit";
import { decryptSecret, generateRecoveryCodes, verifyChallenge, verifyTotp } from "@/lib/twoFactor";
import { isStaffRole } from "@/lib/rbac";
import { TWO_FA_SELECT } from "@/lib/twoFactorService";

/** Mandatory enrolment for staff, step 2: prove the app works with a code, switch 2FA on, sign in, show recovery codes. */
export async function POST(req: Request) {
  try {
    const { challengeToken, code } = await req.json();
    const challenge = verifyChallenge(challengeToken, "2fa-setup");
    if (!challenge) {
      return NextResponse.json(
        { error: "Your sign-in session expired. Please enter your password again.", code: "CHALLENGE_EXPIRED" },
        { status: 401 }
      );
    }
    const rl = checkRateLimit("auth:2fa:user", challenge.userId, { windowMs: 15 * 60 * 1000, max: 8 });
    if (rl.isRateLimited) {
      return NextResponse.json({ error: "Too many attempts. Please wait before trying again." }, { status: 429 });
    }

    await connectDB();
    const user = await User.findById(challenge.userId).select(TWO_FA_SELECT);
    if (!user || user.twoFactorEnabled || !isStaffRole(user.role) || !user.twoFactorPendingSecret) {
      return NextResponse.json({ error: "Start the setup again." }, { status: 400 });
    }
    if (user.accountStatus === "revoked" || !user.isVerified) {
      return NextResponse.json({ error: "Account unavailable." }, { status: 403 });
    }

    const step = verifyTotp(decryptSecret(user.twoFactorPendingSecret), String(code || ""));
    if (step === null) {
      return NextResponse.json({ error: "Invalid or expired code." }, { status: 401 });
    }

    const { plain, hashed } = generateRecoveryCodes();
    user.twoFactorSecret = user.twoFactorPendingSecret;
    user.twoFactorPendingSecret = undefined;
    user.twoFactorRecoveryCodes = hashed;
    user.twoFactorLastStep = step;
    user.twoFactorEnabled = true;
    user.twoFactorEnabledAt = new Date();
    await user.save();

    return await completeLogin(user, req, challenge.rememberMe, { recoveryCodes: plain });
  } catch (error: any) {
    console.error("2FA enroll confirm error:", error);
    return NextResponse.json({ error: "Failed to enable two-factor authentication" }, { status: 500 });
  }
}

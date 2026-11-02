import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import { completeLogin } from "@/lib/authSession";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { verifyChallenge } from "@/lib/twoFactor";
import { checkSecondFactor, TWO_FA_SELECT } from "@/lib/twoFactorService";

/** Second step of a login for users who have 2FA on: challenge token + authenticator or recovery code. */
export async function POST(req: Request) {
  try {
    const { challengeToken, code } = await req.json();

    const challenge = verifyChallenge(challengeToken, "2fa-login");
    if (!challenge) {
      return NextResponse.json(
        { error: "Your sign-in session expired. Please enter your password again.", code: "CHALLENGE_EXPIRED" },
        { status: 401 }
      );
    }

    // Limit guesses per account and per IP (a 6-digit code is only safe with throttling).
    const limit = { windowMs: 15 * 60 * 1000, max: 8 };
    const byUser = checkRateLimit("auth:2fa:user", challenge.userId, limit);
    const byIp = checkRateLimit("auth:2fa:ip", getClientIp(req), { ...limit, max: 20 });
    if (byUser.isRateLimited || byIp.isRateLimited) {
      const retryAfterSeconds = Math.max(byUser.retryAfterSeconds, byIp.retryAfterSeconds);
      return NextResponse.json(
        { error: "Too many attempts. Please wait before trying again.", retryAfterSeconds },
        { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
      );
    }

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Enter your verification code." }, { status: 400 });
    }

    await connectDB();
    const user = await User.findById(challenge.userId).select(TWO_FA_SELECT);
    if (!user || user.accountStatus === "revoked" || !user.isVerified) {
      return NextResponse.json({ error: "Account unavailable." }, { status: 403 });
    }

    const result = await checkSecondFactor(user, code);
    if (!result.ok) {
      return NextResponse.json({ error: "Invalid or expired code." }, { status: 401 });
    }

    return await completeLogin(user, req, challenge.rememberMe, {
      usedRecoveryCode: !!result.usedRecoveryCode,
      recoveryCodesLeft: result.recoveryLeft,
    });
  } catch (error: any) {
    console.error("2FA verify error:", error);
    return NextResponse.json({ error: "Failed to verify code" }, { status: 500 });
  }
}

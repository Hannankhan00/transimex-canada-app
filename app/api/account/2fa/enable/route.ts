import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/session";
import { checkRateLimit } from "@/lib/rateLimit";
import { decryptSecret, generateRecoveryCodes, verifyTotp } from "@/lib/twoFactor";
import { TWO_FA_SELECT } from "@/lib/twoFactorService";

/** Step 2: confirm the first code from the authenticator app, switch 2FA on and return the one-time recovery codes. */
export async function POST(req: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { code } = await req.json();
    const rl = checkRateLimit("account:2fa:enable", currentUser.userId, { windowMs: 15 * 60 * 1000, max: 8 });
    if (rl.isRateLimited) {
      return NextResponse.json({ error: "Too many attempts. Please wait before trying again." }, { status: 429 });
    }

    await connectDB();
    const user = await User.findById(currentUser.userId).select(TWO_FA_SELECT);
    if (!user || user.twoFactorEnabled || !user.twoFactorPendingSecret) {
      return NextResponse.json({ error: "Start the setup again." }, { status: 400 });
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

    return NextResponse.json({ success: true, recoveryCodes: plain });
  } catch (error: any) {
    console.error("2FA enable error:", error);
    return NextResponse.json({ error: "Failed to enable two-factor authentication" }, { status: 500 });
  }
}

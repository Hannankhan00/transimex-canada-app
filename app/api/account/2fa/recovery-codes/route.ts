import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/session";
import { comparePassword } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { generateRecoveryCodes } from "@/lib/twoFactor";
import { checkSecondFactor, TWO_FA_SELECT } from "@/lib/twoFactorService";

/** Replace all recovery codes with a fresh set. Needs the password and a current authenticator code. */
export async function POST(req: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { password, code } = await req.json();
    const rl = checkRateLimit("account:2fa:recovery", currentUser.userId, { windowMs: 15 * 60 * 1000, max: 8 });
    if (rl.isRateLimited) {
      return NextResponse.json({ error: "Too many attempts. Please wait before trying again." }, { status: 429 });
    }

    await connectDB();
    const user = await User.findById(currentUser.userId).select(`+password ${TWO_FA_SELECT}`);
    if (!user || !user.twoFactorEnabled) {
      return NextResponse.json({ error: "Two-factor authentication is not on." }, { status: 400 });
    }
    if (!password || !user.password || !(await comparePassword(String(password), user.password))) {
      return NextResponse.json({ error: "Password is incorrect." }, { status: 401 });
    }
    if (!(await checkSecondFactor(user, String(code || ""))).ok) {
      return NextResponse.json({ error: "Invalid or expired code." }, { status: 401 });
    }

    const { plain, hashed } = generateRecoveryCodes();
    await User.updateOne({ _id: user._id }, { $set: { twoFactorRecoveryCodes: hashed } });
    return NextResponse.json({ success: true, recoveryCodes: plain });
  } catch (error: any) {
    console.error("2FA recovery codes error:", error);
    return NextResponse.json({ error: "Failed to generate recovery codes" }, { status: 500 });
  }
}

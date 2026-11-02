import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/session";
import { comparePassword } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { isStaffRole } from "@/lib/rbac";
import { checkSecondFactor, TWO_FA_SELECT } from "@/lib/twoFactorService";

/** Turn 2FA off. Needs the password and a current code. Staff can not turn it off (it is mandatory for them). */
export async function POST(req: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { password, code } = await req.json();
    const rl = checkRateLimit("account:2fa:disable", currentUser.userId, { windowMs: 15 * 60 * 1000, max: 8 });
    if (rl.isRateLimited) {
      return NextResponse.json({ error: "Too many attempts. Please wait before trying again." }, { status: 429 });
    }

    await connectDB();
    const user = await User.findById(currentUser.userId).select(`+password ${TWO_FA_SELECT}`);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (isStaffRole(user.role)) {
      return NextResponse.json(
        { error: "Two-factor authentication is required for staff accounts and can not be turned off." },
        { status: 403 }
      );
    }
    if (!user.twoFactorEnabled) {
      return NextResponse.json({ error: "Two-factor authentication is not on." }, { status: 400 });
    }
    if (!password || !user.password || !(await comparePassword(String(password), user.password))) {
      return NextResponse.json({ error: "Password is incorrect." }, { status: 401 });
    }
    if (!(await checkSecondFactor(user, String(code || ""))).ok) {
      return NextResponse.json({ error: "Invalid or expired code." }, { status: 401 });
    }

    await User.updateOne(
      { _id: user._id },
      {
        $set: { twoFactorEnabled: false, twoFactorRecoveryCodes: [] },
        $unset: { twoFactorSecret: 1, twoFactorPendingSecret: 1, twoFactorLastStep: 1, twoFactorEnabledAt: 1 },
      }
    );
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("2FA disable error:", error);
    return NextResponse.json({ error: "Failed to turn off two-factor authentication" }, { status: 500 });
  }
}

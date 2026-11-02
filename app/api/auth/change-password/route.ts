import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import ExpressAccount from "@/models/ExpressAccount";
import { comparePassword, hashPassword, signToken } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { PASSWORD_PROBLEM_TEXT, checkNewPassword } from "@/lib/passwordRules";

/**
 * Replaces a temporary password (one a partner set for their customer) with one the person chooses. This is the only
 * request that works for someone who still has a temporary password. It checks the temporary password again, stores
 * the new one, clears the flag, and ends every other session that was opened with the temporary password.
 */
export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const { isRateLimited, retryAfterSeconds } = checkRateLimit("auth:change-password", ip, { windowMs: 15 * 60 * 1000, max: 10 });
    if (isRateLimited) {
      return NextResponse.json({ error: "Too many attempts. Please wait before trying again.", retryAfterSeconds }, { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } });
    }

    const current = await getCurrentUser({ allowPasswordChange: true });
    if (!current) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";
    if (!currentPassword || !newPassword) return NextResponse.json({ error: "Enter your temporary password and a new password.", code: "missing" }, { status: 400 });

    await connectDB();
    const user = await User.findById(current.userId).select("+password");
    if (!user || !user.password) return NextResponse.json({ error: "Password login is not enabled for this account" }, { status: 400 });
    // Only for accounts that were given a temporary password. Everyone else changes theirs in Account settings.
    if (!user.mustChangePassword) return NextResponse.json({ error: "Your password does not need to be changed here.", code: "not_required" }, { status: 409 });

    if (!(await comparePassword(currentPassword, user.password))) {
      return NextResponse.json({ error: "The temporary password is not correct.", code: "wrong_current" }, { status: 401 });
    }

    const problem = checkNewPassword({ current: currentPassword, next: newPassword, email: user.email });
    if (problem) return NextResponse.json({ error: PASSWORD_PROBLEM_TEXT[problem].en, code: problem }, { status: 422 });

    user.password = await hashPassword(newPassword);
    user.mustChangePassword = false;
    // Every session opened with the temporary password (including the partner's, if they signed in with it) ends here.
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    const account = await ExpressAccount.findOne({ userId: String(user._id) }).select("type").lean<{ type?: string }>();
    const token = signToken({
      userId: String(user._id),
      email: user.email,
      name: user.name,
      companyName: user.companyName,
      role: user.role || "client",
      permissions: user.permissions || [],
      sessionId: current.sessionId,
      tokenVersion: user.tokenVersion,
    });
    const res = NextResponse.json({ success: true, redirectTo: account?.type === "customer" ? "/express" : "/dashboard" });
    res.cookies.set("token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 60 * 60 * 24 * 7, path: "/" });
    return res;
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json({ error: "Failed to change the password" }, { status: 500 });
  }
}

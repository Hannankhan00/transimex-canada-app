import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/session";
import { comparePassword, hashPassword } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

/** Is a Google account connected, and does the account have a password to fall back on? */
export async function GET() {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  await connectDB();
  const user = await User.findById(current.userId).select("+password googleId").lean<any>();
  if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  return NextResponse.json({ connected: !!user.googleId, hasPassword: !!user.password });
}

/**
 * Disconnect Google. The account must be able to sign in some other way, so:
 * - with a password: the current password must be confirmed;
 * - without one (created through Google): a new password (8+ characters) is set in the same step.
 */
export async function DELETE(req: Request) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const limit = checkRateLimit("account:google-disconnect", getClientIp(req), { windowMs: 15 * 60 * 1000, max: 10 });
  if (limit.isRateLimited) {
    return NextResponse.json({ error: "Too many attempts. Please wait before trying again." }, { status: 429 });
  }

  const { password, newPassword } = await req.json().catch(() => ({}));

  await connectDB();
  const user = await User.findById(current.userId).select("+password");
  if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  if (!user.googleId) return NextResponse.json({ error: "No Google account is connected." }, { status: 400 });

  if (user.password) {
    if (!password || !(await comparePassword(String(password), user.password))) {
      return NextResponse.json({ error: "Your password is incorrect." }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }
  } else {
    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json(
        { error: "Set a password of at least 8 characters first, so you can still sign in.", code: "PASSWORD_REQUIRED" },
        { status: 400 }
      );
    }
    user.password = await hashPassword(newPassword);
  }

  user.googleId = undefined;
  user.googleSignInDisabled = true;
  user.provider = "credentials";
  await user.save();

  return NextResponse.json({ success: true });
}

import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/session";
import { isStaffRole } from "@/lib/rbac";

/** Current 2FA status for the signed-in user. */
export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  await connectDB();
  const user = await User.findById(currentUser.userId).select("+password +twoFactorRecoveryCodes").lean<any>();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({
    success: true,
    enabled: !!user.twoFactorEnabled,
    enabledAt: user.twoFactorEnabledAt || null,
    mandatory: isStaffRole(user.role),
    // Google-only accounts have no password, so they can't use 2FA (Google sign-in skips it).
    available: !!user.password,
    recoveryCodesRemaining: (user.twoFactorRecoveryCodes || []).length,
  });
}

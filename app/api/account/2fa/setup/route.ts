import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/session";
import { buildEnrollment, encryptSecret, generateTotpSecret } from "@/lib/twoFactor";

/** Step 1 of turning 2FA on from account settings: returns a new secret + QR code (not active until confirmed). */
export async function POST() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    await connectDB();
    const user = await User.findById(currentUser.userId).select("+password");
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (!user.password) {
      return NextResponse.json(
        { error: "Two-factor authentication is only available for accounts that sign in with a password." },
        { status: 400 }
      );
    }
    if (user.twoFactorEnabled) {
      return NextResponse.json({ error: "Two-factor authentication is already on." }, { status: 400 });
    }

    const secret = generateTotpSecret();
    await User.updateOne({ _id: user._id }, { $set: { twoFactorPendingSecret: encryptSecret(secret) } });
    return NextResponse.json({ success: true, ...(await buildEnrollment(secret, user.email)) });
  } catch (error: any) {
    console.error("2FA setup error:", error);
    return NextResponse.json({ error: "Failed to start two-factor setup" }, { status: 500 });
  }
}

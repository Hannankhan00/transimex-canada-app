import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import connectDB from "@/lib/mongoose";
import ExpressAccount from "@/models/ExpressAccount";
import { isStaffRole } from "@/lib/rbac";
import { isExpressEnabled } from "@/lib/express/config";
import { getPaymentsMode } from "@/lib/express/payments/config";

/**
 * What the signed-in client portal needs to know: whether Express is on, whether online
 * payment is on, and whether this user already has an Express account (so the portal button
 * either opens the application popup or goes straight to the Express portal).
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let payments: "off" | "mock" | "stripe" = "off";
  try {
    payments = getPaymentsMode();
  } catch {
    payments = "off";
  }

  const enabled = isExpressEnabled();
  let account: { status: string; type: string } | null = null;
  if (enabled && !isStaffRole(user.role)) {
    try {
      await connectDB();
      const doc = await ExpressAccount.findOne({ userId: user.userId }).select("status type").lean();
      if (doc) account = { status: doc.status, type: doc.type };
    } catch (error) {
      console.error("Express status: account lookup failed:", error);
    }
  }

  return NextResponse.json({ success: true, enabled, payments, account });
}

import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import ExpressAccount from "@/models/ExpressAccount";
import { requireExpressClient } from "@/lib/express/access";
import { creditSummary } from "@/lib/express/credit";

/** How much credit the caller's business account has used and has left. Null for accounts without invoice billing. */
export async function GET() {
  try {
    const access = await requireExpressClient();
    if (access.error) return access.error;

    await connectDB();
    const account = await ExpressAccount.findOne({ userId: access.actor.userId }).lean();
    if (!account || account.type !== "b2b" || !account.billingModes?.includes("invoice")) {
      return NextResponse.json({ success: true, credit: null });
    }
    return NextResponse.json({
      success: true,
      credit: { ...(await creditSummary(account)), paymentTermsDays: account.paymentTermsDays ?? null },
    });
  } catch (error) {
    console.error("Express credit error:", error);
    return NextResponse.json({ error: "Failed to load credit" }, { status: 500 });
  }
}

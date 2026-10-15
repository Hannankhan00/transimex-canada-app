import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import ExpressAccount from "@/models/ExpressAccount";
import { requireExpressClient } from "@/lib/express/access";
import { toClientAccountDTO } from "@/lib/express/accountDto";

/** The signed-in client's own Express account, or null if they have not applied. */
export async function GET() {
  try {
    const access = await requireExpressClient();
    if (access.error) return access.error;

    await connectDB();
    const doc = await ExpressAccount.findOne({ userId: access.actor.userId }).lean();
    return NextResponse.json({ success: true, account: doc ? toClientAccountDTO(doc) : null });
  } catch (error) {
    console.error("Express account fetch error:", error);
    return NextResponse.json({ error: "Failed to load account" }, { status: 500 });
  }
}

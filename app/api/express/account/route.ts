import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import { isValidObjectId } from "mongoose";
import ExpressAccount from "@/models/ExpressAccount";
import { isActivePartner } from "@/lib/express/partner";
import { partnerCanCharge } from "@/lib/express/partnerStripe";
import { requireExpressClient } from "@/lib/express/access";
import { toClientAccountDTO } from "@/lib/express/accountDto";

/** The signed-in client's own Express account, or null if they have not applied. */
export async function GET() {
  try {
    const access = await requireExpressClient();
    if (access.error) return access.error;

    await connectDB();
    const doc = await ExpressAccount.findOne({ userId: access.actor.userId }).lean();
    const account = doc ? toClientAccountDTO(doc) : null;
    // A partner's customer can book only while their partner can take card payments and is still an active partner.
    if (account && doc?.type === "customer" && doc.partnerId && isValidObjectId(doc.partnerId)) {
      const partner = await ExpressAccount.findById(doc.partnerId).select("type status partner").lean();
      account.customerCanBook = Boolean(partner && isActivePartner(partner as any) && partnerCanCharge(partner.partner?.stripe));
    }
    return NextResponse.json({ success: true, account });
  } catch (error) {
    console.error("Express account fetch error:", error);
    return NextResponse.json({ error: "Failed to load account" }, { status: 500 });
  }
}

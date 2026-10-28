import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import connectDB from "@/lib/mongoose";
import ExpressQuote from "@/models/ExpressQuote";
import { requireExpressClient } from "@/lib/express/access";
import ExpressAccount from "@/models/ExpressAccount";
import { toClientQuoteDTO, toCustomerQuoteDTO } from "@/lib/express/quoteDto";

type Ctx = { params: Promise<{ id: string }> };

/** One of the caller's own saved quotes. Someone else's quote is a 404, never a 403. */
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const access = await requireExpressClient();
    if (access.error) return access.error;

    const { id } = await params;
    if (!isValidObjectId(id)) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

    await connectDB();
    const doc = await ExpressQuote.findOne({ _id: id, userId: access.actor.userId }).lean();
    if (!doc) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

    // A partner's customer never receives Transimex's price lines.
    const account = await ExpressAccount.findOne({ userId: access.actor.userId }).select("type").lean();
    return NextResponse.json({ success: true, quote: (account?.type === "customer" ? toCustomerQuoteDTO : toClientQuoteDTO)(doc as any) });
  } catch (error) {
    console.error("Express quote fetch error:", error);
    return NextResponse.json({ error: "Failed to load quote" }, { status: 500 });
  }
}

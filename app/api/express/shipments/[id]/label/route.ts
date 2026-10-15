import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import connectDB from "@/lib/mongoose";
import ExpressShipment from "@/models/ExpressShipment";
import { requireExpressClient } from "@/lib/express/access";
import { LABEL_LINK_SECONDS, r2LabelStore } from "@/lib/express/labelStore";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Label download. The owner check happens here; the redirect goes to a signed
 * link that expires in two minutes, so a leaked link is useless. Someone
 * else's booking is a 404.
 */
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const access = await requireExpressClient();
    if (access.error) return access.error;

    const { id } = await params;
    if (!isValidObjectId(id)) return NextResponse.json({ error: "Label not found" }, { status: 404 });

    await connectDB();
    const sh = await ExpressShipment.findOne({ _id: id, userId: access.actor.userId }).select("status label").lean();
    if (!sh || sh.status !== "label_ready" || !sh.label?.key) return NextResponse.json({ error: "Label not found" }, { status: 404 });

    const url = await r2LabelStore.signedUrl(sh.label.key, LABEL_LINK_SECONDS);
    if (!url) return NextResponse.json({ error: "The label is temporarily unavailable. Please try again." }, { status: 503 });

    const res = NextResponse.redirect(url, 302);
    res.headers.set("Cache-Control", "private, no-store");
    return res;
  } catch (error) {
    console.error("Express label download error:", error);
    return NextResponse.json({ error: "Failed to download label" }, { status: 500 });
  }
}

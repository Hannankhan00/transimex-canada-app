import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import connectDB from "@/lib/mongoose";
import ExpressShipment from "@/models/ExpressShipment";
import { requireExpressClient } from "@/lib/express/access";
import { LABEL_LINK_SECONDS, r2LabelStore } from "@/lib/express/labelStore";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Commercial invoice download for a goods shipment. Same rules as the label: the owner check
 * happens here and the redirect goes to a signed link that expires in two minutes.
 */
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const access = await requireExpressClient();
    if (access.error) return access.error;

    const { id } = await params;
    if (!isValidObjectId(id)) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    await connectDB();
    const sh = await ExpressShipment.findOne({ _id: id, userId: access.actor.userId }).select("status invoice").lean();
    if (!sh || sh.status !== "label_ready" || !sh.invoice?.key) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    const url = await r2LabelStore.signedUrl(sh.invoice.key, LABEL_LINK_SECONDS);
    if (!url) return NextResponse.json({ error: "The invoice is temporarily unavailable. Please try again." }, { status: 503 });

    const res = NextResponse.redirect(url, 302);
    res.headers.set("Cache-Control", "private, no-store");
    return res;
  } catch (error) {
    console.error("Express invoice download error:", error);
    return NextResponse.json({ error: "Failed to download invoice" }, { status: 500 });
  }
}

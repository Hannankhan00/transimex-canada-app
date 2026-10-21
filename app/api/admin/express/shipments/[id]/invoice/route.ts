import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import connectDB from "@/lib/mongoose";
import ExpressShipment from "@/models/ExpressShipment";
import { requireExpressStaff } from "@/lib/express/access";
import { LABEL_LINK_SECONDS, r2LabelStore } from "@/lib/express/labelStore";

type Ctx = { params: Promise<{ id: string }> };

/** Staff download any booking's commercial invoice through a two-minute signed link. */
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const access = await requireExpressStaff();
    if (access.error) return access.error;

    const { id } = await params;
    if (!isValidObjectId(id)) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    await connectDB();
    const sh = await ExpressShipment.findById(id).select("invoice").lean();
    if (!sh?.invoice?.key) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    const url = await r2LabelStore.signedUrl(sh.invoice.key, LABEL_LINK_SECONDS);
    if (!url) return NextResponse.json({ error: "The invoice is temporarily unavailable." }, { status: 503 });
    const res = NextResponse.redirect(url, 302);
    res.headers.set("Cache-Control", "private, no-store");
    return res;
  } catch (error) {
    console.error("Express admin invoice download error:", error);
    return NextResponse.json({ error: "Failed to download invoice" }, { status: 500 });
  }
}

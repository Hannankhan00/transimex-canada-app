import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import connectDB from "@/lib/mongoose";
import ExpressShipment from "@/models/ExpressShipment";
import { logAudit } from "@/lib/audit";
import { requireExpressStaff } from "@/lib/express/access";
import { applyManualLabel } from "@/lib/express/fulfilment";
import { LABEL_LINK_SECONDS, isPdf, r2LabelStore } from "@/lib/express/labelStore";

type Ctx = { params: Promise<{ id: string }> };

const MAX_LABEL_BYTES = 5 * 1024 * 1024;

/** Staff download any booking's label through a two-minute signed link. */
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const access = await requireExpressStaff();
    if (access.error) return access.error;

    const { id } = await params;
    if (!isValidObjectId(id)) return NextResponse.json({ error: "Label not found" }, { status: 404 });

    await connectDB();
    const sh = await ExpressShipment.findById(id).select("label").lean();
    if (!sh?.label?.key) return NextResponse.json({ error: "Label not found" }, { status: 404 });

    const url = await r2LabelStore.signedUrl(sh.label.key, LABEL_LINK_SECONDS);
    if (!url) return NextResponse.json({ error: "The label is temporarily unavailable." }, { status: 503 });
    const res = NextResponse.redirect(url, 302);
    res.headers.set("Cache-Control", "private, no-store");
    return res;
  } catch (error) {
    console.error("Express admin label download error:", error);
    return NextResponse.json({ error: "Failed to download label" }, { status: 500 });
  }
}

/**
 * Fallback when DHL is not ready or label creation failed: staff enter the DHL
 * tracking number and upload the label PDF by hand. The booking must be paid.
 */
export async function POST(req: Request, { params }: Ctx) {
  try {
    const access = await requireExpressStaff();
    if (access.error) return access.error;

    const { id } = await params;
    if (!isValidObjectId(id)) return NextResponse.json({ error: "Shipment not found" }, { status: 404 });

    const form = await req.formData().catch(() => null);
    const trackingNumber = String(form?.get("trackingNumber") || "").trim();
    const file = form?.get("file");

    if (!/^[A-Za-z0-9-]{6,40}$/.test(trackingNumber)) {
      return NextResponse.json({ error: "Enter the DHL tracking number (6 to 40 letters or digits).", code: "invalid_tracking" }, { status: 422 });
    }
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Choose the label PDF.", code: "invalid_file" }, { status: 422 });
    }
    if (file.size > MAX_LABEL_BYTES) {
      return NextResponse.json({ error: "The label file is larger than 5 MB.", code: "invalid_file" }, { status: 422 });
    }
    const pdf = Buffer.from(await file.arrayBuffer());
    if (!isPdf(pdf)) {
      return NextResponse.json({ error: "The file is not a PDF.", code: "invalid_file" }, { status: 422 });
    }

    const result = await applyManualLabel(id, { trackingNumber, pdf, staffId: access.actor.userId });
    if (!result.ok) {
      const map = {
        not_found: [404, "Shipment not found"],
        not_paid: [409, "A label can only be added to a paid booking that has no label yet."],
        in_progress: [409, "The label is being created right now. Try again in a moment."],
      } as const;
      const [status, error] = map[result.code];
      return NextResponse.json({ error, code: result.code }, { status });
    }

    await logAudit({
      actor: access.actor,
      action: "EXPRESS_LABEL_UPLOADED",
      resourceType: "ExpressShipment",
      resourceId: id,
      details: `Label and tracking number ${trackingNumber} entered by hand`,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Express manual label error:", error);
    return NextResponse.json({ error: "Failed to save the label" }, { status: 500 });
  }
}

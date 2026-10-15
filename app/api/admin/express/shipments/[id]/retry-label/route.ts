import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import connectDB from "@/lib/mongoose";
import ExpressShipment from "@/models/ExpressShipment";
import { requireExpressStaff } from "@/lib/express/access";
import { fulfilShipment } from "@/lib/express/fulfilment";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Staff retry label creation for a paid booking whose first attempt failed.
 * A booking in the "unknown" state is refused: DHL may already have booked it,
 * and booking again could create a second parcel.
 */
export async function POST(_req: Request, { params }: Ctx) {
  try {
    const access = await requireExpressStaff();
    if (access.error) return access.error;

    const { id } = await params;
    if (!isValidObjectId(id)) return NextResponse.json({ error: "Shipment not found" }, { status: 404 });

    await connectDB();
    const sh = await ExpressShipment.findById(id).select("status fulfilment trackingNumber").lean();
    if (!sh) return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    if (sh.status !== "paid") return NextResponse.json({ error: "Only a paid booking without a label can be retried.", code: "not_retryable" }, { status: 409 });
    if (sh.fulfilment?.state === "unknown") {
      return NextResponse.json(
        { error: "DHL may already have booked this shipment. Check with DHL and enter its tracking number and label by hand instead.", code: "outcome_unknown" },
        { status: 409 }
      );
    }
    if (sh.trackingNumber) {
      return NextResponse.json({ error: "DHL already booked this shipment. Upload its label by hand.", code: "already_booked" }, { status: 409 });
    }

    const outcome = await fulfilShipment(id);
    const fresh = await ExpressShipment.findById(id).select("status fulfilment").lean();
    return NextResponse.json({ success: outcome === "ok", outcome, status: fresh?.status, error: outcome === "ok" ? undefined : fresh?.fulfilment?.lastError || "Label creation did not complete." });
  } catch (error) {
    console.error("Express retry label error:", error);
    return NextResponse.json({ error: "Failed to retry the label" }, { status: 500 });
  }
}

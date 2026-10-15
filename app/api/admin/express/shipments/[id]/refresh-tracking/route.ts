import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { requireExpressStaff } from "@/lib/express/access";
import { checkShipmentTracking } from "@/lib/express/trackingService";

type Ctx = { params: Promise<{ id: string }> };

/** Staff ask DHL for the parcel's latest status right now, ignoring the job's minimum interval. */
export async function POST(_req: Request, { params }: Ctx) {
  try {
    const access = await requireExpressStaff();
    if (access.error) return access.error;

    const { id } = await params;
    if (!isValidObjectId(id)) return NextResponse.json({ error: "Shipment not found" }, { status: 404 });

    const { outcome, message } = await checkShipmentTracking(id, { force: true });
    if (outcome === "failed") return NextResponse.json({ success: false, outcome, error: "DHL tracking could not be checked. " + (message || "") }, { status: 502 });
    return NextResponse.json({ success: true, outcome });
  } catch (error) {
    console.error("Express refresh tracking error:", error);
    return NextResponse.json({ error: "Failed to refresh tracking" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import connectDB from "@/lib/mongoose";
import ExpressShipment from "@/models/ExpressShipment";
import { logAudit } from "@/lib/audit";
import { requireExpressStaff, validationError } from "@/lib/express/access";
import { dhlActualSchema } from "@/lib/express/dhlCost";

type Ctx = { params: Promise<{ id: string }> };

/** Staff record what DHL really charged for a shipment (or clear it, so the quoted cost counts again). */
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const access = await requireExpressStaff();
    if (access.error) return access.error;

    const { id } = await params;
    if (!isValidObjectId(id)) return NextResponse.json({ error: "Shipment not found" }, { status: 404 });

    const parsed = dhlActualSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return validationError(parsed.error);
    const { charge, invoiceNumber, note } = parsed.data;

    await connectDB();
    const sh = await ExpressShipment.findById(id).select("trackingNumber reference").lean();
    if (!sh) return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    if (!sh.trackingNumber) return NextResponse.json({ error: "DHL has not booked this shipment, so it has no DHL charge.", code: "not_booked" }, { status: 409 });

    if (charge === null) {
      await ExpressShipment.updateOne({ _id: id }, { $unset: { dhlActual: "" } });
    } else {
      await ExpressShipment.updateOne(
        { _id: id },
        { $set: { dhlActual: { chargeCents: charge, source: "manual", recordedAt: new Date(), recordedBy: access.actor.userId, ...(note ? { note } : {}), ...(invoiceNumber ? { invoiceNumber } : {}) } } }
      );
    }

    await logAudit({
      actor: access.actor,
      action: "EXPRESS_DHL_COST_RECORDED",
      resourceType: "ExpressShipment",
      resourceId: id,
      details: charge === null ? `Cleared DHL actual charge on ${sh.reference}` : `Recorded DHL actual charge ${(charge / 100).toFixed(2)} CAD on ${sh.reference}`,
    });

    const fresh = await ExpressShipment.findById(id).select("dhlActual").lean();
    return NextResponse.json({ success: true, dhlActual: fresh?.dhlActual ?? null });
  } catch (error) {
    console.error("Express DHL cost error:", error);
    return NextResponse.json({ error: "Failed to save the DHL charge" }, { status: 500 });
  }
}

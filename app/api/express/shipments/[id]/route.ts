import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import connectDB from "@/lib/mongoose";
import ExpressQuote from "@/models/ExpressQuote";
import ExpressShipment from "@/models/ExpressShipment";
import { requireExpressClient } from "@/lib/express/access";
import { toClientQuoteDTO } from "@/lib/express/quoteDto";
import { toClientShipmentDTO } from "@/lib/express/shipmentDto";

type Ctx = { params: Promise<{ id: string }> };

/** One of the caller's own bookings. Someone else's booking is a 404, never a 403. */
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const access = await requireExpressClient();
    if (access.error) return access.error;

    const { id } = await params;
    if (!isValidObjectId(id)) return NextResponse.json({ error: "Shipment not found" }, { status: 404 });

    await connectDB();
    const shipment = await ExpressShipment.findOne({ _id: id, userId: access.actor.userId }).lean();
    if (!shipment) return NextResponse.json({ error: "Shipment not found" }, { status: 404 });

    const quote = isValidObjectId(shipment.quoteId) ? await ExpressQuote.findById(shipment.quoteId).lean() : null;

    return NextResponse.json({
      success: true,
      shipment: toClientShipmentDTO(shipment as any),
      // The client-safe price lines (public price, discount, surcharges, total). Never the account rate.
      quote: quote ? toClientQuoteDTO(quote as any) : null,
    });
  } catch (error) {
    console.error("Express shipment fetch error:", error);
    return NextResponse.json({ error: "Failed to load shipment" }, { status: 500 });
  }
}

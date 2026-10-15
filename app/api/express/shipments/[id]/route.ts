import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import connectDB from "@/lib/mongoose";
import ExpressQuote from "@/models/ExpressQuote";
import ExpressShipment from "@/models/ExpressShipment";
import { requireExpressClient } from "@/lib/express/access";
import { toClientQuoteDTO } from "@/lib/express/quoteDto";
import ExpressAccount from "@/models/ExpressAccount";
import { toClientShipmentDTO, toCustomerShipmentDTO } from "@/lib/express/shipmentDto";

type Ctx = { params: Promise<{ id: string }> };

/** One of the caller's own bookings. Someone else's booking is a 404, never a 403. */
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const access = await requireExpressClient();
    if (access.error) return access.error;

    const { id } = await params;
    if (!isValidObjectId(id)) return NextResponse.json({ error: "Shipment not found" }, { status: 404 });

    await connectDB();
    // The owner sees everything. A partner's customer sees only shipments booked for them, in a reduced view.
    let shipment = await ExpressShipment.findOne({ _id: id, userId: access.actor.userId }).lean();
    if (!shipment) {
      const account = await ExpressAccount.findOne({ userId: access.actor.userId, type: "customer" }).select("partnerCustomerId").lean();
      if (account?.partnerCustomerId) {
        const theirs = await ExpressShipment.findOne({ _id: id, partnerCustomerId: account.partnerCustomerId, status: { $ne: "awaiting_payment" } }).lean();
        if (theirs) return NextResponse.json({ success: true, shipment: toCustomerShipmentDTO(theirs as any), quote: null });
      }
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }

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

import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import connectDB from "@/lib/mongoose";
import ExpressQuote from "@/models/ExpressQuote";
import ExpressShipment from "@/models/ExpressShipment";
import { requireExpressClient } from "@/lib/express/access";
import { toClientQuoteDTO } from "@/lib/express/quoteDto";
import ExpressAccount from "@/models/ExpressAccount";
import ExpressPartnerCustomer from "@/models/ExpressPartnerCustomer";
import { toCustomerShipmentDTO, toOwnShipmentDTO } from "@/lib/express/shipmentDto";

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
    const caller = await ExpressAccount.findOne({ userId: access.actor.userId }).select("type partnerCustomerId partner").lean();
    let shipment = await ExpressShipment.findOne({ _id: id, userId: access.actor.userId }).lean();
    if (!shipment) {
      const account = caller?.type === "customer" ? caller : null;
      if (account?.partnerCustomerId) {
        const theirs = await ExpressShipment.findOne({ _id: id, partnerCustomerId: account.partnerCustomerId, status: { $ne: "awaiting_payment" } }).lean();
        if (theirs) return NextResponse.json({ success: true, shipment: toCustomerShipmentDTO(theirs as any), quote: null });
      }
      // A partner may look at what their customer booked and paid for themselves (read only).
      if (caller?.type === "b2b" && caller.partner?.enabled) {
        const theirs = await ExpressShipment.findOne({ _id: id, status: { $ne: "awaiting_payment" }, partnerCustomerId: { $exists: true, $ne: null } }).lean();
        if (theirs && (await ExpressPartnerCustomer.exists({ _id: theirs.partnerCustomerId, partnerUserId: access.actor.userId }))) shipment = theirs;
      }
    }
    if (!shipment) return NextResponse.json({ error: "Shipment not found" }, { status: 404 });

    const quote = isValidObjectId(shipment.quoteId) ? await ExpressQuote.findById(shipment.quoteId).lean() : null;

    return NextResponse.json({
      success: true,
      shipment: toOwnShipmentDTO(shipment as any, caller?.type),
      // The client-safe price lines (public price, discount, surcharges, total). Never the account rate, and a
      // partner's customer gets none: their price is the single total on the booking.
      quote: quote && caller?.type !== "customer" ? toClientQuoteDTO(quote as any) : null,
    });
  } catch (error) {
    console.error("Express shipment fetch error:", error);
    return NextResponse.json({ error: "Failed to load shipment" }, { status: 500 });
  }
}

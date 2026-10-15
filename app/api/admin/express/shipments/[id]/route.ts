import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import ExpressQuote from "@/models/ExpressQuote";
import ExpressShipment from "@/models/ExpressShipment";
import { requireExpressStaff } from "@/lib/express/access";
import { toAdminQuoteDTO } from "@/lib/express/quoteDto";
import { toAdminShipmentDTO } from "@/lib/express/shipmentDto";

type Ctx = { params: Promise<{ id: string }> };

/** A booking with the full price breakdown, including the staff-only lines. */
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const access = await requireExpressStaff();
    if (access.error) return access.error;

    const { id } = await params;
    if (!isValidObjectId(id)) return NextResponse.json({ error: "Shipment not found" }, { status: 404 });

    await connectDB();
    const shipment = await ExpressShipment.findById(id).lean();
    if (!shipment) return NextResponse.json({ error: "Shipment not found" }, { status: 404 });

    const [user, quote] = await Promise.all([
      isValidObjectId(shipment.userId) ? User.findById(shipment.userId).select("name email companyName").lean<any>() : null,
      isValidObjectId(shipment.quoteId) ? ExpressQuote.findById(shipment.quoteId).lean() : null,
    ]);

    return NextResponse.json({
      success: true,
      shipment: toAdminShipmentDTO(shipment as any, user),
      quote: quote ? toAdminQuoteDTO(quote as any) : null,
    });
  } catch (error) {
    console.error("Error fetching Express shipment:", error);
    return NextResponse.json({ error: "Failed to load Express shipment" }, { status: 500 });
  }
}

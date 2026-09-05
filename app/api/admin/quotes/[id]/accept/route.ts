import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongoose";
import Quote from "@/models/Quote";
import Shipment from "@/models/Shipment";
import { verifyToken } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { sendQuoteAcceptedEmail } from "@/lib/email";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { priceCad, priceUsd, breakdown, adminNotes } = body;

    if (!priceCad || !priceCad.trim()) {
      return NextResponse.json(
        { error: "Calculated freight rate (CAD) is required to accept quote" },
        { status: 400 }
      );
    }

    await connectDB();
    const existingQuote = await Quote.findOne({
      $or: [{ refNumber: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
    });

    if (!existingQuote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    if (!existingQuote.client?.email) {
      return NextResponse.json(
        { error: "This quote is missing client contact information and cannot be accepted." },
        { status: 422 }
      );
    }

    // Generate unique sequential Tracking ID e.g. TMX-2026-00847
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const trackingId = `TMX-2026-${randomSuffix}`;

    existingQuote.status = "accepted";
    existingQuote.priceCad = priceCad;
    if (priceUsd) existingQuote.priceUsd = priceUsd;
    if (breakdown) existingQuote.breakdown = breakdown;
    if (adminNotes) existingQuote.adminNotes = adminNotes;
    existingQuote.shipmentId = trackingId;
    await existingQuote.save();

    await Shipment.create({
      trackingNumber: trackingId,
      quoteId: existingQuote.refNumber,
      client: existingQuote.client,
      route: existingQuote.route,
      cargo: existingQuote.cargo,
      status: "Pending Dispatch",
      rateCad: priceCad,
      assignedCarrier: "Transimex Dedicated Freight Network",
      eta: "3-5 Business Days",
      timeline: [
        {
          title: "Shipment Created & Carrier Booked",
          location: existingQuote.route?.origin || "Origin Terminal",
          timestamp: new Date().toISOString(),
          statusText: "Rate finalized. Dispatched from Quote " + existingQuote.refNumber,
          completed: true,
        },
        {
          title: "Customs Staging & Driver Dispatch",
          location: "Transimex Logistics Hub",
          timestamp: "Pending Dispatch",
          statusText: "Trailer equipment staged for pickup window",
          completed: false,
        },
      ],
    });

    try {
      await sendQuoteAcceptedEmail({
        to: existingQuote.client.email,
        name: existingQuote.client.name,
        companyName: existingQuote.client.companyName || "",
        quoteId: id,
        trackingId,
        origin: existingQuote.route?.origin || "",
        destination: existingQuote.route?.destination || "",
        priceCad,
        equipment: existingQuote.cargo?.equipment || "",
      });
    } catch (mailErr) {
      console.warn("[Email Notification] Could not send accepted email:", mailErr);
    }

    const cookieStore = await cookies();
    const actor = verifyToken(cookieStore.get("token")?.value || "");
    if (actor) {
      await logAudit({
        actor,
        action: "QUOTE_ACCEPTED",
        resourceType: "Quote",
        resourceId: existingQuote.refNumber,
        details: `Quote ${existingQuote.refNumber} accepted at ${priceCad} CAD, converted to shipment ${trackingId}.`,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Quote ${id} successfully accepted and converted to shipment ${trackingId}`,
      trackingId,
      quote: existingQuote.toObject(),
    });
  } catch (error: any) {
    console.error("Error accepting quote:", error);
    return NextResponse.json(
      { error: error.message || "Failed to accept quote" },
      { status: 500 }
    );
  }
}

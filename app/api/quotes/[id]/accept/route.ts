import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongoose";
import Quote from "@/models/Quote";
import Shipment from "@/models/Shipment";
import { getCurrentUser } from "@/lib/session";
import { verifyToken } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { sendQuoteAcceptedEmail } from "@/lib/email";
import { notifyUser } from "@/lib/notifications";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    const existingQuote = await Quote.findOne({
      $or: [{ refNumber: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
    });

    if (!existingQuote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    // Verify ownership or staff permissions
    const isOwner =
      (existingQuote.client?.userId && existingQuote.client.userId === currentUser.userId) ||
      (existingQuote.client?.email && existingQuote.client.email.toLowerCase() === currentUser.email.toLowerCase()) ||
      currentUser.role === "admin" ||
      currentUser.role === "staff";

    if (!isOwner) {
      return NextResponse.json({ error: "Unauthorized access to this quote" }, { status: 403 });
    }

    // Ensure price is offered
    if (!existingQuote.priceCad || existingQuote.priceCad.includes("Pending")) {
      return NextResponse.json(
        { error: "This quote has not received an official freight rate from Transimex dispatch yet." },
        { status: 400 }
      );
    }

    if (existingQuote.status === "accepted") {
      return NextResponse.json(
        {
          success: true,
          message: "Quote has already been accepted and booked.",
          trackingId: existingQuote.shipmentId,
          quote: existingQuote.toObject(),
        },
        { status: 200 }
      );
    }

    // Generate unique sequential Tracking ID
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const trackingId = `TMX-2026-${randomSuffix}`;

    existingQuote.status = "accepted";
    existingQuote.shipmentId = trackingId;
    existingQuote.clientRespondedAt = new Date().toISOString();
    await existingQuote.save();

    // Create the active commercial shipment
    await Shipment.create({
      trackingNumber: trackingId,
      quoteId: existingQuote.refNumber,
      client: existingQuote.client,
      route: existingQuote.route,
      cargo: existingQuote.cargo,
      status: "Pending Dispatch",
      rateCad: existingQuote.priceCad,
      assignedCarrier: "Transimex Dedicated Freight Network",
      eta: "3-5 Business Days",
      timeline: [
        {
          title: "Shipment Created & Carrier Booked",
          location: existingQuote.route?.origin || "Origin Terminal",
          timestamp: new Date().toISOString(),
          statusText: "Rate accepted by client. Dispatched from Quote " + existingQuote.refNumber,
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

    // Send email confirmation
    if (existingQuote.client?.email) {
      try {
        await sendQuoteAcceptedEmail({
          to: existingQuote.client.email,
          name: existingQuote.client.name,
          companyName: existingQuote.client.companyName || "",
          quoteId: existingQuote.refNumber,
          trackingId,
          origin: existingQuote.route?.origin || "",
          destination: existingQuote.route?.destination || "",
          priceCad: existingQuote.priceCad,
          equipment: existingQuote.cargo?.equipment || "",
        });
      } catch (mailErr) {
        console.warn("[Email Notification] Could not send accepted email:", mailErr);
      }
    }

    // Portal notification
    await notifyUser({
      userId: existingQuote.client?.userId,
      category: "quote",
      shipmentId: trackingId,
      title: `Quote Accepted — Shipment ${trackingId} Created`,
      titleFr: `Soumission Acceptée — Expédition ${trackingId} Créée`,
      desc: `Your freight booking for quote ${existingQuote.refNumber} has been finalized. Active tracking ID: ${trackingId}.`,
      descFr: `Votre réservation de fret pour la soumission ${existingQuote.refNumber} a été finalisée. No de suivi actif : ${trackingId}.`,
      link: `/dashboard/shipments?id=${trackingId}`,
    });

    const cookieStore = await cookies();
    const actor = verifyToken(cookieStore.get("token")?.value || "");
    if (actor) {
      await logAudit({
        actor,
        action: "QUOTE_CLIENT_ACCEPTED",
        resourceType: "Quote",
        resourceId: existingQuote.refNumber,
        details: `Client accepted quote ${existingQuote.refNumber} at ${existingQuote.priceCad} CAD. Converted to shipment ${trackingId}.`,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Quote accepted successfully! Shipment ${trackingId} generated.`,
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

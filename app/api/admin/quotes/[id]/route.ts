import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Quote from "@/models/Quote";
import { getStoredQuotes } from "@/lib/mockData";

function mapQuote(q: any) {
  return {
    id: q.refNumber || q._id?.toString(),
    clientName: q.client?.name || "Client Shipper",
    clientCompany: q.client?.companyName || "Commercial Enterprise",
    clientEmail: q.client?.email || "shipper@transimex.ca",
    clientPhone: q.client?.phone || "",
    userId: q.client?.userId || "",
    origin: q.route?.origin || "",
    originDetail: q.route?.originDetail || "",
    destination: q.route?.destination || "",
    destinationDetail: q.route?.destinationDetail || "",
    transportMode: q.cargo?.transportMode || "53' Dry Van",
    equipment: q.cargo?.equipment || "Standard Trailer",
    cargoType: q.cargo?.cargoType || "General Freight",
    weight: q.cargo?.weight || "20,000 lbs",
    palletCount: q.cargo?.palletCount || 0,
    dimensions: q.cargo?.dimensions || "",
    commodity: q.cargo?.commodity || "General Cargo",
    preferredPickupDate: q.cargo?.preferredPickupDate || "",
    specialInstructions: q.cargo?.specialInstructions || "",
    submittedDate: q.submittedDate,
    validUntil: q.validUntil,
    status: q.status,
    statusLabelEn:
      q.status === "accepted"
        ? "Accepted & Dispatched"
        : q.status === "reviewing"
        ? "In Staff Review"
        : q.status === "rejected"
        ? "Quote Rejected"
        : "New / Under Review",
    statusLabelFr:
      q.status === "accepted"
        ? "Acceptée & Expédiée"
        : q.status === "reviewing"
        ? "En Évaluation Staff"
        : q.status === "rejected"
        ? "Soumission Refusée"
        : "Nouvelle / En Révision",
    priceCad: q.priceCad,
    priceUsd: q.priceUsd,
    breakdown: q.breakdown,
    shipmentId: q.shipmentId,
    rejectionReason: q.rejectionReason,
    adminNotes: q.adminNotes,
  };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Quote ID required" }, { status: 400 });
    }

    // Check MongoDB
    try {
      await connectDB();
      const dbQuote = await Quote.findOne({
        $or: [{ refNumber: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
      }).lean();

      if (dbQuote) {
        return NextResponse.json({
          success: true,
          quote: mapQuote(dbQuote),
        });
      }
    } catch (dbErr) {
      console.warn("[Admin Quotes API] DB lookup error:", dbErr);
    }

    // Fallback to local store / mock data
    const allQuotes = getStoredQuotes();
    const found = allQuotes.find((q) => q.id.toLowerCase() === id.toLowerCase());

    if (!found) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      quote: found,
    });
  } catch (error: any) {
    console.error("Error fetching quote details:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch quote" },
      { status: 500 }
    );
  }
}

// Save internal admin notes and/or move status to "reviewing"
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { adminNotes, status } = body;

    if (status && status !== "reviewing") {
      return NextResponse.json(
        { error: "This endpoint only supports moving a quote to 'reviewing'. Use /accept or /reject for those transitions." },
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

    if (typeof adminNotes === "string") {
      existingQuote.adminNotes = adminNotes;
    }
    if (status === "reviewing") {
      existingQuote.status = "reviewing";
    }
    await existingQuote.save();

    return NextResponse.json({
      success: true,
      message: `Quote ${id} updated`,
      quote: mapQuote(existingQuote.toObject()),
    });
  } catch (error: any) {
    console.error("Error updating quote:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update quote" },
      { status: 500 }
    );
  }
}

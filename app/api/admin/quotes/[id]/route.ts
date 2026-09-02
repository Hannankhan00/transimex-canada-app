import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Quote from "@/models/Quote";
import { getStoredQuotes } from "@/lib/mockData";

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
          quote: {
            id: dbQuote.refNumber || dbQuote._id.toString(),
            clientName: dbQuote.client?.name || "Client Shipper",
            clientCompany: dbQuote.client?.companyName || "Commercial Enterprise",
            clientEmail: dbQuote.client?.email || "shipper@transimex.ca",
            clientPhone: dbQuote.client?.phone || "",
            userId: dbQuote.client?.userId || "",
            origin: dbQuote.route?.origin || "",
            originDetail: dbQuote.route?.originDetail || "",
            destination: dbQuote.route?.destination || "",
            destinationDetail: dbQuote.route?.destinationDetail || "",
            transportMode: dbQuote.cargo?.transportMode || "53' Dry Van",
            equipment: dbQuote.cargo?.equipment || "Standard Trailer",
            cargoType: dbQuote.cargo?.cargoType || "General Freight",
            weight: dbQuote.cargo?.weight || "20,000 lbs",
            palletCount: dbQuote.cargo?.palletCount || 0,
            dimensions: dbQuote.cargo?.dimensions || "",
            commodity: dbQuote.cargo?.commodity || "General Cargo",
            preferredPickupDate: dbQuote.cargo?.preferredPickupDate || "",
            specialInstructions: dbQuote.cargo?.specialInstructions || "",
            submittedDate: dbQuote.submittedDate,
            validUntil: dbQuote.validUntil,
            status: dbQuote.status,
            statusLabelEn:
              dbQuote.status === "accepted"
                ? "Accepted & Dispatched"
                : dbQuote.status === "reviewing"
                ? "In Staff Review"
                : dbQuote.status === "rejected"
                ? "Quote Rejected"
                : "New / Under Review",
            statusLabelFr:
              dbQuote.status === "accepted"
                ? "Acceptée & Expédiée"
                : dbQuote.status === "reviewing"
                ? "En Évaluation Staff"
                : dbQuote.status === "rejected"
                ? "Soumission Refusée"
                : "Nouvelle / En Révision",
            priceCad: dbQuote.priceCad,
            priceUsd: dbQuote.priceUsd,
            breakdown: dbQuote.breakdown,
            shipmentId: dbQuote.shipmentId,
            rejectionReason: dbQuote.rejectionReason,
            adminNotes: dbQuote.adminNotes,
          },
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

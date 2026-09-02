import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Quote from "@/models/Quote";
import { INITIAL_QUOTES, getStoredQuotes } from "@/lib/mockData";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");
    const searchQuery = searchParams.get("search")?.toLowerCase().trim();

    let allQuotes = getStoredQuotes();

    // Try MongoDB first
    try {
      await connectDB();
      const dbQuotes = await Quote.find().sort({ createdAt: -1 }).lean();
      if (dbQuotes && dbQuotes.length > 0) {
        // Map DB quotes to QuoteItem structure
        const mappedDbQuotes = dbQuotes.map((q: any) => ({
          id: q.refNumber || q._id.toString(),
          clientName: q.client?.name || "Client Shipper",
          clientCompany: q.client?.companyName || "Commercial Enterprise",
          clientEmail: q.client?.email || "shipper@transimex.ca",
          clientPhone: q.client?.phone || "",
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
          submittedDate: q.submittedDate || new Date(q.createdAt).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
          validUntil: q.validUntil || "7 Days",
          status: q.status || "under_review",
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
          priceCad: q.priceCad || "Pending",
          priceUsd: q.priceUsd || "",
          breakdown: q.breakdown,
          shipmentId: q.shipmentId || "",
          rejectionReason: q.rejectionReason || "",
          adminNotes: q.adminNotes || "",
        }));

        // Merge DB quotes with mock quotes (avoiding duplicate IDs)
        const dbIds = new Set(mappedDbQuotes.map((q) => q.id));
        const nonDuplicateMocks = allQuotes.filter((q) => !dbIds.has(q.id));
        allQuotes = [...mappedDbQuotes, ...nonDuplicateMocks];
      }
    } catch (dbErr) {
      console.warn("[Admin Quotes API] DB not connected, using storage/mock layer:", dbErr);
    }

    // Compute pipeline counts
    const counts = {
      all: allQuotes.length,
      under_review: allQuotes.filter((q) => q.status === "under_review").length,
      reviewing: allQuotes.filter((q) => q.status === "reviewing").length,
      accepted: allQuotes.filter((q) => q.status === "accepted").length,
      rejected: allQuotes.filter((q) => q.status === "rejected").length,
    };

    // Filter by status
    let filtered = allQuotes;
    if (statusFilter && statusFilter !== "all") {
      filtered = filtered.filter((q) => q.status === statusFilter);
    }

    // Filter by search term
    if (searchQuery) {
      filtered = filtered.filter((q) => {
        return (
          q.id.toLowerCase().includes(searchQuery) ||
          (q.clientName && q.clientName.toLowerCase().includes(searchQuery)) ||
          (q.clientCompany && q.clientCompany.toLowerCase().includes(searchQuery)) ||
          (q.clientEmail && q.clientEmail.toLowerCase().includes(searchQuery)) ||
          q.origin.toLowerCase().includes(searchQuery) ||
          q.destination.toLowerCase().includes(searchQuery) ||
          q.commodity.toLowerCase().includes(searchQuery) ||
          (q.shipmentId && q.shipmentId.toLowerCase().includes(searchQuery))
        );
      });
    }

    return NextResponse.json({
      success: true,
      quotes: filtered,
      counts,
    });
  } catch (error: any) {
    console.error("Error fetching admin quotes:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch quotes" },
      { status: 500 }
    );
  }
}

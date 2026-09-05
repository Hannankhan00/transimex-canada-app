import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Quote from "@/models/Quote";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");
    const searchQuery = searchParams.get("search")?.toLowerCase().trim();

    await connectDB();
    const dbQuotes = await Quote.find().sort({ createdAt: -1 }).lean();

    let allQuotes = dbQuotes.map((q: any) => ({
      id: q.refNumber || q._id.toString(),
      clientName: q.client?.name || "",
      clientCompany: q.client?.companyName || "",
      clientEmail: q.client?.email || "",
      clientPhone: q.client?.phone || "",
      origin: q.route?.origin || "",
      originDetail: q.route?.originDetail || "",
      destination: q.route?.destination || "",
      destinationDetail: q.route?.destinationDetail || "",
      transportMode: q.cargo?.transportMode || "",
      equipment: q.cargo?.equipment || "",
      cargoType: q.cargo?.cargoType || "General Freight",
      weight: q.cargo?.weight || "",
      palletCount: q.cargo?.palletCount || 0,
      dimensions: q.cargo?.dimensions || "",
      commodity: q.cargo?.commodity || "",
      preferredPickupDate: q.cargo?.preferredPickupDate || "",
      specialInstructions: q.cargo?.specialInstructions || "",
      submittedDate: q.submittedDate || new Date(q.createdAt).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
      validUntil: q.validUntil || "",
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

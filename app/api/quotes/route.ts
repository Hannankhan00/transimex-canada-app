import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Quote from "@/models/Quote";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/session";
import { formatDateLabel } from "@/lib/formatDate";

function mapQuote(q: any) {
  return {
    id: q.refNumber,
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
    submittedDate: q.submittedDate,
    validUntil: q.validUntil || "",
    status: q.status,
    statusLabelEn:
      q.status === "accepted"
        ? "Accepted & Dispatched"
        : q.status === "reviewing"
        ? "In Staff Review"
        : q.status === "rejected"
        ? "Quote Rejected"
        : q.status === "expired"
        ? "Offer Expired"
        : "New / Under Review",
    statusLabelFr:
      q.status === "accepted"
        ? "Acceptée & Expédiée"
        : q.status === "reviewing"
        ? "En Évaluation Staff"
        : q.status === "rejected"
        ? "Soumission Refusée"
        : q.status === "expired"
        ? "Offre Expirée"
        : "Nouvelle / En Révision",
    priceCad: q.priceCad || "Pending Dispatch Calculation",
    priceUsd: q.priceUsd || "",
    breakdown: q.breakdown && q.breakdown.total ? q.breakdown : undefined,
    shipmentId: q.shipmentId || "",
    rejectionReason: q.rejectionReason || "",
    adminNotes: q.adminNotes || "",
  };
}

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    await connectDB();
    const quotes = await Quote.find({
      $or: [{ "client.userId": currentUser.userId }, { "client.email": currentUser.email }],
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      quotes: quotes.map(mapQuote),
    });
  } catch (error: any) {
    console.error("Error fetching client quotes:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch quotes" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      originCity,
      originProvince,
      originPostal,
      destinationCity,
      destinationProvince,
      destinationPostal,
      transportMode,
      weightLbs,
      palletCount,
      pickupDate,
      commodityType,
      specialInstructions,
    } = body;

    if (!originCity || !destinationCity || !transportMode || !weightLbs || !commodityType) {
      return NextResponse.json(
        { error: "Origin, destination, transport mode, weight, and commodity are required" },
        { status: 400 }
      );
    }

    await connectDB();
    const user = await User.findById(currentUser.userId).lean<any>();

    const refNumber = `QT-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    const now = new Date();

    const quote = await Quote.create({
      refNumber,
      client: {
        name: user?.name || currentUser.name,
        companyName: user?.companyName || currentUser.companyName,
        email: user?.email || currentUser.email,
        phone: user?.phone || "",
        userId: currentUser.userId,
      },
      route: {
        origin: `${originCity} (${originProvince || ""})`.trim(),
        originDetail: `${originCity}, ${originProvince || ""} ${originPostal || ""}`.trim(),
        destination: `${destinationCity} (${destinationProvince || ""})`.trim(),
        destinationDetail: `${destinationCity}, ${destinationProvince || ""} ${destinationPostal || ""}`.trim(),
      },
      cargo: {
        transportMode,
        equipment: transportMode,
        weight: `${Number(weightLbs).toLocaleString()} lbs`,
        palletCount: palletCount ? parseInt(palletCount, 10) : 0,
        commodity: commodityType,
        preferredPickupDate: pickupDate || "",
        specialInstructions: specialInstructions || "",
      },
      status: "under_review",
      submittedDate: formatDateLabel(now),
      validUntil: "7 Days from Dispatch",
      adminNotes: "New quote request received from client portal. Transimex freight coordinator assigned for rate review.",
    });

    return NextResponse.json({
      success: true,
      message: `Quote request ${refNumber} submitted`,
      quote: mapQuote(quote.toObject()),
    });
  } catch (error: any) {
    console.error("Error creating quote:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit quote request" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Quote from "@/models/Quote";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/session";
import { formatDateLabel } from "@/lib/formatDate";
import { sendQuoteSubmittedEmail } from "@/lib/email";

function mapQuote(q: any) {
  return {
    id: q.refNumber,
    clientName: q.client?.name || "",
    clientCompany: q.client?.companyName || "",
    clientEmail: q.client?.email || "",
    clientPhone: q.client?.phone || "",
    userId: q.client?.userId || "",
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
        : q.status === "quoted"
        ? "Rate Offered / Awaiting Client"
        : q.status === "client_rejected"
        ? "Rate Declined / In Negotiation"
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
        : q.status === "quoted"
        ? "Tarif Proposé / En Attente"
        : q.status === "client_rejected"
        ? "Tarif Refusé / En Négociation"
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
    clientNegotiationPhone: q.clientNegotiationPhone || "",
    clientRejectionReason: q.clientRejectionReason || "",
    clientCounterBudget: q.clientCounterBudget || "",
    rejectionBy: q.rejectionBy || "",
    offeredAt: q.offeredAt || "",
    clientRespondedAt: q.clientRespondedAt || "",
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
      dimLengthIn,
      dimWidthIn,
      dimHeightIn,
      commodityType,
      specialInstructions,
      companyName,
      contactName,
      contactEmail,
      contactPhone,
    } = body;

    if (!currentUser && (!contactEmail || !contactName)) {
      return NextResponse.json({ error: "Contact name and valid email are required to request a quote." }, { status: 401 });
    }

    if (!originCity || !destinationCity || !transportMode || !weightLbs || !commodityType) {
      return NextResponse.json(
        { error: "Origin, destination, transport mode, weight, and commodity are required" },
        { status: 400 }
      );
    }

    await connectDB();
    const user = currentUser?.userId ? await User.findById(currentUser.userId).lean<any>() : null;

    const now = new Date();
    const dimensions =
      dimLengthIn && dimWidthIn && dimHeightIn
        ? `${dimLengthIn}in x ${dimWidthIn}in x ${dimHeightIn}in`
        : "";

    const clientEmail = user?.email || currentUser?.email || contactEmail;
    const clientName = user?.name || currentUser?.name || contactName || "Commercial Shipper";
    const clientPhone = user?.phone || contactPhone || "";
    const clientCompany = companyName || user?.companyName || currentUser?.companyName || "";

    const quoteData = {
      client: {
        name: clientName,
        companyName: clientCompany,
        email: clientEmail.toLowerCase().trim(),
        phone: clientPhone,
        userId: currentUser?.userId || "",
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
        dimensions,
        commodity: commodityType,
        preferredPickupDate: pickupDate || "",
        specialInstructions: specialInstructions || "",
      },
      status: "under_review" as const,
      submittedDate: formatDateLabel(now),
      validUntil: "7 Days from Dispatch",
      adminNotes: "New quote request received from client portal. Transimex freight coordinator assigned for rate review.",
    };

    // refNumber has a unique index; retry a couple of times on collision
    let quote;
    for (let attempt = 0; attempt < 3; attempt++) {
      const refNumber = `QT-2026-${Math.floor(10000 + Math.random() * 90000)}`;
      try {
        quote = await Quote.create({ ...quoteData, refNumber });
        break;
      } catch (createErr: any) {
        if (createErr?.code === 11000 && attempt < 2) continue;
        throw createErr;
      }
    }

    const mapped = mapQuote(quote!.toObject());

    try {
      await sendQuoteSubmittedEmail({
        to: mapped.clientEmail,
        name: mapped.clientName,
        companyName: mapped.clientCompany,
        quoteId: mapped.id,
        origin: mapped.origin,
        destination: mapped.destination,
        transportMode: mapped.transportMode,
      });
    } catch (mailErr) {
      console.warn("[Email Notification] Could not send quote submission confirmation:", mailErr);
    }

    return NextResponse.json({
      success: true,
      message: `Quote request ${mapped.id} submitted`,
      quote: mapped,
    });
  } catch (error: any) {
    console.error("Error creating quote:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit quote request" },
      { status: 500 }
    );
  }
}

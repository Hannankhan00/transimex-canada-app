import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongoose";
import Quote from "@/models/Quote";
import { verifyToken } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { sendQuotePriceOfferedEmail } from "@/lib/email";
import { notifyUser } from "@/lib/notifications";

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
        { error: "Calculated freight rate (CAD) is required to offer a quote" },
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
        { error: "This quote is missing client contact information and cannot be offered." },
        { status: 422 }
      );
    }

    const isRevision = existingQuote.status === "client_rejected";

    existingQuote.status = "quoted";
    existingQuote.priceCad = priceCad;
    if (priceUsd) existingQuote.priceUsd = priceUsd;
    if (breakdown) existingQuote.breakdown = breakdown;
    if (adminNotes) existingQuote.adminNotes = adminNotes;
    existingQuote.offeredAt = new Date().toISOString();

    await existingQuote.save();

    // Send email notification to client
    try {
      await sendQuotePriceOfferedEmail({
        to: existingQuote.client.email,
        name: existingQuote.client.name,
        companyName: existingQuote.client.companyName || "",
        quoteId: existingQuote.refNumber,
        origin: existingQuote.route?.origin || "",
        destination: existingQuote.route?.destination || "",
        priceCad,
        equipment: existingQuote.cargo?.equipment || "",
        validUntil: existingQuote.validUntil || "7 Days from Dispatch",
      });
    } catch (mailErr) {
      console.warn("[Email Notification] Could not send price offer email:", mailErr);
    }

    // Portal notification to client user
    await notifyUser({
      userId: existingQuote.client?.userId,
      category: "quote",
      title: isRevision
        ? `Revised Rate Offered — ${existingQuote.refNumber}`
        : `Guaranteed Rate Offered — ${existingQuote.refNumber}`,
      titleFr: isRevision
        ? `Tarif Révisé Proposé — ${existingQuote.refNumber}`
        : `Tarif Garanti Proposé — ${existingQuote.refNumber}`,
      desc: isRevision
        ? `Transimex dispatch submitted a revised quote offer of ${priceCad} for ${existingQuote.refNumber}. Review and accept or negotiate.`
        : `A freight rate of ${priceCad} has been calculated for quote ${existingQuote.refNumber}. Review and accept or negotiate in your portal.`,
      descFr: isRevision
        ? `La répartition Transimex a soumis une offre révisée de ${priceCad} pour ${existingQuote.refNumber}. Vérifiez et acceptez ou négociez.`
        : `Un tarif de fret de ${priceCad} a été calculé pour la soumission ${existingQuote.refNumber}. Vérifiez et acceptez ou négociez dans votre portail.`,
      link: `/dashboard/quotes`,
    });

    const cookieStore = await cookies();
    const actor = verifyToken(cookieStore.get("token")?.value || "");
    if (actor) {
      await logAudit({
        actor,
        action: isRevision ? "QUOTE_REVISED_OFFER" : "QUOTE_PRICE_OFFERED",
        resourceType: "Quote",
        resourceId: existingQuote.refNumber,
        details: `Quote ${existingQuote.refNumber} offered to client at ${priceCad} CAD.`,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Price offer ${priceCad} sent to client for quote ${existingQuote.refNumber}`,
      quote: existingQuote.toObject(),
    });
  } catch (error: any) {
    console.error("Error offering quote price:", error);
    return NextResponse.json(
      { error: error.message || "Failed to offer quote price" },
      { status: 500 }
    );
  }
}

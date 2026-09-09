import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongoose";
import Quote from "@/models/Quote";
import { getCurrentUser } from "@/lib/session";
import { verifyToken } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { sendQuoteNegotiationStaffEmail } from "@/lib/email";
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
    const body = await req.json();
    const { phone, reason, counterBudget } = body;

    // Strict validation: phone and reason are mandatory before rejecting
    if (!phone || !phone.trim() || phone.trim().length < 7) {
      return NextResponse.json(
        { error: "A direct contact phone number is required so our dispatch team can negotiate adjusted terms." },
        { status: 400 }
      );
    }

    if (!reason || !reason.trim() || reason.trim().length < 5) {
      return NextResponse.json(
        { error: "Please state your reason for declining this rate so we can provide a competitive counter-offer." },
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

    // Verify ownership or staff permissions
    const isOwner =
      (existingQuote.client?.userId && existingQuote.client.userId === currentUser.userId) ||
      (existingQuote.client?.email && existingQuote.client.email.toLowerCase() === currentUser.email.toLowerCase()) ||
      currentUser.role === "admin" ||
      currentUser.role === "staff";

    if (!isOwner) {
      return NextResponse.json({ error: "Unauthorized access to this quote" }, { status: 403 });
    }

    existingQuote.status = "client_rejected";
    existingQuote.rejectionBy = "client";
    existingQuote.clientNegotiationPhone = phone.trim();
    existingQuote.clientRejectionReason = reason.trim();
    if (counterBudget) existingQuote.clientCounterBudget = counterBudget.trim();
    existingQuote.clientRespondedAt = new Date().toISOString();

    const negotiationLogEntry = `\n[${new Date().toLocaleDateString("en-US")} Client Negotiation]: Declined rate (${existingQuote.priceCad || "N/A"}). Reason: ${reason.trim()} | Direct Phone: ${phone.trim()}${counterBudget ? ` | Target Budget: ${counterBudget.trim()}` : ""}`;
    existingQuote.adminNotes = (existingQuote.adminNotes || "") + negotiationLogEntry;

    await existingQuote.save();

    // Alert operations staff via email
    try {
      await sendQuoteNegotiationStaffEmail({
        quoteId: existingQuote.refNumber,
        clientName: existingQuote.client?.name || currentUser.name || "Commercial Client",
        clientCompany: existingQuote.client?.companyName || currentUser.companyName || "",
        clientPhone: phone.trim(),
        rejectionReason: reason.trim(),
        counterBudget: counterBudget?.trim(),
        origin: existingQuote.route?.origin || "",
        destination: existingQuote.route?.destination || "",
        offeredRate: existingQuote.priceCad,
      });
    } catch (mailErr) {
      console.warn("[Email Notification] Could not send negotiation alert to staff:", mailErr);
    }

    // Portal notification to user confirming receipt
    await notifyUser({
      userId: existingQuote.client?.userId,
      category: "quote",
      title: `Negotiation Request Logged — ${existingQuote.refNumber}`,
      titleFr: `Demande de Négociation Enregistrée — ${existingQuote.refNumber}`,
      desc: `Your feedback regarding rate ${existingQuote.priceCad || ""} has been received. Our dispatch team will contact you at ${phone.trim()} shortly.`,
      descFr: `Vos commentaires concernant le tarif ${existingQuote.priceCad || ""} ont été reçus. Notre équipe de répartition vous contactera sous peu au ${phone.trim()}.`,
      link: `/dashboard/quotes`,
    });

    const cookieStore = await cookies();
    const actor = verifyToken(cookieStore.get("token")?.value || "");
    if (actor) {
      await logAudit({
        actor,
        action: "QUOTE_CLIENT_REJECTED",
        resourceType: "Quote",
        resourceId: existingQuote.refNumber,
        details: `Client declined quote ${existingQuote.refNumber}. Contact Phone: ${phone.trim()}, Reason: ${reason.trim()}`,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Negotiation request submitted. A Transimex freight specialist will reach out to you at ${phone.trim()}.`,
      quote: existingQuote.toObject(),
    });
  } catch (error: any) {
    console.error("Error declining quote:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit quote decline" },
      { status: 500 }
    );
  }
}

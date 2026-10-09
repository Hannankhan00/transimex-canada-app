import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongoose";
import Quote from "@/models/Quote";
import { getCurrentUser } from "@/lib/session";
import { verifyToken } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { sendQuoteAcceptedEmail, sendInvoiceGeneratedEmail } from "@/lib/email";
import { notifyUser } from "@/lib/notifications";
import { createInvoiceForQuote } from "@/lib/invoice";
import { mapQuote } from "@/lib/quoteTypes";

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
          quote: mapQuote(existingQuote.toObject()),
        },
        { status: 200 }
      );
    }

    // Reserve a tracking ID now — the actual shipment record is created only
    // after the admin verifies the client's payment proof.
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const trackingId = `TMX-2026-${randomSuffix}`;

    existingQuote.status = "accepted";
    existingQuote.shipmentId = trackingId;
    existingQuote.clientRespondedAt = new Date().toISOString();
    await existingQuote.save();

    // Create the invoice so the client can pay — no shipment yet.
    const invoice = await createInvoiceForQuote(existingQuote, trackingId);

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

      try {
        await sendInvoiceGeneratedEmail({
          to: existingQuote.client.email,
          name: existingQuote.client.name,
          companyName: existingQuote.client.companyName || "",
          invoiceNumber: invoice.invoiceNumber,
          amountDisplay: invoice.amountDisplay,
          dueDate: invoice.dueDate,
          shipmentId: trackingId,
        });
      } catch (mailErr) {
        console.warn("[Email Notification] Could not send invoice generated email:", mailErr);
      }
    }

    // Portal notifications
    await notifyUser({
      userId: existingQuote.client?.userId,
      category: "quote",
      shipmentId: trackingId,
      title: `Quote Accepted — Invoice ${invoice.invoiceNumber} Ready`,
      titleFr: `Soumission Acceptée — Facture ${invoice.invoiceNumber} Prête`,
      desc: `Your freight booking for quote ${existingQuote.refNumber} has been confirmed. Please pay invoice ${invoice.invoiceNumber} to activate your shipment.`,
      descFr: `Votre réservation de fret pour la soumission ${existingQuote.refNumber} a été confirmée. Veuillez payer la facture ${invoice.invoiceNumber} pour activer votre expédition.`,
      link: `/dashboard/invoices/${invoice.invoiceNumber}`,
    });

    await notifyUser({
      userId: existingQuote.client?.userId,
      category: "quote",
      shipmentId: trackingId,
      title: `Invoice Ready — ${invoice.invoiceNumber}`,
      titleFr: `Facture Prête — ${invoice.invoiceNumber}`,
      desc: `Invoice ${invoice.invoiceNumber} for ${invoice.amountDisplay} is ready. Pay and upload your proof of payment in your Invoices page.`,
      descFr: `La facture ${invoice.invoiceNumber} de ${invoice.amountDisplay} est prête. Payez et téléversez votre preuve de paiement dans votre page Factures.`,
      link: `/dashboard/invoices/${invoice.invoiceNumber}`,
    });

    const cookieStore = await cookies();
    const actor = verifyToken(cookieStore.get("token")?.value || "");
    if (actor) {
      await logAudit({
        actor,
        action: "QUOTE_CLIENT_ACCEPTED",
        resourceType: "Quote",
        resourceId: existingQuote.refNumber,
        details: `Client accepted quote ${existingQuote.refNumber} at ${existingQuote.priceCad} CAD. Tracking ID reserved: ${trackingId}. Awaiting payment.`,
      });
      await logAudit({
        actor,
        action: "INVOICE_GENERATED",
        resourceType: "Invoice",
        resourceId: invoice.invoiceNumber,
        details: `Invoice ${invoice.invoiceNumber} (${invoice.amountDisplay}) generated for quote ${existingQuote.refNumber}.`,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Quote accepted successfully! Invoice ${invoice.invoiceNumber} is ready. Your shipment (${trackingId}) will be activated once payment is verified.`,
      trackingId,
      invoiceNumber: invoice.invoiceNumber,
      quote: mapQuote(existingQuote.toObject()),
    });
  } catch (error: any) {
    console.error("Error accepting quote:", error);
    return NextResponse.json(
      { error: error.message || "Failed to accept quote" },
      { status: 500 }
    );
  }
}

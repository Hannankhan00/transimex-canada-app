import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongoose";
import Shipment from "@/models/Shipment";
import { verifyToken } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { sendDutiesNoticeEmail } from "@/lib/email";
import { notifyUser } from "@/lib/notifications";
import { createInvoiceForDuties } from "@/lib/invoice";
import { BankAccountCurrency } from "@/models/BankAccount";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      dutiesAmount,
      taxesAmount,
      brokerageFee,
      totalOwed,
      wirePaymentInstructions,
    } = body;

    if (!totalOwed || totalOwed === "$0.00 CAD") {
      return NextResponse.json(
        { error: "Valid total duties assessment amount is required" },
        { status: 400 }
      );
    }

    await connectDB();
    const shipment = await Shipment.findOne({
      $or: [{ trackingNumber: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
    });

    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }

    // Recipient identity always comes from the shipment's real client record —
    // never from the request body, so the caller can't override it with a stale or fake identity.
    const recipientEmail = shipment.client?.email || "";
    const recipientName = shipment.client?.name || "";
    const recipientCompany = shipment.client?.companyName || "";

    if (!recipientEmail) {
      return NextResponse.json(
        { error: "Client contact information is incomplete, cannot send duties alert" },
        { status: 422 }
      );
    }

    shipment.duties = {
      amountCad: dutiesAmount || "$0.00 CAD",
      taxGstHst: taxesAmount || "$0.00 CAD",
      brokerageFeeCad: brokerageFee || "$0.00 CAD",
      totalOwed: totalOwed,
      status: "Notice Dispatched",
      dispatchedAt: new Date().toISOString(),
    };
    // Illuminate customs hold if not cleared
    if (shipment.customsStatus !== "Released") {
      shipment.customsStatus = "Held";
      shipment.status = "Customs Hold";
    }
    await shipment.save();

    // Auto-generate (or revise, if one is already outstanding) the duties
    // invoice for this shipment, using the company's current default bank
    // account for the assessed currency — never blocks the notice below.
    const dutiesCurrency: BankAccountCurrency = /USD/i.test(totalOwed) ? "USD" : "CAD";
    let invoice;
    try {
      invoice = await createInvoiceForDuties(shipment, {
        dutiesAmount,
        taxesAmount,
        brokerageFee,
        totalOwed,
        currency: dutiesCurrency,
      });
    } catch (invoiceErr) {
      console.warn("[Invoice] Could not generate duties invoice:", invoiceErr);
    }

    // Dispatch transactional email to client via SMTP
    try {
      await sendDutiesNoticeEmail({
        to: recipientEmail,
        name: recipientName,
        companyName: recipientCompany,
        trackingId: shipment.trackingNumber,
        dutiesAmount: dutiesAmount || "$0.00 CAD",
        taxesAmount: taxesAmount || "$0.00 CAD",
        brokerageFee: brokerageFee || "$0.00 CAD",
        totalOwed: totalOwed,
        portOfEntry: shipment.portOfEntry,
        cbsaPars: shipment.cbsaPars,
        wirePaymentInstructions,
      });
    } catch (mailErr) {
      console.warn("[Email Notification] Could not send duties notice email:", mailErr);
    }

    await notifyUser({
      userId: shipment.client?.userId,
      category: "customs",
      shipmentId: shipment.trackingNumber,
      title: `Duties Invoice Generated — ${shipment.trackingNumber}`,
      titleFr: `Facture de Droits Générée — ${shipment.trackingNumber}`,
      desc: invoice
        ? `A total of ${totalOwed} in duties and taxes has been assessed for shipment ${shipment.trackingNumber}. Invoice ${invoice.invoiceNumber} is ready in your Invoices page — pay and upload your proof of payment there.`
        : `A total of ${totalOwed} in duties and taxes has been assessed for shipment ${shipment.trackingNumber}. Check your email for payment instructions.`,
      descFr: invoice
        ? `Un total de ${totalOwed} en droits et taxes a été évalué pour l'expédition ${shipment.trackingNumber}. La facture ${invoice.invoiceNumber} est prête dans votre page Factures — payez et téléversez votre preuve de paiement là-bas.`
        : `Un total de ${totalOwed} en droits et taxes a été évalué pour l'expédition ${shipment.trackingNumber}. Consultez votre courriel pour les instructions de paiement.`,
      link: invoice ? `/dashboard/invoices/${invoice.invoiceNumber}` : `/dashboard/shipments?id=${shipment.trackingNumber}`,
    });

    // Best-effort audit trail entries — never block the response
    const actor = verifyToken((await cookies()).get("token")?.value || "");
    if (actor) {
      await logAudit({
        actor,
        action: "DUTIES_DISPATCHED",
        resourceType: "Shipment",
        resourceId: shipment.trackingNumber,
        details: `Dispatched duties notice to ${recipientEmail}: ${totalOwed} total owed.`,
      });
      if (invoice) {
        await logAudit({
          actor,
          action: "INVOICE_GENERATED",
          resourceType: "Invoice",
          resourceId: invoice.invoiceNumber,
          details: `Duties invoice ${invoice.invoiceNumber} (${invoice.amountDisplay}) generated for shipment ${shipment.trackingNumber}.`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Duties payment notice successfully dispatched to ${recipientEmail}`,
      shipmentId: shipment.trackingNumber,
      totalOwed,
      dispatchedTo: recipientEmail,
      invoiceNumber: invoice?.invoiceNumber,
    });
  } catch (error: any) {
    console.error("Error dispatching duties notice:", error);
    return NextResponse.json(
      { error: error.message || "Failed to dispatch duties notice" },
      { status: 500 }
    );
  }
}

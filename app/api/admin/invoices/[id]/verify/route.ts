import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import Quote from "@/models/Quote";
import Shipment from "@/models/Shipment";
import { verifyToken } from "@/lib/auth";
import { hasModulePermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notifications";
import { sendPaymentVerifiedEmail, sendPaymentRejectedEmail } from "@/lib/email";
import { findInvoiceByIdOrNumber, stripInvoiceBuffers } from "@/lib/invoice";

async function requireInvoicesAccess() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const actor = verifyToken(token);
  if (!actor) {
    return { error: NextResponse.json({ error: "Invalid session token" }, { status: 401 }) };
  }

  await connectDB();
  const actorUser = await User.findById(actor.userId).lean<any>();
  if (!actorUser || !hasModulePermission(actorUser, "invoices")) {
    return {
      error: NextResponse.json(
        { error: "Forbidden: You do not have permission to verify invoice payments." },
        { status: 403 }
      ),
    };
  }

  return { actor, actorUser };
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await requireInvoicesAccess();
    if (access.error) return access.error;

    const { id } = await params;
    const body = await req.json();
    const { action, reason } = body as { action: "verify" | "reject"; reason?: string };

    if (action !== "verify" && action !== "reject") {
      return NextResponse.json({ error: "action must be 'verify' or 'reject'" }, { status: 400 });
    }

    const invoice = await findInvoiceByIdOrNumber(id);
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    if (invoice.status !== "pending_verification") {
      return NextResponse.json(
        { error: "Only invoices awaiting verification can be verified or rejected." },
        { status: 400 }
      );
    }

    if (action === "verify") {
      invoice.status = "paid";
      invoice.verifiedAt = new Date().toISOString();
      invoice.verifiedBy = access.actor!.name || access.actor!.email;
      await invoice.save();

      // ── Shipment Creation ──────────────────────────────────────────────────
      // The shipment is deliberately not created until this point. The tracking
      // ID was reserved on the quote when the client accepted the price offer,
      // and the invoice carries that same ID as shipmentTrackingNumber. Now that
      // payment is confirmed, we can safely create the actual shipment record.
      let shipment: any = null;
      try {
        const trackingId = invoice.shipmentTrackingNumber;

        // Avoid double-creation if this handler is retried
        const existing = await Shipment.findOne({ trackingNumber: trackingId });
        if (!existing) {
          // Pull the full quote so we have the complete cargo/route data
          const quote = await Quote.findOne({ refNumber: invoice.quoteRefNumber }).lean<any>();

          shipment = await Shipment.create({
            trackingNumber: trackingId,
            quoteId: invoice.quoteRefNumber,
            client: {
              name: invoice.client.name,
              companyName: invoice.client.companyName || "",
              email: invoice.client.email,
              phone: invoice.client.phone || "",
              userId: invoice.client.userId || "",
            },
            route: {
              origin: invoice.route?.origin || quote?.route?.origin || "",
              originDetail: quote?.route?.originDetail || invoice.route?.origin || "",
              destination: invoice.route?.destination || quote?.route?.destination || "",
              destinationDetail: quote?.route?.destinationDetail || invoice.route?.destination || "",
            },
            cargo: quote?.cargo || {},
            status: "Pending Dispatch",
            rateCad: quote?.priceCad || "",
            assignedCarrier: "Transimex Dedicated Freight Network",
            eta: "3-5 Business Days",
            timeline: [
              {
                title: "Payment Verified — Shipment Activated",
                location: invoice.route?.origin || quote?.route?.origin || "Origin Terminal",
                timestamp: new Date().toISOString(),
                statusText: `Payment for invoice ${invoice.invoiceNumber} confirmed. Shipment activated from quote ${invoice.quoteRefNumber}.`,
                completed: true,
              },
              {
                title: "Customs Staging & Driver Dispatch",
                location: "Transimex Logistics Hub",
                timestamp: "Pending Dispatch",
                statusText: "Trailer equipment staged for pickup window",
                completed: false,
              },
            ],
          });
        } else {
          shipment = existing;
        }
      } catch (shipErr) {
        // Log but do not fail — the payment is verified; shipment creation
        // failure should not roll back the invoice status.
        console.error("[Shipment] Failed to create shipment after payment verification:", shipErr);
      }
      // ── End Shipment Creation ──────────────────────────────────────────────

      try {
        await sendPaymentVerifiedEmail({
          to: invoice.client.email,
          name: invoice.client.name,
          invoiceNumber: invoice.invoiceNumber,
          amountDisplay: invoice.amountDisplay,
        });
      } catch (mailErr) {
        console.warn("[Email Notification] Could not send payment verified email:", mailErr);
      }

      if (invoice.client.userId) {
        await notifyUser({
          userId: invoice.client.userId,
          category: "quote",
          title: `Payment Verified — ${invoice.invoiceNumber}`,
          titleFr: `Paiement Vérifié — ${invoice.invoiceNumber}`,
          desc: `Your payment of ${invoice.amountDisplay} for invoice ${invoice.invoiceNumber} has been verified. Your shipment ${invoice.shipmentTrackingNumber} is now active.`,
          descFr: `Votre paiement de ${invoice.amountDisplay} pour la facture ${invoice.invoiceNumber} a été vérifié. Votre expédition ${invoice.shipmentTrackingNumber} est maintenant active.`,
          link: `/dashboard/shipments?id=${invoice.shipmentTrackingNumber}`,
        });
      }

      await logAudit({
        actor: access.actor!,
        action: "PAYMENT_VERIFIED",
        resourceType: "Invoice",
        resourceId: invoice.invoiceNumber,
        details: `Payment of ${invoice.amountDisplay} for invoice ${invoice.invoiceNumber} verified. Shipment ${invoice.shipmentTrackingNumber} created.`,
      });

      if (shipment) {
        await logAudit({
          actor: access.actor!,
          action: "SHIPMENT_CREATED",
          resourceType: "Shipment",
          resourceId: invoice.shipmentTrackingNumber,
          details: `Shipment ${invoice.shipmentTrackingNumber} created after payment verification for invoice ${invoice.invoiceNumber}.`,
        });
      }
    } else {
      invoice.status = "unpaid";
      invoice.paymentRejectionReason = reason || "";
      invoice.rejectedAt = new Date().toISOString();
      await invoice.save();

      try {
        await sendPaymentRejectedEmail({
          to: invoice.client.email,
          name: invoice.client.name,
          invoiceNumber: invoice.invoiceNumber,
          reason,
        });
      } catch (mailErr) {
        console.warn("[Email Notification] Could not send payment rejected email:", mailErr);
      }

      if (invoice.client.userId) {
        await notifyUser({
          userId: invoice.client.userId,
          category: "quote",
          title: `Payment Proof Needs Attention — ${invoice.invoiceNumber}`,
          titleFr: `Preuve de Paiement à Revoir — ${invoice.invoiceNumber}`,
          desc: `We could not verify your payment proof for invoice ${invoice.invoiceNumber}. Please re-upload.`,
          descFr: `Nous n'avons pas pu vérifier votre preuve de paiement pour la facture ${invoice.invoiceNumber}. Veuillez la retéléverser.`,
          link: `/dashboard/invoices/${invoice.invoiceNumber}`,
        });
      }

      await logAudit({
        actor: access.actor!,
        action: "PAYMENT_REJECTED",
        resourceType: "Invoice",
        resourceId: invoice.invoiceNumber,
        details: `Payment proof for invoice ${invoice.invoiceNumber} rejected. Reason: ${reason || "n/a"}`,
      });
    }

    const invoiceObj: any = stripInvoiceBuffers(invoice.toObject());

    return NextResponse.json({
      success: true,
      message: action === "verify" ? "Payment verified and shipment activated" : "Payment proof rejected",
      invoice: { ...invoiceObj, id: invoice._id.toString() },
    });
  } catch (error: any) {
    console.error("Error verifying invoice payment:", error);
    return NextResponse.json({ error: error.message || "Failed to update invoice payment status" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
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
          desc: `Your payment of ${invoice.amountDisplay} for invoice ${invoice.invoiceNumber} has been verified.`,
          descFr: `Votre paiement de ${invoice.amountDisplay} pour la facture ${invoice.invoiceNumber} a été vérifié.`,
          link: `/dashboard/invoices/${invoice.invoiceNumber}`,
        });
      }

      await logAudit({
        actor: access.actor!,
        action: "PAYMENT_VERIFIED",
        resourceType: "Invoice",
        resourceId: invoice.invoiceNumber,
        details: `Payment of ${invoice.amountDisplay} for invoice ${invoice.invoiceNumber} verified.`,
      });
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
      message: action === "verify" ? "Payment verified" : "Payment proof rejected",
      invoice: { ...invoiceObj, id: invoice._id.toString() },
    });
  } catch (error: any) {
    console.error("Error verifying invoice payment:", error);
    return NextResponse.json({ error: error.message || "Failed to update invoice payment status" }, { status: 500 });
  }
}

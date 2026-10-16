import connectDB from "@/lib/mongoose";
import ExpressInvoice, { type IExpressInvoice } from "@/models/ExpressInvoice";
import { CHECKOUT_TTL_MINUTES } from "./payments/config";
import { PaymentError, type PaymentEvent, type PaymentProvider } from "./payments/types";
import { notifyInvoiceEvent } from "./invoiceNotify";

export type InvoiceCheckoutResult =
  | { ok: true; url: string; reused: boolean }
  | { ok: false; code: "not_found" | "not_payable" | "provider_error"; status: number; message: string };

/** Do not hand a client a payment page that is about to expire. */
const REUSE_MARGIN_MS = 5 * 60_000;

/**
 * Starts (or resumes) card payment for an unpaid invoice. Repeating the call
 * returns the same open payment page; the provider key is derived from the
 * attempt number, so a double click cannot create two sessions or two charges.
 */
export async function startInvoiceCheckout(params: {
  invoiceId: string;
  userId: string;
  customerEmail?: string;
  baseUrl: string;
  provider: PaymentProvider;
  now?: Date;
}): Promise<InvoiceCheckoutResult> {
  await connectDB();
  const now = params.now ?? new Date();

  const inv = await ExpressInvoice.findOne({ _id: params.invoiceId, userId: params.userId }).lean<IExpressInvoice>();
  if (!inv) return { ok: false, code: "not_found", status: 404, message: "Invoice not found" };
  if (inv.status !== "issued") return { ok: false, code: "not_payable", status: 409, message: "This invoice does not need payment." };

  const pay = inv.payment;
  if (pay?.state === "pending" && pay.sessionUrl && pay.sessionExpiresAt && new Date(pay.sessionExpiresAt).getTime() - now.getTime() > REUSE_MARGIN_MS) {
    return { ok: true, url: pay.sessionUrl, reused: true };
  }

  const attempt = pay?.attempts ?? 0;
  let session;
  try {
    session = await params.provider.createCheckoutSession({
      invoiceId: String(inv._id),
      reference: inv.number,
      amountCents: inv.totalCents,
      description: `Transimex Express invoice ${inv.number}`,
      customerEmail: params.customerEmail,
      successUrl: `${params.baseUrl}/express/invoices/${inv._id}?paid=1`,
      cancelUrl: `${params.baseUrl}/express/invoices/${inv._id}?cancelled=1`,
      idempotencyKey: `express-invoice-pay-${inv._id}-${attempt}`,
      expiresInMinutes: CHECKOUT_TTL_MINUTES,
    });
  } catch (error) {
    console.error("[Express] Could not create invoice checkout session:", error instanceof PaymentError ? error.detail || error.message : error);
    return { ok: false, code: "provider_error", status: 502, message: "We could not start the payment. Please try again shortly." };
  }

  const attemptMatches = attempt === 0 ? { $or: [{ "payment.attempts": 0 }, { "payment.attempts": { $exists: false } }] } : { "payment.attempts": attempt };
  const claimed = await ExpressInvoice.findOneAndUpdate(
    { _id: inv._id, status: "issued", ...attemptMatches },
    {
      $set: {
        "payment.provider": params.provider.name,
        "payment.state": "pending",
        "payment.sessionId": session.sessionId,
        "payment.sessionUrl": session.url,
        "payment.sessionExpiresAt": session.expiresAt,
      },
      $inc: { "payment.attempts": 1 },
    },
    { returnDocument: "after" }
  ).lean<IExpressInvoice>();

  if (!claimed) {
    const current = await ExpressInvoice.findById(inv._id).lean<IExpressInvoice>();
    if (current?.status === "issued" && current.payment?.sessionUrl) return { ok: true, url: current.payment.sessionUrl, reused: true };
    return { ok: false, code: "not_payable", status: 409, message: "This invoice no longer needs payment." };
  }

  if (pay?.sessionId && pay.sessionId !== session.sessionId) await params.provider.expireSession(pay.sessionId);
  return { ok: true, url: session.url, reused: false };
}

/**
 * Acts on a verified provider event for an invoice. Same guarantees as booking
 * payments: marking paid is an atomic transition only the first delivery wins,
 * the amount must match exactly, and a payment for an invoice that is already
 * paid or void is refunded.
 */
export async function handleInvoicePaymentEvent(event: PaymentEvent, provider: PaymentProvider): Promise<string> {
  await connectDB();
  const invoiceId = event.invoiceId;
  if (!invoiceId) return "ignored";
  const inv = await ExpressInvoice.findById(invoiceId).lean<IExpressInvoice>().catch(() => null);
  if (!inv) {
    console.warn("[Express] Payment event for an unknown invoice:", invoiceId);
    return "unknown_invoice";
  }

  if (event.type === "checkout.session.expired") {
    await ExpressInvoice.updateOne({ _id: inv._id, status: "issued", "payment.sessionId": event.sessionId, "payment.state": "pending" }, { $set: { "payment.state": "expired" } });
    return "session_expired";
  }

  if (event.paymentStatus !== "paid") return "not_paid";
  if (!event.paymentIntentId) return "no_payment_intent";

  if (event.amountTotalCents !== inv.totalCents || event.currency?.toLowerCase() !== "cad") {
    await ExpressInvoice.updateOne(
      { _id: inv._id },
      { $set: { "payment.state": "mismatch", "payment.mismatchNote": `Expected ${inv.totalCents} CAD cents, provider reported ${event.amountTotalCents} ${event.currency}.` } }
    );
    console.error("[Express] Invoice payment amount mismatch for", inv.number, event.amountTotalCents, event.currency);
    return "amount_mismatch";
  }

  const paid = await ExpressInvoice.findOneAndUpdate(
    { _id: inv._id, status: "issued" },
    {
      $set: {
        status: "paid",
        paidAt: new Date(),
        paidMethod: "card",
        "payment.state": "paid",
        "payment.provider": provider.name,
        "payment.sessionId": event.sessionId,
        "payment.paymentIntentId": event.paymentIntentId,
      },
    },
    { returnDocument: "after" }
  ).lean<IExpressInvoice>();

  if (paid) {
    await notifyInvoiceEvent(String(paid._id), "paid");
    return "paid";
  }

  const current = await ExpressInvoice.findById(inv._id).lean<IExpressInvoice>();
  if (current?.payment?.paymentIntentId === event.paymentIntentId) return "already_processed";
  if (current?.payment?.duplicatePayments?.some((d) => d.paymentIntentId === event.paymentIntentId)) return "duplicate_already_refunded";

  let refundId: string | undefined;
  try {
    const refund = await provider.refund({
      paymentIntentId: event.paymentIntentId,
      idempotencyKey: `express-dup-${event.paymentIntentId}`,
      reason: "Duplicate or late payment for an invoice that was already paid or void",
      shipmentId: String(inv._id),
    });
    refundId = refund.refundId;
  } catch (error) {
    console.error("[Express] Could not refund a duplicate invoice payment", event.paymentIntentId, error);
    throw error; // the provider redelivers, so the refund is attempted again
  }
  await ExpressInvoice.updateOne({ _id: inv._id }, { $push: { "payment.duplicatePayments": { paymentIntentId: event.paymentIntentId, refundId, at: new Date() } } });
  return "duplicate_payment_refunded";
}

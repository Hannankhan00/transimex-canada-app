import connectDB from "@/lib/mongoose";
import ExpressShipment, { type IExpressShipment } from "@/models/ExpressShipment";
import { CHECKOUT_TTL_MINUTES } from "./payments/config";
import { PaymentError, type PaymentEvent, type PaymentProvider } from "./payments/types";
import { fulfilShipment } from "./fulfilment";
import { notifyShipmentEvent } from "./shipmentNotify";
import { handleInvoicePaymentEvent } from "./invoicePayment";

export type CheckoutFailure = {
  ok: false;
  code: "not_found" | "not_payable" | "provider_error";
  status: number;
  message: string;
};
export type CheckoutResult = { ok: true; url: string; reused: boolean } | CheckoutFailure;

/** Do not hand a client a payment page that is about to expire. */
const REUSE_MARGIN_MS = 5 * 60_000;

/**
 * Starts (or resumes) card payment for an unpaid booking. Repeating the call
 * returns the same open payment page, and the provider key is derived from the
 * attempt number, so a double click cannot create two sessions or two charges.
 */
export async function startCheckout(params: {
  shipmentId: string;
  userId: string;
  customerEmail?: string;
  baseUrl: string;
  provider: PaymentProvider;
  now?: Date;
}): Promise<CheckoutResult> {
  await connectDB();
  const now = params.now ?? new Date();

  const sh = await ExpressShipment.findOne({ _id: params.shipmentId, userId: params.userId }).lean<IExpressShipment>();
  if (!sh) return { ok: false, code: "not_found", status: 404, message: "Shipment not found" };
  if (sh.status !== "awaiting_payment") {
    return { ok: false, code: "not_payable", status: 409, message: "This booking is not waiting for payment." };
  }

  const pay = sh.payment;
  if (pay?.state === "pending" && pay.sessionUrl && pay.sessionExpiresAt && new Date(pay.sessionExpiresAt).getTime() - now.getTime() > REUSE_MARGIN_MS) {
    return { ok: true, url: pay.sessionUrl, reused: true };
  }

  const attempt = pay?.attempts ?? 0;
  let session;
  try {
    session = await params.provider.createCheckoutSession({
      shipmentId: String(sh._id),
      reference: sh.reference,
      amountCents: sh.totalCents,
      description: `${sh.shipper.city} to ${sh.recipient.city}, ${sh.recipient.countryCode}`,
      customerEmail: params.customerEmail,
      successUrl: `${params.baseUrl}/express/shipments/${sh._id}?paid=1`,
      cancelUrl: `${params.baseUrl}/express/shipments/${sh._id}?cancelled=1`,
      idempotencyKey: `express-pay-${sh._id}-${attempt}`,
      expiresInMinutes: CHECKOUT_TTL_MINUTES,
    });
  } catch (error) {
    console.error("[Express] Could not create checkout session:", error instanceof PaymentError ? error.detail || error.message : error);
    return { ok: false, code: "provider_error", status: 502, message: "We could not start the payment. Please try again shortly." };
  }

  // Claim this attempt. If a parallel request already did, return its session instead of a second one.
  const attemptMatches = attempt === 0 ? { $or: [{ "payment.attempts": 0 }, { "payment.attempts": { $exists: false } }] } : { "payment.attempts": attempt };
  const claimed = await ExpressShipment.findOneAndUpdate(
    { _id: sh._id, status: "awaiting_payment", ...attemptMatches },
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
  ).lean<IExpressShipment>();

  if (!claimed) {
    const current = await ExpressShipment.findById(sh._id).lean<IExpressShipment>();
    if (current?.status === "awaiting_payment" && current.payment?.sessionUrl) {
      return { ok: true, url: current.payment.sessionUrl, reused: true };
    }
    return { ok: false, code: "not_payable", status: 409, message: "This booking is no longer waiting for payment." };
  }

  // The previous payment page must not stay payable once this one replaces it.
  if (pay?.sessionId && pay.sessionId !== session.sessionId) {
    await params.provider.expireSession(pay.sessionId);
  }
  return { ok: true, url: session.url, reused: false };
}

const centsMatch = (event: PaymentEvent, sh: IExpressShipment) => event.amountTotalCents === sh.totalCents && event.currency?.toLowerCase() === "cad";

/**
 * Acts on a verified provider event. Idempotent by construction: marking a
 * booking paid is an atomic transition that only the first delivery wins, and
 * a payment for a booking that is already paid or cancelled is refunded.
 * Returns a short outcome label for the event log.
 */
export async function handlePaymentEvent(event: PaymentEvent, provider: PaymentProvider): Promise<string> {
  await connectDB();

  if (event.type === "other") return "ignored";
  if (event.invoiceId) return handleInvoicePaymentEvent(event, provider);
  if (!event.shipmentId) return "ignored";
  const sh = await ExpressShipment.findById(event.shipmentId).lean<IExpressShipment>().catch(() => null);
  if (!sh) {
    console.warn("[Express] Payment event for an unknown shipment:", event.shipmentId);
    return "unknown_shipment";
  }

  if (event.type === "checkout.session.expired") {
    // The session lapsed unpaid: the booking stays awaiting_payment and the client can retry.
    await ExpressShipment.updateOne(
      { _id: sh._id, status: "awaiting_payment", "payment.sessionId": event.sessionId, "payment.state": "pending" },
      { $set: { "payment.state": "expired" } }
    );
    return "session_expired";
  }

  // checkout.session.completed
  if (event.paymentStatus !== "paid") return "not_paid";
  if (!event.paymentIntentId) return "no_payment_intent";

  if (!centsMatch(event, sh)) {
    // Never mark a booking paid for the wrong amount. Staff look at it.
    await ExpressShipment.updateOne(
      { _id: sh._id },
      { $set: { "payment.state": "mismatch", "payment.mismatchNote": `Expected ${sh.totalCents} CAD cents, provider reported ${event.amountTotalCents} ${event.currency}.` } }
    );
    console.error("[Express] Payment amount mismatch for", sh.reference, event.amountTotalCents, event.currency);
    return "amount_mismatch";
  }

  const paid = await ExpressShipment.findOneAndUpdate(
    { _id: sh._id, status: "awaiting_payment" },
    {
      $set: {
        status: "paid",
        "payment.state": "paid",
        "payment.provider": provider.name,
        "payment.sessionId": event.sessionId,
        "payment.paymentIntentId": event.paymentIntentId,
        "payment.amountCents": event.amountTotalCents,
        "payment.paidAt": new Date(),
      },
      $push: { statusHistory: { status: "paid", at: new Date(), by: "system" } },
    },
    { returnDocument: "after" }
  ).lean<IExpressShipment>();

  if (paid) {
    await notifyShipmentEvent(String(paid._id), "payment_received");
    // A fulfilment problem is recorded on the booking for staff; it must not make the provider retry the webhook.
    try {
      await fulfilShipment(String(paid._id));
    } catch (error) {
      console.error("[Express] Fulfilment threw for", paid.reference, error);
    }
    return "paid";
  }

  // Not awaiting payment any more: either this very payment already counted, or it is a second payment.
  const current = await ExpressShipment.findById(sh._id).lean<IExpressShipment>();
  if (current?.payment?.paymentIntentId === event.paymentIntentId) return "already_processed";
  if (current?.payment?.duplicatePayments?.some((d) => d.paymentIntentId === event.paymentIntentId)) return "duplicate_already_refunded";

  let refundId: string | undefined;
  try {
    const refund = await provider.refund({
      paymentIntentId: event.paymentIntentId,
      idempotencyKey: `express-dup-${event.paymentIntentId}`,
      reason: "Duplicate or late payment for a booking that was already paid or cancelled",
      shipmentId: String(sh._id),
    });
    refundId = refund.refundId;
  } catch (error) {
    console.error("[Express] Could not refund a duplicate payment", event.paymentIntentId, error);
    throw error; // let the provider redeliver so the refund is attempted again
  }
  await ExpressShipment.updateOne(
    { _id: sh._id },
    { $push: { "payment.duplicatePayments": { paymentIntentId: event.paymentIntentId, refundId, at: new Date() } } }
  );
  return "duplicate_payment_refunded";
}

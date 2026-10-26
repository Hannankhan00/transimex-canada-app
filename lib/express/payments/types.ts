/**
 * Payment provider boundary. Core code (checkout, webhook handling, refunds)
 * talks only to PaymentProvider, so Stripe specifics stay in stripe.ts and the
 * test-mode stand-in in mock.ts behaves the same way from the outside.
 * All money is integer CAD cents. Card details never touch our servers: the
 * client pays on the provider's hosted page.
 */

export interface CheckoutParams {
  /** Exactly one of shipmentId (a booking) or invoiceId (a weekly invoice) is set. */
  shipmentId?: string;
  invoiceId?: string;
  reference: string;
  amountCents: number;
  description: string;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
  /** Same key => same session, so a double click cannot create two charges. */
  idempotencyKey: string;
  /** How long the hosted page stays payable. */
  expiresInMinutes: number;
}

export interface CheckoutSession {
  sessionId: string;
  url: string;
  expiresAt: Date;
}

export interface RefundParams {
  paymentIntentId: string;
  /** Omit for a full refund of what is left. */
  amountCents?: number;
  /** Same key => same refund, so a retry cannot refund twice. */
  idempotencyKey: string;
  reason: string;
  shipmentId: string;
}

export interface RefundResult {
  refundId: string;
  amountCents: number;
  status: "succeeded" | "pending" | "failed";
}

/** A provider webhook, reduced to what we act on. Anything else is "other". */
export interface PaymentEvent {
  id: string;
  type: "checkout.session.completed" | "checkout.session.expired" | "other";
  rawType: string;
  sessionId?: string;
  paymentIntentId?: string;
  amountTotalCents?: number;
  currency?: string;
  paymentStatus?: string;
  shipmentId?: string;
  invoiceId?: string;
}

export interface PaymentProvider {
  readonly name: "stripe";
  createCheckoutSession(params: CheckoutParams): Promise<CheckoutSession>;
  /** Best effort: an old session must not stay payable once a new one replaces it. */
  expireSession(sessionId: string): Promise<void>;
  refund(params: RefundParams): Promise<RefundResult>;
  /**
   * Asks the provider directly whether a payment page was paid. Returns a "completed" event when it was, or null
   * when it was not (yet). This is a second route to the same fact the webhook reports, for when the webhook is late
   * or never arrives. Acting on the result is idempotent, exactly like the webhook.
   */
  retrieveCheckout(sessionId: string): Promise<PaymentEvent | null>;
  /** Verifies the signature and returns the event. Throws PaymentError("signature") when invalid. */
  verifyWebhook(rawBody: string, signatureHeader: string | null): PaymentEvent;
}

export type PaymentErrorCode = "config" | "signature" | "provider";

export class PaymentError extends Error {
  constructor(
    readonly code: PaymentErrorCode,
    message: string,
    readonly detail?: string
  ) {
    super(message);
    this.name = "PaymentError";
  }
}

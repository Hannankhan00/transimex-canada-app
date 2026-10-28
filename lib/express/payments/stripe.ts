import Stripe from "stripe";
import {
  PaymentError,
  type CheckoutParams,
  type CheckoutSession,
  type PaymentEvent,
  type PaymentProvider,
  type RefundParams,
  type RefundResult,
} from "./types";

/** Maps a verified Stripe event to the small shape the rest of the app understands. */
export function normalizeStripeEvent(event: Stripe.Event): PaymentEvent {
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.expired") {
    const s = event.data.object as Stripe.Checkout.Session;
    const intent = typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id;
    return {
      id: event.id,
      type: event.type,
      rawType: event.type,
      sessionId: s.id,
      paymentIntentId: intent || undefined,
      amountTotalCents: s.amount_total ?? undefined,
      currency: s.currency ?? undefined,
      paymentStatus: s.payment_status,
      // An invoice payment carries invoiceId in its metadata; its client_reference_id must not be mistaken for a booking.
      shipmentId: s.metadata?.shipmentId || (s.metadata?.invoiceId ? undefined : s.client_reference_id) || undefined,
      invoiceId: s.metadata?.invoiceId || undefined,
      connectedAccountId: event.account || undefined,
    };
  }
  return { id: event.id, type: "other", rawType: event.type };
}

/** Real Stripe Checkout (hosted page, cards only, CAD). */
export class StripePaymentProvider implements PaymentProvider {
  readonly name = "stripe" as const;
  private readonly stripe: Stripe;

  constructor(
    secretKey: string,
    private readonly webhookSecret: string,
    stripe?: Stripe,
    /** Signing secret of the webhook endpoint that listens to events on partners' connected accounts. */
    private readonly connectWebhookSecret?: string
  ) {
    this.stripe = stripe ?? new Stripe(secretKey);
  }

  async createCheckoutSession(p: CheckoutParams): Promise<CheckoutSession> {
    try {
      const expiresAt = Math.floor(Date.now() / 1000) + p.expiresInMinutes * 60;
      const session = await this.stripe.checkout.sessions.create(
        {
          mode: "payment",
          // Cards only at launch.
          allowed_payment_method_types: ["card"],
          line_items: [
            {
              quantity: 1,
              price_data: {
                currency: "cad",
                unit_amount: p.amountCents,
                product_data: { name: `Transimex Express ${p.invoiceId ? "invoice" : "shipment"} ${p.reference}`, description: p.description },
              },
            },
          ],
          client_reference_id: p.shipmentId ?? p.invoiceId,
          customer_email: p.customerEmail,
          metadata: p.invoiceId ? { invoiceId: p.invoiceId, reference: p.reference } : { shipmentId: p.shipmentId!, reference: p.reference },
          payment_intent_data: {
            metadata: p.invoiceId ? { invoiceId: p.invoiceId, reference: p.reference } : { shipmentId: p.shipmentId!, reference: p.reference },
            description: `Express ${p.reference}`,
            ...(p.connect ? { application_fee_amount: p.connect.applicationFeeCents } : {}),
          },
          success_url: p.successUrl,
          cancel_url: p.cancelUrl,
          expires_at: expiresAt,
        },
        { idempotencyKey: p.idempotencyKey, ...(p.connect ? { stripeAccount: p.connect.accountId } : {}) }
      );
      if (!session.url) throw new Error("Stripe returned no checkout URL");
      return { sessionId: session.id, url: session.url, expiresAt: new Date(expiresAt * 1000) };
    } catch (error: any) {
      throw new PaymentError("provider", "Could not start the payment.", error?.message);
    }
  }

  async expireSession(sessionId: string, connectedAccountId?: string): Promise<void> {
    try {
      await this.stripe.checkout.sessions.expire(sessionId, {}, connectedAccountId ? { stripeAccount: connectedAccountId } : undefined);
    } catch (error: any) {
      // Already expired or completed: nothing to do.
      console.warn("[Express] Could not expire checkout session", sessionId, error?.message);
    }
  }

  async refund(p: RefundParams): Promise<RefundResult> {
    try {
      const refund = await this.stripe.refunds.create(
        {
          payment_intent: p.paymentIntentId,
          ...(p.amountCents !== undefined ? { amount: p.amountCents } : {}),
          metadata: { shipmentId: p.shipmentId, reason: p.reason.slice(0, 200) },
          // The refund comes out of the partner's balance; Transimex gives back its share of the fee with it.
          ...(p.connectedAccountId ? { refund_application_fee: true } : {}),
        },
        { idempotencyKey: p.idempotencyKey, ...(p.connectedAccountId ? { stripeAccount: p.connectedAccountId } : {}) }
      );
      return {
        refundId: refund.id,
        amountCents: refund.amount,
        status: refund.status === "succeeded" ? "succeeded" : refund.status === "failed" || refund.status === "canceled" ? "failed" : "pending",
      };
    } catch (error: any) {
      throw new PaymentError("provider", "The refund could not be issued.", error?.message);
    }
  }

  async retrieveCheckout(sessionId: string, connectedAccountId?: string): Promise<PaymentEvent | null> {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId, {}, connectedAccountId ? { stripeAccount: connectedAccountId } : undefined);
      if (session.status !== "complete" || session.payment_status !== "paid") return null;
      // Shaped like the webhook event so one code path handles both.
      return normalizeStripeEvent({ id: `sync_${session.id}`, type: "checkout.session.completed", data: { object: session }, ...(connectedAccountId ? { account: connectedAccountId } : {}) } as unknown as Stripe.Event);
    } catch (error: any) {
      throw new PaymentError("provider", "Could not check the payment.", error?.message);
    }
  }

  verifyWebhook(rawBody: string, signatureHeader: string | null): PaymentEvent {
    if (!signatureHeader) throw new PaymentError("signature", "Missing signature header.");
    try {
      return normalizeStripeEvent(this.stripe.webhooks.constructEvent(rawBody, signatureHeader, this.webhookSecret));
    } catch (error: any) {
      // Events from partners' connected accounts are signed with the Connect endpoint's own secret.
      if (this.connectWebhookSecret) {
        try {
          return normalizeStripeEvent(this.stripe.webhooks.constructEvent(rawBody, signatureHeader, this.connectWebhookSecret));
        } catch {
          // fall through to the original error
        }
      }
      throw new PaymentError("signature", "Invalid webhook signature.", error?.message);
    }
  }
}

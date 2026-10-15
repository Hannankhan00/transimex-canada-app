import { createHash } from "node:crypto";
import Stripe from "stripe";
import { MOCK_WEBHOOK_SECRET } from "./config";
import { normalizeStripeEvent } from "./stripe";
import {
  PaymentError,
  type CheckoutParams,
  type CheckoutSession,
  type PaymentEvent,
  type PaymentProvider,
  type RefundParams,
  type RefundResult,
} from "./types";

/**
 * TEST MODE ONLY. A stand-in for Stripe while there are no Stripe keys: no real
 * money moves. It sends events signed in Stripe's exact format and verifies
 * them with Stripe's own library, so the real webhook route and signature
 * checking are exercised. Disabled in production (see getPaymentsMode).
 */

const hash = (value: string, length = 24) => createHash("sha256").update(value).digest("hex").slice(0, length);

/** A Stripe client used only to sign and verify webhooks locally. It never calls the network. */
const signer = () => new Stripe("sk_test_mock_signer_only");

export const mockWebhookSecret = () => process.env.STRIPE_WEBHOOK_SECRET?.trim() || MOCK_WEBHOOK_SECRET;

export const mockPaymentIntentId = (sessionId: string) => `pi_mock_${hash(sessionId)}`;

export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock" as const;

  async createCheckoutSession(p: CheckoutParams): Promise<CheckoutSession> {
    // Same key => same session id, like Stripe's idempotency.
    const sessionId = `cs_mock_${hash(p.idempotencyKey)}`;
    const origin = new URL(p.successUrl).origin;
    return {
      sessionId,
      url: `${origin}/express/mock-pay/${sessionId}`,
      expiresAt: new Date(Date.now() + p.expiresInMinutes * 60_000),
    };
  }

  async expireSession(): Promise<void> {
    // State lives on the shipment; replacing the session id is enough.
  }

  async refund(p: RefundParams): Promise<RefundResult> {
    // Test hook: a payment intent ending in _refundfail simulates a provider that rejects the refund.
    if (p.paymentIntentId.endsWith("_refundfail")) throw new PaymentError("provider", "Refund failed", "Mock refund failure");
    return { refundId: `re_mock_${hash(p.idempotencyKey)}`, amountCents: p.amountCents ?? 0, status: "succeeded" };
  }

  verifyWebhook(rawBody: string, signatureHeader: string | null): PaymentEvent {
    if (!signatureHeader) throw new PaymentError("signature", "Missing signature header.");
    try {
      return normalizeStripeEvent(signer().webhooks.constructEvent(rawBody, signatureHeader, mockWebhookSecret()));
    } catch (error: any) {
      throw new PaymentError("signature", "Invalid webhook signature.", error?.message);
    }
  }
}

export interface MockEventInput {
  eventId: string;
  type: "checkout.session.completed" | "checkout.session.expired";
  sessionId: string;
  shipmentId: string;
  reference: string;
  amountCents: number;
  paid: boolean;
}

/** Builds a Stripe-shaped, correctly signed webhook delivery for the test-mode checkout page. */
export function buildMockWebhook(input: MockEventInput): { payload: string; header: string } {
  const payload = JSON.stringify({
    id: input.eventId,
    object: "event",
    api_version: "2025-01-01",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    type: input.type,
    data: {
      object: {
        id: input.sessionId,
        object: "checkout.session",
        amount_total: input.amountCents,
        currency: "cad",
        payment_status: input.paid ? "paid" : "unpaid",
        payment_intent: input.paid ? mockPaymentIntentId(input.sessionId) : null,
        client_reference_id: input.shipmentId,
        metadata: { shipmentId: input.shipmentId, reference: input.reference },
      },
    },
  });
  const header = signer().webhooks.generateTestHeaderString({ payload, secret: mockWebhookSecret() });
  return { payload, header };
}

import { describe, expect, it, vi } from "vitest";
import Stripe from "stripe";

// These tests never touch a database; the real helper refuses to load without a connection string.
vi.mock("@/lib/mongoose", () => ({ default: async () => undefined }));

import { getPaymentsMode, getStripeConfig, MOCK_WEBHOOK_SECRET } from "../payments/config";
import { MockPaymentProvider, buildMockWebhook, mockPaymentIntentId } from "../payments/mock";
import { StripePaymentProvider, normalizeStripeEvent } from "../payments/stripe";
import { PaymentError } from "../payments/types";
import { buildShipmentRequest } from "../fulfilment";
import { isPdf } from "../labelStore";
import { refundableCents } from "../cancelService";
import { attentionReasons, toAdminShipmentDTO, toClientShipmentDTO } from "../shipmentDto";

describe("payments configuration", () => {
  it("is off unless configured, and rejects typos", () => {
    expect(getPaymentsMode({})).toBe("off");
    expect(getPaymentsMode({ PAYMENTS_MODE: "stripe" })).toBe("stripe");
    expect(() => getPaymentsMode({ PAYMENTS_MODE: "strip" })).toThrow(PaymentError);
  });

  it("refuses the test-mode stand-in in production", () => {
    expect(getPaymentsMode({ PAYMENTS_MODE: "mock", NODE_ENV: "development" })).toBe("mock");
    expect(() => getPaymentsMode({ PAYMENTS_MODE: "mock", NODE_ENV: "production" })).toThrow(/production/);
  });

  it("real Stripe needs both keys, from the environment only", () => {
    expect(() => getStripeConfig({})).toThrow(/STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET/);
    expect(() => getStripeConfig({ STRIPE_SECRET_KEY: "sk_test_x" })).toThrow(/STRIPE_WEBHOOK_SECRET/);
    expect(getStripeConfig({ STRIPE_SECRET_KEY: "sk_test_x", STRIPE_WEBHOOK_SECRET: "whsec_x" })).toEqual({ secretKey: "sk_test_x", webhookSecret: "whsec_x" });
  });
});

describe("Stripe provider", () => {
  const fakeStripe = () => {
    const create = vi.fn(async (_params: any, _opts: any) => ({ id: "cs_test_1", url: "https://checkout.stripe.test/c/1" }));
    const expire = vi.fn(async () => ({}));
    const refund = vi.fn(async (_params: any, _opts: any) => ({ id: "re_1", amount: 1000, status: "succeeded" }));
    const real = new Stripe("sk_test_x");
    const stripe = { checkout: { sessions: { create, expire } }, refunds: { create: refund }, webhooks: real.webhooks } as unknown as Stripe;
    return { stripe, create, expire, refund };
  };

  const checkout = {
    shipmentId: "abc123",
    reference: "EX-261015-K7QZ4",
    amountCents: 16476,
    description: "Toronto to Douala, CM",
    customerEmail: "a@example.com",
    successUrl: "https://app.test/ok",
    cancelUrl: "https://app.test/no",
    idempotencyKey: "express-pay-abc123-0",
    expiresInMinutes: 120,
  };

  it("creates a hosted Checkout session in CAD, cards only, with the shipment id in the metadata and an idempotency key", async () => {
    const { stripe, create } = fakeStripe();
    const session = await new StripePaymentProvider("sk_test_x", "whsec_x", stripe).createCheckoutSession(checkout);

    expect(session).toMatchObject({ sessionId: "cs_test_1", url: "https://checkout.stripe.test/c/1" });
    const [params, options] = create.mock.calls[0];
    expect(params.mode).toBe("payment");
    expect(params.line_items[0].price_data.currency).toBe("cad");
    expect(params.line_items[0].price_data.unit_amount).toBe(16476);
    expect(params.allowed_payment_method_types).toEqual(["card"]);
    expect(params.metadata).toMatchObject({ shipmentId: "abc123", reference: "EX-261015-K7QZ4" });
    expect(params.payment_intent_data.metadata.shipmentId).toBe("abc123");
    expect(params.client_reference_id).toBe("abc123");
    expect(params.success_url).toBe("https://app.test/ok");
    expect(options.idempotencyKey).toBe("express-pay-abc123-0");
    const secondsAhead = params.expires_at - Math.floor(Date.now() / 1000);
    expect(secondsAhead).toBeGreaterThan(30 * 60);
    expect(secondsAhead).toBeLessThanOrEqual(24 * 3600);
  });

  it("turns a Stripe failure into a PaymentError without leaking details to callers", async () => {
    const { stripe, create } = fakeStripe();
    create.mockRejectedValueOnce(new Error("Invalid API Key provided: sk_test_***"));
    await expect(new StripePaymentProvider("sk_test_x", "whsec_x", stripe).createCheckoutSession(checkout)).rejects.toMatchObject({ code: "provider", message: "Could not start the payment." });
  });

  it("refunds with an idempotency key so a retry cannot refund twice", async () => {
    const { stripe, refund } = fakeStripe();
    const result = await new StripePaymentProvider("sk_test_x", "whsec_x", stripe).refund({
      paymentIntentId: "pi_1",
      amountCents: 1000,
      idempotencyKey: "express-refund-abc-0-1000",
      reason: "Customer asked",
      shipmentId: "abc",
    });
    expect(result).toEqual({ refundId: "re_1", amountCents: 1000, status: "succeeded" });
    const [params, options] = refund.mock.calls[0];
    expect(params).toMatchObject({ payment_intent: "pi_1", amount: 1000 });
    expect(options.idempotencyKey).toBe("express-refund-abc-0-1000");
  });

  it("verifies webhook signatures with Stripe's own algorithm", () => {
    const provider = new StripePaymentProvider("sk_test_x", "whsec_real_secret", fakeStripe().stripe);
    const payload = JSON.stringify({
      id: "evt_1", object: "event", type: "checkout.session.completed", api_version: "2025-01-01", created: 1, livemode: false,
      data: { object: { id: "cs_1", object: "checkout.session", amount_total: 500, currency: "cad", payment_status: "paid", payment_intent: "pi_1", metadata: { shipmentId: "s1" } } },
    });
    const header = new Stripe("sk_test_x").webhooks.generateTestHeaderString({ payload, secret: "whsec_real_secret" });

    expect(provider.verifyWebhook(payload, header)).toMatchObject({ id: "evt_1", type: "checkout.session.completed", sessionId: "cs_1", paymentIntentId: "pi_1", amountTotalCents: 500, currency: "cad", paymentStatus: "paid", shipmentId: "s1" });
    expect(() => provider.verifyWebhook(payload.replace("500", "1"), header)).toThrow(PaymentError);
    expect(() => provider.verifyWebhook(payload, "t=1,v1=00")).toThrow(PaymentError);
    expect(() => provider.verifyWebhook(payload, null)).toThrow(PaymentError);
    const wrongSecret = new Stripe("sk_test_x").webhooks.generateTestHeaderString({ payload, secret: "whsec_someone_else" });
    expect(() => provider.verifyWebhook(payload, wrongSecret)).toThrow(/signature/i);
  });

  it("ignores event types it does not act on", () => {
    const e = normalizeStripeEvent({ id: "evt_2", type: "charge.refunded", data: { object: {} } } as unknown as Stripe.Event);
    expect(e).toEqual({ id: "evt_2", type: "other", rawType: "charge.refunded" });
  });
});

describe("test-mode provider", () => {
  const provider = new MockPaymentProvider();
  const input = { eventId: "evt_1", type: "checkout.session.completed" as const, sessionId: "cs_mock_1", shipmentId: "s1", reference: "EX-1", amountCents: 1234, paid: true };

  it("signs events that verify through Stripe's real library", () => {
    const { payload, header } = buildMockWebhook(input);
    expect(provider.verifyWebhook(payload, header)).toMatchObject({ id: "evt_1", sessionId: "cs_mock_1", paymentIntentId: mockPaymentIntentId("cs_mock_1"), amountTotalCents: 1234, shipmentId: "s1" });
  });

  it("rejects a tampered body or a wrong signature", () => {
    const { payload, header } = buildMockWebhook(input);
    expect(() => provider.verifyWebhook(payload.replace("1234", "1"), header)).toThrow(PaymentError);
    expect(() => provider.verifyWebhook(payload, `t=1,v1=${"0".repeat(64)}`)).toThrow(PaymentError);
  });

  it("gives the same session for the same idempotency key", async () => {
    const base = { shipmentId: "s1", reference: "EX-1", amountCents: 100, description: "d", successUrl: "http://localhost:3000/ok", cancelUrl: "http://localhost:3000/no", expiresInMinutes: 120 };
    const a = await provider.createCheckoutSession({ ...base, idempotencyKey: "k-0" });
    const b = await provider.createCheckoutSession({ ...base, idempotencyKey: "k-0" });
    const c = await provider.createCheckoutSession({ ...base, idempotencyKey: "k-1" });
    expect(a.sessionId).toBe(b.sessionId);
    expect(a.sessionId).not.toBe(c.sessionId);
    expect(a.url).toContain("/express/mock-pay/");
  });

  it("uses a clearly dev-only default secret", () => {
    expect(MOCK_WEBHOOK_SECRET).toContain("mock_dev_only");
  });
});

describe("label creation request", () => {
  const sh = {
    reference: "EX-1",
    shipper: { line1: "1", city: "Toronto", postalCode: "M5V", countryCode: "CA" },
    recipient: { line1: "2", city: "Douala", postalCode: "00237", countryCode: "CM" },
    parcels: [{ weightKg: 1, lengthCm: 10, widthCm: 10, heightCm: 10 }],
    items: [],
    declaredValueCents: 100,
    contentDescription: "x",
    plannedShipDate: "2026-11-02",
    dutiesPayer: "sender" as const,
    pickupRequested: true,
  };

  it("uses the booking reference as DHL's stable reference and passes the choices through", () => {
    const r = buildShipmentRequest(sh as any, new Date("2026-11-01T12:00:00Z"));
    expect(r.reference).toBe("EX-1");
    expect(r.dutiesPayer).toBe("sender");
    expect(r.pickupRequested).toBe(true);
    expect(r.plannedShipDate).toBe("2026-11-02");
  });

  it("never ships in the past: a booking paid days later ships today", () => {
    expect(buildShipmentRequest(sh as any, new Date("2026-11-10T12:00:00Z")).plannedShipDate).toBe("2026-11-10");
  });
});

describe("label files and refunds", () => {
  it("recognises real PDFs by content, not by name", () => {
    expect(isPdf(Buffer.from("%PDF-1.4\n...stuff..."))).toBe(true);
    expect(isPdf(Buffer.from("<html>not a pdf</html>"))).toBe(false);
    expect(isPdf(Buffer.from("%PDF"))).toBe(false);
    expect(isPdf(Buffer.alloc(0))).toBe(false);
  });

  it("computes what is still refundable", () => {
    expect(refundableCents({ payment: { amountCents: 1000, refundedCents: 300 } } as any)).toBe(700);
    expect(refundableCents({ payment: { amountCents: 1000, refundedCents: 1000 } } as any)).toBe(0);
    expect(refundableCents({ payment: { refundedCents: 5 } } as any)).toBe(0);
    expect(refundableCents({} as any)).toBe(0);
  });
});

describe("what clients and staff can see", () => {
  const base = {
    _id: "s1",
    reference: "EX-1",
    userId: "u1",
    accountId: "a1",
    accountType: "b2c" as const,
    quoteId: "q1",
    status: "label_ready" as const,
    statusHistory: [{ status: "paid" as const, at: new Date(), by: "SECRET-STAFF-ID" }],
    shipper: {} as any,
    recipient: {} as any,
    parcels: [],
    items: [],
    totalCents: 14976,
    dutiesPayer: "recipient" as const,
    payment: {
      provider: "stripe" as const,
      state: "paid" as const,
      attempts: 2,
      sessionId: "cs_live_SECRET",
      sessionUrl: "https://checkout.stripe.com/SECRET",
      paymentIntentId: "pi_SECRET",
      amountCents: 14976,
      paidAt: new Date(),
      refundedCents: 500,
      refunds: [{ refundId: "re_SECRET", amountCents: 500, at: new Date(), reason: "r", by: "staff9" }],
      refundState: "done" as const,
      refundError: "provider said SECRET",
      duplicatePayments: [],
    },
    fulfilment: { state: "ok" as const, attempts: 1, lastError: "internal DHL error SECRET" },
    label: { key: "express/labels/s1/label.pdf", source: "carrier" as const, uploadedAt: new Date(), bytes: 100 },
    trackingNumber: "MOCK123",
  };

  it("a client sees payment status and tracking, never provider ids, errors or storage keys", () => {
    const json = JSON.stringify(toClientShipmentDTO(base as any));
    expect(json).not.toContain("SECRET");
    expect(json).not.toContain("express/labels");
    expect(json).not.toContain("fulfilment");
    const dto = toClientShipmentDTO(base as any);
    expect(dto).toMatchObject({ labelReady: true, refundedCents: 500, trackingNumber: "MOCK123", canPay: false });
  });

  it("staff see the provider ids and the error", () => {
    const dto = toAdminShipmentDTO(base as any);
    expect(dto.payment.paymentIntentId).toBe("pi_SECRET");
    expect(dto.fulfilment.lastError).toContain("SECRET");
    expect(dto.label).toMatchObject({ source: "carrier" });
    expect(JSON.stringify(dto)).not.toContain("express/labels"); // even staff get a link, not the raw storage key
  });
});

describe("what needs staff attention", () => {
  const now = new Date("2026-11-01T12:00:00Z");
  const minutesAgo = (n: number) => new Date(now.getTime() - n * 60_000);
  const doc = (over: Record<string, unknown>) => ({ _id: "x", status: "paid", payment: {}, fulfilment: { state: "none" }, ...over }) as any;

  it("flags a failed label, an unknown DHL outcome, a payment mismatch and a failed refund", () => {
    expect(attentionReasons(doc({ fulfilment: { state: "failed" } }), now)).toContain("label_failed");
    expect(attentionReasons(doc({ fulfilment: { state: "unknown" } }), now)).toContain("outcome_unknown");
    expect(attentionReasons(doc({ status: "awaiting_payment", payment: { state: "mismatch" } }), now)).toContain("amount_mismatch");
    expect(attentionReasons(doc({ status: "cancelled", payment: { refundState: "failed" } }), now)).toContain("refund_failed");
  });

  it("flags a paid booking with no label after 10 minutes, but not before", () => {
    expect(attentionReasons(doc({ payment: { paidAt: minutesAgo(11) } }), now)).toContain("label_overdue");
    expect(attentionReasons(doc({ payment: { paidAt: minutesAgo(3) } }), now)).toEqual([]);
  });

  it("flags nothing for a healthy booking", () => {
    expect(attentionReasons(doc({ status: "label_ready", payment: { paidAt: minutesAgo(60) }, fulfilment: { state: "ok" } }), now)).toEqual([]);
    expect(attentionReasons(doc({ status: "awaiting_payment" }), now)).toEqual([]);
  });
});

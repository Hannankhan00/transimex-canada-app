import { describe, expect, it, vi } from "vitest";
import Stripe from "stripe";

vi.mock("@/lib/mongoose", () => ({ default: async () => undefined }));

import { StripePaymentProvider, normalizeStripeEvent } from "../payments/stripe";
import { StripeConnectClient } from "../payments/connect";
import { getStripeConfig } from "../payments/config";
import { PaymentError } from "../payments/types";
import { partnerCanCharge, toStripeStatus } from "../partnerStripe";
import { buildProfitRows } from "../profitReport";
import { accountMatches, centsMatch, expectedCents } from "../paymentService";
import { toCustomerOwnShipmentDTO, toCustomerShipmentDTO, toOwnShipmentDTO } from "../shipmentDto";

const checkout = {
  shipmentId: "abc123",
  reference: "EX-261015-K7QZ4",
  amountCents: 12000,
  description: "Toronto to Douala, CM",
  successUrl: "https://app.test/ok",
  cancelUrl: "https://app.test/no",
  idempotencyKey: "express-pay-abc123-0",
  expiresInMinutes: 120,
};

const harness = () => {
  const create = vi.fn(async (_p: any, _o: any) => ({ id: "cs_1", url: "https://checkout.stripe.test/c/1" }));
  const retrieve = vi.fn(async (_id: string, _p: any, _o: any) => ({ id: "cs_1", status: "complete", payment_status: "paid", payment_intent: "pi_1", amount_total: 12000, currency: "cad", metadata: { shipmentId: "abc123" } }));
  const refund = vi.fn(async (_p: any, _o: any) => ({ id: "re_1", amount: 500, status: "succeeded" }));
  const expire = vi.fn(async (..._a: any[]) => ({}));
  const real = new Stripe("sk_test_x");
  const stripe = { checkout: { sessions: { create, retrieve, expire } }, refunds: { create: refund }, webhooks: real.webhooks } as unknown as Stripe;
  return { stripe, create, retrieve, refund, expire, real };
};

describe("Stripe Connect payments", () => {
  it("charges on the partner account and collects Transimex's share as the application fee", async () => {
    const { stripe, create } = harness();
    await new StripePaymentProvider("sk_test_x", "whsec_x", stripe).createCheckoutSession({ ...checkout, connect: { accountId: "acct_partner", applicationFeeCents: 9000 } });
    const [params, options] = create.mock.calls[0];
    expect(params.line_items[0].price_data.unit_amount).toBe(12000);
    expect(params.payment_intent_data.application_fee_amount).toBe(9000);
    expect(options).toMatchObject({ stripeAccount: "acct_partner", idempotencyKey: "express-pay-abc123-0" });
  });

  it("a normal booking has no fee and no connected account", async () => {
    const { stripe, create } = harness();
    await new StripePaymentProvider("sk_test_x", "whsec_x", stripe).createCheckoutSession(checkout);
    const [params, options] = create.mock.calls[0];
    expect(params.payment_intent_data.application_fee_amount).toBeUndefined();
    expect(options.stripeAccount).toBeUndefined();
  });

  it("refunds from the partner account and gives back Transimex's share of the fee", async () => {
    const { stripe, refund } = harness();
    await new StripePaymentProvider("sk_test_x", "whsec_x", stripe).refund({ paymentIntentId: "pi_1", amountCents: 500, idempotencyKey: "k", reason: "r", shipmentId: "s", connectedAccountId: "acct_partner" });
    const [params, options] = refund.mock.calls[0];
    expect(params.refund_application_fee).toBe(true);
    expect(options.stripeAccount).toBe("acct_partner");
  });

  it("checks a partner-account payment on that account and tags the event with it", async () => {
    const { stripe, retrieve } = harness();
    const event = await new StripePaymentProvider("sk_test_x", "whsec_x", stripe).retrieveCheckout("cs_1", "acct_partner");
    expect(retrieve.mock.calls[0][2]).toEqual({ stripeAccount: "acct_partner" });
    expect(event).toMatchObject({ shipmentId: "abc123", connectedAccountId: "acct_partner", amountTotalCents: 12000 });
  });

  it("reads the connected account from a webhook event", () => {
    const event = { id: "evt_1", type: "checkout.session.completed", account: "acct_partner", data: { object: { id: "cs_1", payment_status: "paid", payment_intent: "pi_1", amount_total: 1, currency: "cad", metadata: { shipmentId: "x" } } } } as unknown as Stripe.Event;
    expect(normalizeStripeEvent(event).connectedAccountId).toBe("acct_partner");
  });

  it("accepts a webhook signed with the Connect endpoint secret, and rejects any other", () => {
    const { stripe, real } = harness();
    const payload = JSON.stringify({ id: "evt_c", object: "event", type: "checkout.session.completed", account: "acct_partner", data: { object: { id: "cs_1", payment_status: "paid", payment_intent: "pi_1", amount_total: 1, currency: "cad" } } });
    const provider = new StripePaymentProvider("sk_test_x", "whsec_platform", stripe, "whsec_connect");
    const header = real.webhooks.generateTestHeaderString({ payload, secret: "whsec_connect" });
    expect(provider.verifyWebhook(payload, header).connectedAccountId).toBe("acct_partner");
    const bad = real.webhooks.generateTestHeaderString({ payload, secret: "whsec_other" });
    expect(() => provider.verifyWebhook(payload, bad)).toThrow(PaymentError);
    expect(() => new StripePaymentProvider("sk_test_x", "whsec_platform", stripe).verifyWebhook(payload, header)).toThrow(PaymentError);
  });

  it("reads the optional Connect webhook secret from the environment", () => {
    const base = { STRIPE_SECRET_KEY: "sk_test_x", STRIPE_WEBHOOK_SECRET: "whsec_x" };
    expect(getStripeConfig(base).connectWebhookSecret).toBeUndefined();
    expect(getStripeConfig({ ...base, STRIPE_CONNECT_WEBHOOK_SECRET: "whsec_c" }).connectWebhookSecret).toBe("whsec_c");
  });
});

describe("partner Stripe onboarding", () => {
  it("creates a Standard account and an onboarding link", async () => {
    const accounts = { create: vi.fn(async (_p: any) => ({ id: "acct_1" })), retrieve: vi.fn(async (_id: string) => ({ charges_enabled: true, payouts_enabled: false, details_submitted: true })) };
    const accountLinks = { create: vi.fn(async (_p: any) => ({ url: "https://connect.stripe.test/setup" })) };
    const client = new StripeConnectClient("sk_test_x", { accounts, accountLinks } as unknown as Stripe);

    expect(await client.createAccount({ email: "p@example.com", expressAccountId: "ea1" })).toEqual({ id: "acct_1" });
    expect(accounts.create.mock.calls[0][0]).toMatchObject({ type: "standard", email: "p@example.com", metadata: { expressAccountId: "ea1" } });
    expect(await client.createOnboardingLink("acct_1", "https://a/refresh", "https://a/return")).toBe("https://connect.stripe.test/setup");
    expect(accountLinks.create.mock.calls[0][0]).toMatchObject({ account: "acct_1", type: "account_onboarding" });
    expect(await client.retrieveAccount("acct_1")).toEqual({ chargesEnabled: true, payoutsEnabled: false, detailsSubmitted: true });
  });

  it("only treats a partner as able to take payments once Stripe allows charges", () => {
    expect(partnerCanCharge(undefined)).toBe(false);
    expect(partnerCanCharge({ accountId: "acct_1", chargesEnabled: false, payoutsEnabled: false, detailsSubmitted: false })).toBe(false);
    expect(partnerCanCharge({ accountId: "acct_1", chargesEnabled: true, payoutsEnabled: true, detailsSubmitted: true })).toBe(true);
    expect(toStripeStatus({ accountId: "acct_1", chargesEnabled: false, payoutsEnabled: false, detailsSubmitted: true })).toMatchObject({ connected: true, needsMoreInfo: true });
    expect(toStripeStatus(undefined)).toMatchObject({ connected: false, needsMoreInfo: false });
  });
});

describe("profit on a partner customer's card payment", () => {
  const sh = (over: Record<string, unknown> = {}) => ({
    _id: "1",
    reference: "EX-1",
    accountId: "a",
    accountType: "customer" as const,
    status: "label_ready",
    quoteId: "q1",
    totalCents: 9000,
    trackingNumber: "9333",
    label: { uploadedAt: "2026-10-20T10:00:00Z" },
    payment: { provider: "stripe", amountCents: 12000, refundedCents: 0, connect: { chargeCents: 12000, applicationFeeCents: 9000 } },
    shipper: { countryCode: "CA" },
    recipient: { countryCode: "FR" },
    ...over,
  });
  const quotes = new Map([["q1", { pricing: { account: { totalCents: 4000 }, pickupFeeCents: 0, clientDiscountPct: 30 } }]]);

  it("counts only Transimex's share as revenue and charges Transimex no card fee", () => {
    const { rows } = buildProfitRows([sh()], quotes);
    expect(rows[0]).toMatchObject({ revenueCents: 9000, cardFeeCents: 0, profitCents: 5000 });
  });

  it("a refund gives back the same share of Transimex's fee", () => {
    const { rows } = buildProfitRows([sh({ payment: { provider: "stripe", amountCents: 12000, refundedCents: 6000, connect: { chargeCents: 12000, applicationFeeCents: 9000 } } })], quotes);
    expect(rows[0].revenueCents).toBe(4500);
  });
});

describe("checking a payment taken on a partner account", () => {
  const connectShipment = { totalCents: 9000, payment: { connect: { accountId: "acct_partner", chargeCents: 12000, applicationFeeCents: 9000 } } } as any;
  const plainShipment = { totalCents: 9000, payment: {} } as any;
  const event = (over: Record<string, unknown> = {}) => ({ id: "e", type: "checkout.session.completed", rawType: "x", amountTotalCents: 12000, currency: "cad", connectedAccountId: "acct_partner", ...over }) as any;

  it("expects the customer's price, not the partner price", () => {
    expect(expectedCents(connectShipment)).toBe(12000);
    expect(expectedCents(plainShipment)).toBe(9000);
    expect(centsMatch(event(), connectShipment)).toBe(true);
    expect(centsMatch(event({ amountTotalCents: 9000 }), connectShipment)).toBe(false);
    expect(centsMatch(event({ currency: "usd" }), connectShipment)).toBe(false);
  });

  it("only accepts the payment from the partner's own Stripe account", () => {
    expect(accountMatches(event(), connectShipment)).toBe(true);
    expect(accountMatches(event({ connectedAccountId: "acct_other" }), connectShipment)).toBe(false);
    expect(accountMatches(event({ connectedAccountId: undefined }), connectShipment)).toBe(false);
    // A normal booking must not be marked paid by a payment from some connected account.
    expect(accountMatches(event(), plainShipment)).toBe(false);
    expect(accountMatches(event({ connectedAccountId: undefined }), plainShipment)).toBe(true);
  });
});

describe("what a partner's customer sees of their own booking", () => {
  const doc = {
    _id: "s1",
    reference: "EX-1",
    status: "awaiting_payment",
    totalCents: 9000,
    customerTotalCents: 12000,
    markupCents: 3000,
    partnerCustomerId: "c1",
    partnerCustomerName: "Amina",
    payment: { connect: { accountId: "acct_partner", chargeCents: 12000, applicationFeeCents: 9000 }, sessionId: "cs_1", paymentIntentId: "pi_1" },
    shipper: {},
    recipient: {},
  } as any;

  it("shows their own price and lets them pay, without the partner price or the markup", () => {
    const dto = toOwnShipmentDTO(doc, "customer");
    expect(dto).toMatchObject({ totalCents: 12000, canPay: true, bookedByViewer: true, partner: null });
    const text = JSON.stringify(dto);
    expect(text).not.toContain("9000");
    expect(text).not.toContain("markup");
    expect(text).not.toContain("acct_partner");
    expect(text).not.toContain("pi_1");
  });

  it("a booking their partner made for them is view-only and not theirs to pay", () => {
    const dto = toCustomerShipmentDTO(doc);
    expect(dto).toMatchObject({ canPay: false, bookedByViewer: false });
  });

  it("other accounts keep the full owner view", () => {
    expect(toOwnShipmentDTO({ ...doc, partnerCustomerId: undefined }, "b2c")).toMatchObject({ totalCents: 9000, bookedByViewer: true });
    expect(toCustomerOwnShipmentDTO({ ...doc, status: "label_ready", label: { key: "k" } })).toMatchObject({ canPay: false, labelReady: true });
  });
});

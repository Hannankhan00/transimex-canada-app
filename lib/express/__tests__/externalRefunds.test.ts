import { describe, expect, it } from "vitest";
import type Stripe from "stripe";
import { normalizeStripeEvent } from "../payments/stripe";
import { quoteRequestSchema } from "../quoteSchemas";
import { attentionReasons } from "../shipmentDto";

const ev = (type: string, object: unknown, account?: string) => ({ id: "evt_1", type, account, data: { object } }) as unknown as Stripe.Event;

describe("refunds and disputes made outside the app", () => {
  it("reads a CAD refund with its payment intent and amount", () => {
    const e = normalizeStripeEvent(ev("refund.created", { id: "re_1", amount: 700, currency: "cad", payment_intent: "pi_1", status: "succeeded" }));
    expect(e).toMatchObject({ type: "refund.created", paymentIntentId: "pi_1", refundId: "re_1", refundAmountCents: 700 });
  });

  it("ignores a refund with no payment intent or in another currency", () => {
    expect(normalizeStripeEvent(ev("refund.created", { id: "re_1", amount: 700, currency: "cad", payment_intent: null })).type).toBe("other");
    expect(normalizeStripeEvent(ev("refund.created", { id: "re_1", amount: 700, currency: "usd", payment_intent: "pi_1" })).type).toBe("other");
  });

  it("reads a dispute and the connected account it happened on", () => {
    const e = normalizeStripeEvent(ev("charge.dispute.created", { id: "dp_1", amount: 7700, currency: "cad", payment_intent: "pi_1" }, "acct_9"));
    expect(e).toMatchObject({ type: "charge.dispute.created", disputeId: "dp_1", disputeAmountCents: 7700, paymentIntentId: "pi_1", connectedAccountId: "acct_9" });
  });

  it("flags a disputed booking for staff", () => {
    const doc = { _id: "s1", status: "paid", payment: { dispute: { id: "dp_1", amountCents: 100, at: new Date() } } } as any;
    expect(attentionReasons(doc)).toContain("dispute");
  });
});

describe("quote request rules", () => {
  const base = { origin: { countryCode: "CA", postalCode: "M5V 2T6", city: "Toronto" }, destination: { countryCode: "CM", city: "Douala" }, parcels: [{ weightKg: 1, lengthCm: 10, widthCm: 10, heightCm: 10 }], declaredValueCents: 1000 };

  it("needs a pickup postal code, because the booking must match the quote", () => {
    expect(quoteRequestSchema.safeParse({ ...base, origin: { ...base.origin, postalCode: "" } }).success).toBe(false);
    expect(quoteRequestSchema.safeParse(base).success).toBe(true);
  });

  it("still lets a destination without postal codes through", () => {
    expect(quoteRequestSchema.safeParse(base).success).toBe(true);
  });

  it("refuses a weekend ship date", () => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 1);
    while (d.getUTCDay() !== 6) d.setUTCDate(d.getUTCDate() + 1);
    const r = quoteRequestSchema.safeParse({ ...base, plannedShipDate: d.toISOString().slice(0, 10) });
    expect(r.success).toBe(false);
  });
});

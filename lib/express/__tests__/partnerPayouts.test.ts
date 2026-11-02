import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/mongoose", () => ({ default: async () => undefined }));

import {
  DETAILS_COOLING_HOURS,
  MIN_PAYOUT_CENTS,
  PAYOUT_HOLD_DAYS,
  availableAtFor,
  cardFee,
  checkPayoutRequest,
  partnerEarningCents,
  reversalForRefundCents,
  summariseLedger,
  weekStartOf,
  weeklyStatements,
  type LedgerLike,
} from "../partnerLedger";
import { decryptPayoutDetails, encryptPayoutDetails, payoutCryptoConfigured, PayoutCryptoError } from "../payoutCrypto";
import { maskPayoutDetails, payoutDetailsSchema, payoutRequestSchema, payoutResolveSchema } from "../payoutDetails";
import { customerBookingMode } from "../partnerStripe";
import { buildProfitRows } from "../profitReport";
import { expectedCents } from "../paymentService";

const DAY = 86_400_000;
const T0 = new Date("2026-11-02T12:00:00Z");

describe("what a partner earns when Transimex collects", () => {
  it("is the markup minus Stripe's card fee on the whole payment", () => {
    // Customer pays 77.00, partner price 70.00, markup 7.00. Stripe's fee on 77.00 is about 2.53.
    expect(partnerEarningCents({ markupCents: 700, feeCents: 253 })).toBe(447);
  });

  it("can be negative when the fee is more than the markup (the partner bears the fee)", () => {
    expect(partnerEarningCents({ markupCents: 100, feeCents: 253 })).toBe(-153);
  });

  it("uses Stripe's real fee when known, else the standard rate marked as an estimate", () => {
    expect(cardFee(7700, 241)).toEqual({ feeCents: 241, estimated: false });
    expect(cardFee(7700, null)).toEqual({ feeCents: Math.round(7700 * 0.029) + 30, estimated: true });
    expect(cardFee(7700, -5)).toMatchObject({ estimated: true });
    expect(cardFee(7700, 2.5)).toMatchObject({ estimated: true });
  });

  it("a refund takes back the same share of the markup, and Stripe's fee stays with the partner", () => {
    expect(reversalForRefundCents({ refundCents: 7700, chargeCents: 7700, markupCents: 700 })).toBe(-700);
    expect(reversalForRefundCents({ refundCents: 3850, chargeCents: 7700, markupCents: 700 })).toBe(-350);
    expect(reversalForRefundCents({ refundCents: 99999, chargeCents: 7700, markupCents: 700 })).toBe(-700); // never more than all of it
    expect(reversalForRefundCents({ refundCents: 0, chargeCents: 7700, markupCents: 700 })).toBe(0);
    expect(reversalForRefundCents({ refundCents: 100, chargeCents: 0, markupCents: 700 })).toBe(0);
  });

  it("earnings wait out the hold period; a negative earning counts at once", () => {
    expect(availableAtFor(447, T0).getTime()).toBe(T0.getTime() + PAYOUT_HOLD_DAYS * DAY);
    expect(availableAtFor(-153, T0).getTime()).toBe(T0.getTime());
  });
});

describe("the partner's balance", () => {
  const entry = (type: LedgerLike["type"], amountCents: number, createdDaysAgo: number, matured = true): LedgerLike => ({
    type,
    amountCents,
    createdAt: new Date(T0.getTime() - createdDaysAgo * DAY),
    availableAt: new Date(T0.getTime() - (matured ? 1 : -3) * DAY),
  });

  it("splits what is withdrawable from what is still in the hold period", () => {
    const s = summariseLedger([entry("earning", 5000, 10), entry("earning", 2000, 2, false)], 0, T0);
    expect(s).toMatchObject({ balanceCents: 7000, availableCents: 5000, pendingCents: 2000, withdrawableCents: 5000, reservedCents: 0 });
  });

  it("sets aside what an open request already asked for", () => {
    const s = summariseLedger([entry("earning", 5000, 10)], 3000, T0);
    expect(s.withdrawableCents).toBe(2000);
    expect(s.reservedCents).toBe(3000);
  });

  it("counts payouts out and a refund against what can be withdrawn", () => {
    const s = summariseLedger([entry("earning", 9000, 20), entry("payout", -4000, 5), entry("reversal", -500, 1)], 0, T0);
    expect(s).toMatchObject({ balanceCents: 4500, availableCents: 4500, withdrawableCents: 4500, paidOutCents: 4000 });
  });

  it("never lets the withdrawable amount go below zero", () => {
    const s = summariseLedger([entry("earning", -300, 1)], 0, T0);
    expect(s.balanceCents).toBe(-300);
    expect(s.withdrawableCents).toBe(0);
  });
});

describe("asking for a payout", () => {
  const summary = summariseLedger([{ type: "earning", amountCents: 10000, availableAt: new Date(T0.getTime() - DAY), createdAt: new Date(T0.getTime() - 8 * DAY) }], 0, T0);
  const base = { amountCents: 5000, summary, hasDetails: true, detailsUpdatedAt: new Date(T0.getTime() - 3 * DAY), hasOpenRequest: false, now: T0 };

  it("is allowed within the balance, with details saved a while ago", () => {
    expect(checkPayoutRequest(base)).toEqual({ ok: true });
  });

  it("refuses more than can be withdrawn, below the minimum, and zero or fractional cents", () => {
    expect(checkPayoutRequest({ ...base, amountCents: 10001 })).toMatchObject({ ok: false, code: "exceeds_balance" });
    expect(checkPayoutRequest({ ...base, amountCents: MIN_PAYOUT_CENTS - 1 })).toMatchObject({ ok: false, code: "below_minimum" });
    expect(checkPayoutRequest({ ...base, amountCents: 0 })).toMatchObject({ ok: false, code: "invalid_amount" });
    expect(checkPayoutRequest({ ...base, amountCents: 50.5 })).toMatchObject({ ok: false, code: "invalid_amount" });
    expect(checkPayoutRequest({ ...base, amountCents: -100 })).toMatchObject({ ok: false, code: "invalid_amount" });
  });

  it("refuses a second request while one is open, and without payout details", () => {
    expect(checkPayoutRequest({ ...base, hasOpenRequest: true })).toMatchObject({ ok: false, code: "open_request" });
    expect(checkPayoutRequest({ ...base, hasDetails: false })).toMatchObject({ ok: false, code: "no_details" });
  });

  it("pauses payouts for a day after the payout details change (a stolen login cannot redirect money)", () => {
    const justChanged = new Date(T0.getTime() - (DETAILS_COOLING_HOURS - 1) * 3_600_000);
    expect(checkPayoutRequest({ ...base, detailsUpdatedAt: justChanged })).toMatchObject({ ok: false, code: "details_recently_changed" });
    const longAgo = new Date(T0.getTime() - (DETAILS_COOLING_HOURS + 1) * 3_600_000);
    expect(checkPayoutRequest({ ...base, detailsUpdatedAt: longAgo })).toEqual({ ok: true });
  });
});

describe("weekly statements", () => {
  it("starts weeks on Monday (UTC)", () => {
    expect(weekStartOf(new Date("2026-11-02T00:00:00Z"))).toBe("2026-11-02");
    expect(weekStartOf(new Date("2026-11-08T23:59:00Z"))).toBe("2026-11-02");
    expect(weekStartOf(new Date("2026-11-09T00:00:00Z"))).toBe("2026-11-09");
  });

  it("groups earnings, refunds and payouts by week, newest first", () => {
    const e = (type: LedgerLike["type"], amountCents: number, at: string): LedgerLike => ({ type, amountCents, createdAt: at, availableAt: at });
    const weeks = weeklyStatements([e("earning", 700, "2026-11-03T10:00:00Z"), e("earning", 300, "2026-11-04T10:00:00Z"), e("reversal", -200, "2026-11-05T10:00:00Z"), e("payout", -500, "2026-11-10T10:00:00Z")]);
    expect(weeks.map((w) => w.weekStart)).toEqual(["2026-11-09", "2026-11-02"]);
    expect(weeks[1]).toMatchObject({ earnedCents: 1000, reversedCents: -200, paidOutCents: 0, netCents: 800, entries: 3 });
    expect(weeks[0]).toMatchObject({ paidOutCents: 500, netCents: -500 });
  });
});

describe("payout details are encrypted at rest", () => {
  const env = { PAYOUT_ENCRYPTION_KEY: "a".repeat(64) };
  const secret = { method: "bank", accountHolder: "Amina Diallo", institution: "001", transit: "12345", accountNumber: "1234567" };

  it("round-trips, and the stored text never contains the account number", () => {
    const stored = encryptPayoutDetails(secret, env);
    expect(stored).not.toContain("1234567");
    expect(stored).not.toContain("Amina");
    expect(decryptPayoutDetails(stored, env)).toEqual(secret);
  });

  it("uses a new random value each time", () => {
    expect(encryptPayoutDetails(secret, env)).not.toBe(encryptPayoutDetails(secret, env));
  });

  it("detects tampering and a wrong key", () => {
    const stored = encryptPayoutDetails(secret, env);
    const parts = stored.split(".");
    parts[3] = parts[3].slice(0, -2) + (parts[3].endsWith("AA") ? "BB" : "AA");
    expect(() => decryptPayoutDetails(parts.join("."), env)).toThrow(PayoutCryptoError);
    expect(() => decryptPayoutDetails(stored, { PAYOUT_ENCRYPTION_KEY: "b".repeat(64) })).toThrow(PayoutCryptoError);
    expect(() => decryptPayoutDetails("not encrypted", env)).toThrow(PayoutCryptoError);
  });

  it("refuses to save anything without a proper key", () => {
    expect(() => encryptPayoutDetails(secret, {})).toThrow(/PAYOUT_ENCRYPTION_KEY/);
    expect(() => encryptPayoutDetails(secret, { PAYOUT_ENCRYPTION_KEY: "short" })).toThrow(PayoutCryptoError);
    expect(payoutCryptoConfigured({})).toBe(false);
    expect(payoutCryptoConfigured(env)).toBe(true);
  });
});

describe("payout details and requests", () => {
  it("checks Canadian bank numbers and e-Transfer emails", () => {
    expect(payoutDetailsSchema.safeParse({ method: "etransfer", email: " Amina@Example.com " }).data).toEqual({ method: "etransfer", email: "amina@example.com" });
    expect(payoutDetailsSchema.safeParse({ method: "etransfer", email: "nope" }).success).toBe(false);
    expect(payoutDetailsSchema.safeParse({ method: "bank", accountHolder: "Amina D", institution: "001", transit: "12345", accountNumber: "1234567" }).success).toBe(true);
    expect(payoutDetailsSchema.safeParse({ method: "bank", accountHolder: "Amina D", institution: "01", transit: "12345", accountNumber: "1234567" }).success).toBe(false);
    expect(payoutDetailsSchema.safeParse({ method: "bank", accountHolder: "Amina D", institution: "001", transit: "1234", accountNumber: "1234567" }).success).toBe(false);
    expect(payoutDetailsSchema.safeParse({ method: "bank", accountHolder: "Amina D", institution: "001", transit: "12345", accountNumber: "12ab567" }).success).toBe(false);
    expect(payoutDetailsSchema.safeParse({ method: "cheque" }).success).toBe(false);
  });

  it("shows only a masked version", () => {
    expect(maskPayoutDetails({ method: "etransfer", email: "amina@example.com" })).toBe("Interac e-Transfer · a***@example.com");
    const bank = maskPayoutDetails({ method: "bank", accountHolder: "Amina Diallo", institution: "001", transit: "12345", accountNumber: "1234567" });
    expect(bank).toContain("4567");
    expect(bank).not.toContain("1234567");
    expect(bank).not.toContain("12345");
  });

  it("turns a typed amount into whole cents and rejects nonsense", () => {
    expect(payoutRequestSchema.parse({ amount: 49.99 }).amount).toBe(4999);
    expect(payoutRequestSchema.safeParse({ amount: 0 }).success).toBe(false);
    expect(payoutRequestSchema.safeParse({ amount: -5 }).success).toBe(false);
    expect(payoutRequestSchema.safeParse({ amount: "100" }).success).toBe(false);
  });

  it("staff need a reference to mark paid and a reason to reject", () => {
    expect(payoutResolveSchema.safeParse({ action: "paid", reference: "ETR-12345" }).success).toBe(true);
    expect(payoutResolveSchema.safeParse({ action: "paid" }).success).toBe(false);
    expect(payoutResolveSchema.safeParse({ action: "reject", reason: "Details do not match" }).success).toBe(true);
    expect(payoutResolveSchema.safeParse({ action: "reject", reason: "" }).success).toBe(false);
  });
});

describe("when a partner's customers can book", () => {
  const stripeReady = { accountId: "acct_1", chargesEnabled: true, payoutsEnabled: true, detailsSubmitted: true };
  const partner = (p: Record<string, unknown>) => ({ partner: { enabled: true, defaultMarkupPct: 10, ...p } }) as any;

  it("Transimex mode needs nothing more: no Stripe account", () => {
    expect(customerBookingMode(partner({ customerPayments: "transimex" }))).toBe("transimex");
  });

  it("Stripe mode needs Stripe to allow charges; an unset choice behaves like Stripe", () => {
    expect(customerBookingMode(partner({ customerPayments: "stripe", stripe: stripeReady }))).toBe("stripe");
    expect(customerBookingMode(partner({ stripe: stripeReady }))).toBe("stripe");
    expect(customerBookingMode(partner({ customerPayments: "stripe", stripe: { ...stripeReady, chargesEnabled: false } }))).toBeNull();
    expect(customerBookingMode(partner({}))).toBeNull();
    expect(customerBookingMode(null)).toBeNull();
  });
});

describe("a customer paying Transimex for a partner", () => {
  const paid = (over: Record<string, unknown> = {}) => ({
    _id: "1",
    reference: "EX-1",
    accountId: "a",
    accountType: "customer" as const,
    status: "label_ready",
    quoteId: "q1",
    totalCents: 7000,
    trackingNumber: "9333",
    label: { uploadedAt: "2026-10-20T10:00:00Z" },
    payment: { provider: "stripe", amountCents: 7700, refundedCents: 0, partnerShare: { partnerAccountId: "p1", chargeCents: 7700, markupCents: 700 } },
    shipper: { countryCode: "CA" },
    recipient: { countryCode: "FR" },
    ...over,
  });
  const quotes = new Map([["q1", { pricing: { account: { totalCents: 2000 }, pickupFeeCents: 0, clientDiscountPct: 30 } }]]);

  it("is charged the customer's price, not the partner price", () => {
    expect(expectedCents({ totalCents: 7000, payment: { partnerShare: { partnerAccountId: "p1", chargeCents: 7700, markupCents: 700 } } } as any)).toBe(7700);
    expect(expectedCents({ totalCents: 7000, payment: {} } as any)).toBe(7000);
  });

  it("Transimex's own revenue is its share, with no card fee (the partner bears it through the ledger)", () => {
    const { rows } = buildProfitRows([paid()], quotes);
    expect(rows[0]).toMatchObject({ revenueCents: 7000, cardFeeCents: 0, profitCents: 5000 });
  });

  it("a half refund gives back half of Transimex's share", () => {
    const { rows } = buildProfitRows([paid({ payment: { provider: "stripe", amountCents: 7700, refundedCents: 3850, partnerShare: { partnerAccountId: "p1", chargeCents: 7700, markupCents: 700 } } })], quotes);
    expect(rows[0].revenueCents).toBe(3500);
  });
});

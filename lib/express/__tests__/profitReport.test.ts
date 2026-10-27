import { describe, expect, it } from "vitest";
import { buildProfitRows, estimateCardFeeCents, summariseProfit } from "../profitReport";

const quote = (dhlCost: number, over: Record<string, unknown> = {}) => ({ pricing: { account: { totalCents: dhlCost }, pickupFeeCents: 0, clientDiscountPct: 30, ...over } });

const ship = (id: string, over: Record<string, unknown> = {}) => ({
  _id: id,
  reference: `EX-${id}`,
  accountId: "acc1",
  accountType: "b2c" as const,
  status: "label_ready",
  quoteId: `q${id}`,
  totalCents: 10000,
  trackingNumber: "9333",
  label: { uploadedAt: "2026-10-20T10:00:00Z" },
  payment: { provider: "stripe", amountCents: 10000, refundedCents: 0 },
  shipper: { countryCode: "CA" },
  recipient: { countryCode: "FR" },
  ...over,
});

describe("profit report", () => {
  it("profit is what the client paid minus what DHL's rate said it costs", () => {
    const { rows } = buildProfitRows([ship("1")], new Map([["q1", quote(4000)]]));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ revenueCents: 10000, dhlCostCents: 4000, profitCents: 6000, originCountry: "CA", destinationCountry: "FR", payMethod: "card" });
  });

  it("estimates the card fee (2.9% + 30 cents) and shows profit after it", () => {
    expect(estimateCardFeeCents(10000)).toBe(320);
    expect(estimateCardFeeCents(0)).toBe(0);
    const { rows } = buildProfitRows([ship("1")], new Map([["q1", quote(4000)]]));
    expect(rows[0].cardFeeCents).toBe(320);
    expect(rows[0].netProfitCents).toBe(5680);
  });

  it("a refund lowers revenue but DHL's cost stays, even for a cancelled booking", () => {
    const { rows } = buildProfitRows([ship("1", { status: "cancelled", payment: { provider: "stripe", amountCents: 10000, refundedCents: 10000 } })], new Map([["q1", quote(4000)]]));
    expect(rows[0]).toMatchObject({ revenueCents: 0, dhlCostCents: 4000, profitCents: -4000, cancelled: true });
  });

  it("a booking on the account's credit has no card fee, and a credit lowers its revenue", () => {
    const { rows } = buildProfitRows([ship("1", { payment: undefined, billing: { mode: "invoice", creditedCents: 2000 } })], new Map([["q1", quote(4000)]]));
    expect(rows[0]).toMatchObject({ payMethod: "invoice", revenueCents: 8000, cardFeeCents: 0, profitCents: 4000 });
  });

  it("a pass-through pickup fee is not profit", () => {
    const { rows } = buildProfitRows([ship("1")], new Map([["q1", quote(4000, { pickupFeeCents: 1500 })]]));
    expect(rows[0].profitCents).toBe(10000 - 1500 - 4000);
  });

  it("leaves out bookings DHL never booked, and counts ones with no saved quote as skipped", () => {
    const { rows, skipped } = buildProfitRows([ship("1", { trackingNumber: undefined }), ship("2")], new Map());
    expect(rows).toHaveLength(0);
    expect(skipped).toBe(1);
  });

  it("flags shipments that got no discount because neither end is in Canada", () => {
    const { rows } = buildProfitRows([ship("1", { shipper: { countryCode: "FR" }, recipient: { countryCode: "NG" } })], new Map([["q1", quote(4000, { clientDiscountPct: 0, discountWaived: "no_canada" })]]));
    expect(rows[0].discountWaived).toBe(true);
  });

  it("adds up totals, margin, months, types and routes, and counts losses", () => {
    const quotes = new Map([["q1", quote(4000)], ["q2", quote(12000)], ["q3", quote(3000)]]);
    const { rows } = buildProfitRows(
      [ship("1"), ship("2", { accountType: "b2b", label: { uploadedAt: "2026-09-02T10:00:00Z" }, payment: undefined, billing: { mode: "invoice" } }), ship("3", { recipient: { countryCode: "NG" } })],
      quotes
    );
    const r = summariseProfit(rows);
    expect(r.totals).toMatchObject({ count: 3, revenueCents: 30000, dhlCostCents: 19000, profitCents: 11000, belowCostCount: 1 });
    expect(r.totals.marginPct).toBe(36.7);
    expect(r.byMonth.map((b) => b.key)).toEqual(["2026-10", "2026-09"]);
    expect(r.byType.map((b) => b.key).sort()).toEqual(["b2b", "b2c"]);
    expect(r.byRoute.find((b) => b.key === "CA → NG")?.profitCents).toBe(7000);
  });
});

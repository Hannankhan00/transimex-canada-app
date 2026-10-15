import { describe, expect, it } from "vitest";
import { PricingError, priceShipment } from "../pricing";
import type { RatePrice } from "@/lib/shipping/core/types";

const price = (base: number, ...surcharges: [string, number][]): RatePrice => ({
  baseFreightCents: base,
  surcharges: surcharges.map(([code, amountCents]) => ({ code, name: code, amountCents })),
  totalCents: base + surcharges.reduce((s, [, a]) => s + a, 0),
});

// The worked example from the operating guide (illustrative figures):
// public base $100 / fuel $10 / remote $8; DHL account base $25 (75% off) with the same surcharges.
const publicList = price(10000, ["FF", 1000], ["OO", 800]);
const account = price(2500, ["FF", 1000], ["OO", 800]);

describe("worked example from the guide", () => {
  it("B2B partner at 15% off pays $103, customer pays $113 with a $10 markup, Transimex earns $60", () => {
    const r = priceShipment({
      account,
      publicList,
      clientDiscountPct: 15,
      markup: { kind: "flat", cents: 1000 },
    });
    expect(r.publicList.totalCents).toBe(11800);
    expect(r.account.totalCents).toBe(4300);
    expect(r.discountCents).toBe(1500);
    expect(r.client.baseFreightCents).toBe(8500);
    expect(r.client.totalCents).toBe(10300);
    expect(r.customerTotalCents).toBe(11300);
    expect(r.markupCents).toBe(1000);
    expect(r.profitCents).toBe(6000);
    expect(r.belowCost).toBe(false);
    expect(r.publicSource).toBe("carrier");
  });
});

describe("discount rules", () => {
  it("B2C: one global discount, base freight only, surcharges at DHL's amount", () => {
    const r = priceShipment({ account, publicList, clientDiscountPct: 5 });
    expect(r.discountCents).toBe(500);
    expect(r.client.baseFreightCents).toBe(9500);
    expect(r.client.surcharges).toEqual(publicList.surcharges);
    expect(r.client.totalCents).toBe(11300);
  });

  it("zero discount charges the public price", () => {
    const r = priceShipment({ account, publicList, clientDiscountPct: 0 });
    expect(r.discountCents).toBe(0);
    expect(r.client.totalCents).toBe(publicList.totalCents);
  });

  it("100 percent discount makes base freight free but surcharges still apply", () => {
    const r = priceShipment({ account, publicList, clientDiscountPct: 100 });
    expect(r.client.baseFreightCents).toBe(0);
    expect(r.client.totalCents).toBe(1800);
    expect(r.belowCost).toBe(true);
    expect(r.profitCents).toBe(1800 - 4300);
  });

  it("flags a discount deeper than the DHL contract discount as below cost", () => {
    // DHL gives us 75% off; selling at 80% off loses money on base freight.
    const r = priceShipment({ account, publicList, clientDiscountPct: 80 });
    expect(r.belowCost).toBe(true);
  });

  it("rounds half up, once, the same way every time", () => {
    // 12.5% of $1.01 = 12.625 cents -> 13; 12.5% of $1.00 = 12.5 -> 13
    expect(priceShipment({ account: price(10), publicList: price(101), clientDiscountPct: 12.5 }).discountCents).toBe(13);
    expect(priceShipment({ account: price(10), publicList: price(100), clientDiscountPct: 12.5 }).discountCents).toBe(13);
    expect(priceShipment({ account: price(10), publicList: price(99), clientDiscountPct: 12.5 }).discountCents).toBe(12);
    const a = priceShipment({ account, publicList, clientDiscountPct: 33.33 });
    const b = priceShipment({ account, publicList, clientDiscountPct: 33.33 });
    expect(a).toEqual(b);
    expect(a.discountCents).toBe(3333);
  });
});

describe("rebuilding the public price from the account rate", () => {
  it("public base = account base / (1 - contract discount): 75% -> x4", () => {
    const r = priceShipment({
      account,
      dhlContractDiscountPct: 75,
      clientDiscountPct: 15,
    });
    expect(r.publicSource).toBe("rebuilt_from_account_rate");
    expect(r.dhlContractDiscountPct).toBe(75);
    expect(r.publicList.baseFreightCents).toBe(10000);
    // Surcharges are the same on both sides and pass through.
    expect(r.publicList.surcharges).toEqual(account.surcharges);
    expect(r.client.totalCents).toBe(10300);
    expect(r.profitCents).toBe(6000);
  });

  it("gives the same final price as a carrier-supplied public price", () => {
    const rebuilt = priceShipment({ account, dhlContractDiscountPct: 75, clientDiscountPct: 7.5 });
    const carrier = priceShipment({ account, publicList, clientDiscountPct: 7.5 });
    expect(rebuilt.client).toEqual(carrier.client);
  });

  it("prefers the carrier's public price when both are available", () => {
    const r = priceShipment({ account, publicList, dhlContractDiscountPct: 50, clientDiscountPct: 0 });
    expect(r.publicSource).toBe("carrier");
    expect(r.dhlContractDiscountPct).toBeNull();
    expect(r.publicList.baseFreightCents).toBe(10000);
  });

  it("refuses to guess when there is no public price and no contract discount", () => {
    expect(() => priceShipment({ account, clientDiscountPct: 10 })).toThrow(PricingError);
    expect(() => priceShipment({ account, dhlContractDiscountPct: null, clientDiscountPct: 10 })).toThrow(PricingError);
  });

  it("rejects a contract discount of 100 or more (division by zero) and negatives", () => {
    expect(() => priceShipment({ account, dhlContractDiscountPct: 100, clientDiscountPct: 0 })).toThrow(PricingError);
    expect(() => priceShipment({ account, dhlContractDiscountPct: -5, clientDiscountPct: 0 })).toThrow(PricingError);
  });

  it("a 0 percent contract discount means public equals account", () => {
    const r = priceShipment({ account, dhlContractDiscountPct: 0, clientDiscountPct: 0 });
    expect(r.publicList.baseFreightCents).toBe(account.baseFreightCents);
  });
});

describe("pickup fee", () => {
  it("is added as a pass-through line, never discounted, and not counted as profit", () => {
    const r = priceShipment({ account, publicList, clientDiscountPct: 15, pickupFeeCents: 1500 });
    expect(r.client.surcharges.at(-1)).toMatchObject({ code: "PICKUP", amountCents: 1500 });
    expect(r.client.totalCents).toBe(10300 + 1500);
    expect(r.profitCents).toBe(6000);
  });

  it("adds nothing when zero", () => {
    const r = priceShipment({ account, publicList, clientDiscountPct: 15, pickupFeeCents: 0 });
    expect(r.client.surcharges.some((s) => s.code === "PICKUP")).toBe(false);
  });
});

describe("partner markup", () => {
  it("flat markup", () => {
    const r = priceShipment({ account, publicList, clientDiscountPct: 15, markup: { kind: "flat", cents: 1000 } });
    expect(r.customerTotalCents).toBe(11300);
  });

  it("percent markup is taken on the partner's total price", () => {
    const r = priceShipment({ account, publicList, clientDiscountPct: 15, markup: { kind: "percent", pct: 10 } });
    expect(r.markupCents).toBe(1030);
    expect(r.customerTotalCents).toBe(11330);
  });

  it("no markup leaves the customer price equal to the partner price", () => {
    const r = priceShipment({ account, publicList, clientDiscountPct: 15, markup: null });
    expect(r.customerTotalCents).toBe(r.client.totalCents);
  });

  it("a markup can never be negative", () => {
    expect(() => priceShipment({ account, publicList, clientDiscountPct: 15, markup: { kind: "flat", cents: -1 } })).toThrow(PricingError);
    expect(() => priceShipment({ account, publicList, clientDiscountPct: 15, markup: { kind: "percent", pct: -1 } })).toThrow(PricingError);
  });
});

describe("input validation", () => {
  it("rejects discounts outside 0 to 100 and typos", () => {
    for (const bad of [-1, 100.01, 150, Number.NaN, Infinity, 12.345]) {
      expect(() => priceShipment({ account, publicList, clientDiscountPct: bad })).toThrow(PricingError);
    }
  });

  it("rejects fractional or negative cents", () => {
    expect(() => priceShipment({ account: { ...account, baseFreightCents: 10.5, totalCents: 1810.5 }, publicList, clientDiscountPct: 0 })).toThrow(PricingError);
    expect(() => priceShipment({ account, publicList, clientDiscountPct: 0, pickupFeeCents: -1 })).toThrow(PricingError);
  });

  it("rejects a price whose total does not match its lines", () => {
    expect(() => priceShipment({ account: { ...account, totalCents: 1 }, publicList, clientDiscountPct: 0 })).toThrow(PricingError);
  });

  it("never returns a negative price", () => {
    for (const pct of [0, 1, 50, 99.99, 100]) {
      const r = priceShipment({ account, publicList, clientDiscountPct: pct });
      expect(r.client.baseFreightCents).toBeGreaterThanOrEqual(0);
      expect(r.client.totalCents).toBeGreaterThanOrEqual(0);
    }
  });

  it("does not mutate its inputs", () => {
    const snapshot = JSON.stringify({ account, publicList });
    priceShipment({ account, publicList, clientDiscountPct: 15, pickupFeeCents: 100 });
    expect(JSON.stringify({ account, publicList })).toBe(snapshot);
  });
});

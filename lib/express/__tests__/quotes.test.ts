import { describe, expect, it } from "vitest";
import { MockDhlAdapter } from "@/lib/shipping/__tests__/support/fakeDhl";
import { CarrierError } from "@/lib/shipping/core/errors";
import type { CarrierAdapter } from "@/lib/shipping/core/adapter";
import type { RateOption } from "@/lib/shipping/core/types";
import { quoteRequestSchema, simulateSchema } from "../quoteSchemas";
import { QuoteError, normalizeRequest, priceRequest } from "../quoteService";
import { toAdminQuoteDTO, toClientQuoteDTO } from "../quoteDto";
import { settingsSchema } from "../validation";
import { isDhlCountry } from "@/lib/data/dhlCountries";

const validRequest = {
  origin: { postalCode: "M5V 2T6", city: "Toronto" },
  destination: { countryCode: "cm", postalCode: "00237", city: "Douala" },
  parcels: [{ weightKg: 2, lengthCm: 20, widthCm: 20, heightCm: 20 }],
  declaredValueCents: 10000,
};
const input = (over: Record<string, unknown> = {}) => quoteRequestSchema.parse({ ...validRequest, ...over });

const settings = { dhlContractDiscountPct: null as number | null };

describe("quote request validation", () => {
  it("accepts a Canada to Africa request and fills defaults", () => {
    const r = input();
    expect(r.destination.countryCode).toBe("CM");
    expect(r.isCustomsDeclarable).toBe(true);
    expect(r.pickupRequested).toBe(false);
  });

  it("ships between any countries DHL serves, and defaults the origin to Canada", () => {
    expect(isDhlCountry("ng")).toBe(true);
    expect(isDhlCountry("FR")).toBe(true);
    expect(isDhlCountry("KP")).toBe(false);
    expect(input().origin.countryCode).toBe("CA");
    expect(quoteRequestSchema.safeParse({ ...validRequest, destination: { ...validRequest.destination, countryCode: "FR" } }).success).toBe(true);
    expect(quoteRequestSchema.safeParse({ ...validRequest, origin: { ...validRequest.origin, countryCode: "us" } }).success).toBe(true);
    expect(quoteRequestSchema.safeParse({ ...validRequest, destination: { ...validRequest.destination, countryCode: "KP" } }).success).toBe(false);
  });

  it("limits parcels, weight and dimensions", () => {
    expect(quoteRequestSchema.safeParse({ ...validRequest, parcels: [] }).success).toBe(false);
    expect(quoteRequestSchema.safeParse({ ...validRequest, parcels: [{ ...validRequest.parcels[0], weightKg: 71 }] }).success).toBe(false);
    expect(quoteRequestSchema.safeParse({ ...validRequest, parcels: [{ ...validRequest.parcels[0], lengthCm: 121 }] }).success).toBe(false);
    expect(quoteRequestSchema.safeParse({ ...validRequest, parcels: [{ ...validRequest.parcels[0], weightKg: 0 }] }).success).toBe(false);
  });

  it("requires whole-cent declared value and a sensible ship date", () => {
    expect(quoteRequestSchema.safeParse({ ...validRequest, declaredValueCents: 10.5 }).success).toBe(false);
    expect(quoteRequestSchema.safeParse({ ...validRequest, plannedShipDate: "2020-01-01" }).success).toBe(false);
    expect(quoteRequestSchema.safeParse({ ...validRequest, plannedShipDate: "next week" }).success).toBe(false);
  });

  it("defaults the ship date to tomorrow", () => {
    const n = normalizeRequest(input(), new Date("2026-11-02T15:00:00Z"));
    expect(n.plannedShipDate).toBe("2026-11-03");
    expect(n.origin.countryCode).toBe("CA");
  });

  it("the simulator accepts a markup and an override", () => {
    const r = simulateSchema.safeParse({ request: validRequest, discountPctOverride: 12.5, markup: { kind: "flat", cents: 1000 } });
    expect(r.success).toBe(true);
    expect(simulateSchema.safeParse({ request: validRequest, markup: { kind: "flat", cents: -1 } }).success).toBe(false);
  });
});

describe("pricing a request with the mock carrier (hand-calculated)", () => {
  // CM is zone "west": list base 9200 + 2400 per kg above 0.5. A 2 kg parcel (volumetric 1.6 kg) is
  // charged 2.0 kg: 9200 + 2400*1.5 = 12800. Account rate = 40% = 5120. Fuel = 22% of 12800 = 2816.
  const adapter = new MockDhlAdapter();

  it("B2C at 5%: discount only on base freight", async () => {
    const r = await priceRequest({ input: input(), adapter, clientDiscountPct: 5, settings });
    expect(r.breakdown.publicList.baseFreightCents).toBe(12800);
    expect(r.breakdown.account.baseFreightCents).toBe(5120);
    expect(r.breakdown.discountCents).toBe(640);
    expect(r.breakdown.client.baseFreightCents).toBe(12160);
    expect(r.breakdown.client.surcharges).toEqual([{ code: "FF", name: "Fuel surcharge", amountCents: 2816 }]);
    expect(r.breakdown.client.totalCents).toBe(14976);
    expect(r.breakdown.account.totalCents).toBe(7936);
    expect(r.breakdown.profitCents).toBe(7040);
    expect(r.breakdown.belowCost).toBe(false);
  });

  it("B2B at 15%", async () => {
    const r = await priceRequest({ input: input(), adapter, clientDiscountPct: 15, settings });
    expect(r.breakdown.client.baseFreightCents).toBe(10880);
    expect(r.breakdown.client.totalCents).toBe(13696);
  });

  it("changing the discount changes the next quote, not the one already computed", async () => {
    const before = await priceRequest({ input: input(), adapter, clientDiscountPct: 5, settings });
    const snapshot = JSON.stringify(before);
    const after = await priceRequest({ input: input(), adapter, clientDiscountPct: 10, settings });
    expect(after.breakdown.client.totalCents).not.toBe(before.breakdown.client.totalCents);
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it("adds a remote-area surcharge that is passed through", async () => {
    const r = await priceRequest({ input: input({ destination: { ...validRequest.destination, postalCode: "00299" } }), adapter, clientDiscountPct: 5, settings });
    expect(r.breakdown.client.surcharges.map((s) => s.code)).toContain("OO");
    expect(r.breakdown.client.totalCents).toBe(14976 + 2800);
  });

  it("gives no client discount when neither the sender nor the recipient is in Canada, for any account", async () => {
    const abroad = quoteRequestSchema.parse({ ...validRequest, origin: { countryCode: "FR", postalCode: "75001", city: "Paris" }, destination: { countryCode: "NG", postalCode: "100001", city: "Lagos" } });
    const r = await priceRequest({ input: abroad, adapter, clientDiscountPct: 30, settings });
    expect(r.breakdown.clientDiscountPct).toBe(0);
    expect(r.breakdown.discountCents).toBe(0);
    expect(r.breakdown.discountWaived).toBe("no_canada");
    // The price is the public price plus surcharges.
    expect(r.breakdown.client.baseFreightCents).toBe(r.breakdown.publicList.baseFreightCents);
  });

  it("still gives the discount to or from Canada", async () => {
    const out = await priceRequest({ input: input(), adapter, clientDiscountPct: 30, settings });
    expect(out.breakdown.clientDiscountPct).toBe(30);
    expect(out.breakdown.discountWaived).toBeUndefined();
    const into = quoteRequestSchema.parse({ ...validRequest, origin: { countryCode: "CM", postalCode: "00237", city: "Douala" }, destination: { countryCode: "CA", postalCode: "M5V 2T6", city: "Toronto" } });
    // The test carrier only knows African lanes; the real DHL serves Canada, so accept the address check here.
    const anywhere = { carrier: "dhl", getRates: adapter.getRates.bind(adapter), validateAddress: async () => ({ valid: true, serviceable: true, suggestions: [], warnings: [] }) } as unknown as CarrierAdapter;
    const back = await priceRequest({ input: into, adapter: anywhere, clientDiscountPct: 30, settings });
    expect(back.breakdown.clientDiscountPct).toBe(30);
    expect(back.breakdown.discountWaived).toBeUndefined();
  });

  it("adds the pickup fee DHL quotes, only when DHL pickup is requested", async () => {
    const dropOff = await priceRequest({ input: input(), adapter, clientDiscountPct: 5, settings });
    const pickup = await priceRequest({ input: input({ pickupRequested: true }), adapter, clientDiscountPct: 5, settings });
    expect(dropOff.breakdown.pickupFeeCents).toBe(0);
    expect(pickup.breakdown.pickupFeeCents).toBe(1500);
    expect(pickup.breakdown.client.totalCents).toBe(14976 + 1500);
  });
});

describe("when DHL returns only our account rate", () => {
  const accountOnly = new MockDhlAdapter({ omitPublicList: true });

  it("rebuilds the public price from the contract discount and prices the same as DHL's public price", async () => {
    // The mock's account rate is 40% of list, i.e. a 60% DHL contract discount.
    const rebuilt = await priceRequest({ input: input(), adapter: accountOnly, clientDiscountPct: 5, settings: { ...settings, dhlContractDiscountPct: 60 } });
    const carrier = await priceRequest({ input: input(), adapter: new MockDhlAdapter(), clientDiscountPct: 5, settings });
    expect(rebuilt.breakdown.publicSource).toBe("rebuilt_from_account_rate");
    expect(rebuilt.breakdown.client).toEqual(carrier.breakdown.client);
    expect(rebuilt.breakdown.profitCents).toBe(carrier.breakdown.profitCents);
  });

  it("refuses to quote when the contract discount is not set", async () => {
    await expect(priceRequest({ input: input(), adapter: accountOnly, clientDiscountPct: 5, settings })).rejects.toMatchObject({
      code: "pricing_unavailable",
      status: 503,
    });
  });
});

describe("failure handling", () => {
  it("reports unserviced and unknown destinations as 422 not_serviced", async () => {
    const adapter = new MockDhlAdapter();
    for (const countryCode of ["SS", "TD"]) {
      const request = input({ destination: { ...validRequest.destination, countryCode } });
      await expect(priceRequest({ input: request, adapter, clientDiscountPct: 0, settings })).rejects.toMatchObject({ code: "not_serviced", status: 422 });
    }
  });

  it("reports a carrier outage as 503 without leaking details", async () => {
    const down: CarrierAdapter = {
      ...new MockDhlAdapter(),
      carrier: "dhl",
      validateAddress: async () => ({ valid: true, serviceable: true, suggestions: [], warnings: [] }),
      getRates: async () => {
        throw new CarrierError("unavailable", "boom", { detail: "secret upstream body" });
      },
    } as unknown as CarrierAdapter;
    const err = await priceRequest({ input: input(), adapter: down, clientDiscountPct: 0, settings }).catch((e) => e);
    expect(err).toBeInstanceOf(QuoteError);
    expect(err.status).toBe(503);
    expect(err.message).not.toContain("secret");
  });

  it("picks the cheapest service by what DHL charges us", async () => {
    const mock = new MockDhlAdapter();
    const [base] = await mock.getRates({
      origin: { countryCode: "CA", postalCode: "M5V", city: "Toronto" },
      destination: { countryCode: "CM", postalCode: "00237", city: "Douala" },
      parcels: validRequest.parcels,
      declaredValueCents: 0,
      isCustomsDeclarable: true,
      plannedShipDate: "2026-11-03",
    });
    const pricier: RateOption = { ...base, serviceCode: "T", serviceName: "EXPRESS 12:00", account: { ...base.account, baseFreightCents: base.account.baseFreightCents + 5000, totalCents: base.account.totalCents + 5000 }, publicList: undefined };
    const multi = { ...mock, carrier: "dhl", validateAddress: mock.validateAddress.bind(mock), getRates: async () => [pricier, base] } as unknown as CarrierAdapter;
    const r = await priceRequest({ input: input(), adapter: multi, clientDiscountPct: 0, settings });
    expect(r.option.serviceCode).toBe("P");
  });
});

describe("who sees what", () => {
  const STAFF_KEYS = ["account", "profitCents", "belowCost", "dhlContractDiscountPct", "publicSource", "pricing", "customerTotalCents", "markupCents"];

  async function savedQuote() {
    const priced = await priceRequest({ input: input({ pickupRequested: true }), adapter: new MockDhlAdapter(), clientDiscountPct: 5, settings });
    return {
      _id: "q1",
      userId: "u1",
      accountId: "a1",
      accountType: "b2c" as const,
      serviceName: priced.option.serviceName,
      estimatedDelivery: new Date(priced.option.estimatedDelivery!),
      request: priced.request,
      pricing: priced.breakdown,
      expiresAt: new Date(Date.now() + 3_600_000),
      createdAt: new Date(),
    };
  }

  const keysOf = (value: unknown, out: Set<string> = new Set()): Set<string> => {
    if (Array.isArray(value)) value.forEach((v) => keysOf(v, out));
    else if (value && typeof value === "object") {
      for (const [k, v] of Object.entries(value)) {
        out.add(k);
        keysOf(v, out);
      }
    }
    return out;
  };

  it("a client never sees the DHL account rate, profit or how the public price was obtained", async () => {
    const dto = toClientQuoteDTO(await savedQuote() as any);
    const keys = keysOf(dto);
    for (const staffKey of STAFF_KEYS) expect(keys.has(staffKey)).toBe(false);
    const json = JSON.stringify(dto);
    expect(json).not.toContain("5120"); // account base freight
    expect(json).not.toContain("userId");
    expect(json).not.toContain("accountId");
  });

  it("a client sees the public price, their discount and their final price", async () => {
    const dto = toClientQuoteDTO(await savedQuote() as any);
    expect(dto.price).toMatchObject({ publicBaseFreightCents: 12800, discountPct: 5, discountCents: 640, baseFreightCents: 12160 });
    expect(dto.price.totalCents).toBe(14976 + 1500);
    expect(dto.price.surcharges.map((s) => s.code)).toEqual(["FF", "PICKUP"]);
    expect(dto.expired).toBe(false);
  });

  it("marks a quote expired once its time is up", async () => {
    const q = await savedQuote();
    expect(toClientQuoteDTO(q as any, new Date(q.expiresAt.getTime() + 1)).expired).toBe(true);
  });

  it("staff see everything", async () => {
    const dto = toAdminQuoteDTO(await savedQuote() as any);
    expect(dto.pricing.account.baseFreightCents).toBe(5120);
    expect(dto.pricing.profitCents).toBeGreaterThan(0);
  });
});

describe("settings validation", () => {
  it("keeps the contract discount below 100", () => {
    expect(settingsSchema.safeParse({ b2cDiscountPct: 5, dhlContractDiscountPct: 75 }).success).toBe(true);
    expect(settingsSchema.safeParse({ b2cDiscountPct: 5, dhlContractDiscountPct: null }).success).toBe(true);
    expect(settingsSchema.safeParse({ b2cDiscountPct: 5 }).success).toBe(true);
    expect(settingsSchema.safeParse({ b2cDiscountPct: 5, dhlContractDiscountPct: 100 }).success).toBe(false);
    expect(settingsSchema.safeParse({ b2cDiscountPct: 5, dhlContractDiscountPct: -1 }).success).toBe(false);
  });
});

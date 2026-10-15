import { describe, expect, it } from "vitest";
import { MockDhlAdapter } from "@/lib/shipping/carriers/dhl/mock";
import type { CarrierAdapter } from "@/lib/shipping/core/adapter";
import { bookingSchema, customsItemSchema } from "../shipmentSchemas";
import { checkBookingAgainstQuote, defaultContentDescription, generateReference, itemsTotalCents } from "../bookingService";
import { quoteRequestSchema } from "../quoteSchemas";
import { priceRequest } from "../quoteService";

const item = {
  description: "Cotton shirt",
  hsCode: "6109.10.00",
  quantity: 2,
  unitValueCents: 2500,
  countryOfOrigin: "ca",
  netWeightKg: 0.4,
  exportReason: "sale",
};

const booking = {
  quoteId: "64b000000000000000000001",
  idempotencyKey: "0123456789abcdef0123456789abcdef",
  shipper: { name: "Amina", line1: "1 Main St", city: "Toronto", postalCode: "M5V 2T6", phone: "+1 514 555 0100", email: "a@example.com" },
  recipient: { name: "Kofi", line1: "12 Rue de la Paix", city: "Douala", postalCode: "00237", phone: "+237 600 000 000", countryCode: "cm" },
  items: [item],
  acceptTerms: true,
  termsVersion: "v1",
};

const quote = {
  request: {
    origin: { countryCode: "CA", postalCode: "M5V 2T6", city: "Toronto" },
    destination: { countryCode: "CM", postalCode: "00237", city: "Douala" },
    parcels: [{ weightKg: 2, lengthCm: 20, widthCm: 20, heightCm: 20 }],
    declaredValueCents: 5000,
    isCustomsDeclarable: true,
    pickupRequested: false,
    plannedShipDate: "2026-11-03",
  },
  expiresAt: new Date(Date.now() + 3_600_000),
};

describe("customs item validation", () => {
  it("accepts a complete item and normalises HS code and country", () => {
    const r = customsItemSchema.parse(item);
    expect(r.hsCode).toBe("61091000");
    expect(r.countryOfOrigin).toBe("CA");
  });

  it("will not submit without any required customs field", () => {
    for (const field of Object.keys(item)) {
      const rest = Object.fromEntries(Object.entries(item).filter(([k]) => k !== field));
      expect(customsItemSchema.safeParse(rest).success, `missing ${field}`).toBe(false);
    }
  });

  it("rejects bad HS codes, quantities, values, countries and reasons", () => {
    expect(customsItemSchema.safeParse({ ...item, hsCode: "6109" }).success).toBe(false);
    expect(customsItemSchema.safeParse({ ...item, hsCode: "abcdef" }).success).toBe(false);
    expect(customsItemSchema.safeParse({ ...item, hsCode: "12345678901" }).success).toBe(false);
    expect(customsItemSchema.safeParse({ ...item, quantity: 0 }).success).toBe(false);
    expect(customsItemSchema.safeParse({ ...item, quantity: 1.5 }).success).toBe(false);
    expect(customsItemSchema.safeParse({ ...item, unitValueCents: 0 }).success).toBe(false);
    expect(customsItemSchema.safeParse({ ...item, unitValueCents: 10.5 }).success).toBe(false);
    expect(customsItemSchema.safeParse({ ...item, countryOfOrigin: "ZZ" }).success).toBe(false);
    expect(customsItemSchema.safeParse({ ...item, exportReason: "because" }).success).toBe(false);
    expect(customsItemSchema.safeParse({ ...item, description: "   " }).success).toBe(false);
  });
});

describe("booking validation", () => {
  it("accepts a complete booking and defaults duties to the recipient", () => {
    const r = bookingSchema.parse(booking);
    expect(r.dutiesPayer).toBe("recipient");
    expect(r.recipient.countryCode).toBe("CM");
  });

  it("needs terms, a decent idempotency key, items and contact details", () => {
    expect(bookingSchema.safeParse({ ...booking, acceptTerms: false }).success).toBe(false);
    expect(bookingSchema.safeParse({ ...booking, idempotencyKey: "short" }).success).toBe(false);
    expect(bookingSchema.safeParse({ ...booking, idempotencyKey: "has spaces and symbols !!!!!!!!!" }).success).toBe(false);
    expect(bookingSchema.safeParse({ ...booking, items: [] }).success).toBe(false);
    expect(bookingSchema.safeParse({ ...booking, shipper: { ...booking.shipper, email: "" } }).success).toBe(false);
    expect(bookingSchema.safeParse({ ...booking, recipient: { ...booking.recipient, phone: "abc" } }).success).toBe(false);
    expect(bookingSchema.safeParse({ ...booking, recipient: { ...booking.recipient, line1: "" } }).success).toBe(false);
  });

  it("the recipient email is optional, and duties can be paid by the sender", () => {
    expect(bookingSchema.safeParse(booking).success).toBe(true);
    expect(bookingSchema.parse({ ...booking, dutiesPayer: "sender" }).dutiesPayer).toBe("sender");
    expect(bookingSchema.safeParse({ ...booking, dutiesPayer: "nobody" }).success).toBe(false);
  });

  it("ignores any price, status or tracking field a client tries to send", () => {
    const r = bookingSchema.parse({ ...booking, totalCents: 1, status: "paid", trackingNumber: "X", accountType: "b2b" }) as Record<string, unknown>;
    for (const k of ["totalCents", "status", "trackingNumber", "accountType"]) expect(r[k]).toBeUndefined();
  });
});

describe("booking against the saved quote", () => {
  const input = bookingSchema.parse(booking);

  it("passes when the booking describes the quoted shipment", () => {
    expect(itemsTotalCents(input.items)).toBe(5000);
    expect(checkBookingAgainstQuote(input, quote)).toEqual([]);
  });

  it("ignores spaces and case in postal codes", () => {
    const loose = bookingSchema.parse({ ...booking, shipper: { ...booking.shipper, postalCode: "m5v2t6" } });
    expect(checkBookingAgainstQuote(loose, quote)).toEqual([]);
  });

  it("rejects customs values that do not add up to the quoted declared value", () => {
    const changed = bookingSchema.parse({ ...booking, items: [{ ...item, quantity: 3 }] });
    expect(checkBookingAgainstQuote(changed, quote).map((i) => i.path)).toContain("items");
  });

  it("rejects a different destination country or postal code, or a different pickup postal code", () => {
    const country = bookingSchema.parse({ ...booking, recipient: { ...booking.recipient, countryCode: "ng" } });
    expect(checkBookingAgainstQuote(country, quote).map((i) => i.path)).toContain("recipient.countryCode");
    const postal = bookingSchema.parse({ ...booking, recipient: { ...booking.recipient, postalCode: "99999" } });
    expect(checkBookingAgainstQuote(postal, quote).map((i) => i.path)).toContain("recipient.postalCode");
    const origin = bookingSchema.parse({ ...booking, shipper: { ...booking.shipper, postalCode: "H2X 1Y4" } });
    expect(checkBookingAgainstQuote(origin, quote).map((i) => i.path)).toContain("shipper.postalCode");
  });

  it("rejects items that weigh more than the parcels", () => {
    const heavy = bookingSchema.parse({ ...booking, items: [{ ...item, netWeightKg: 5, quantity: 1, unitValueCents: 5000 }] });
    expect(checkBookingAgainstQuote(heavy, quote).map((i) => i.message).join()).toMatch(/weigh more/);
  });

  it("rejects an expired quote", () => {
    const expired = { ...quote, expiresAt: new Date(Date.now() - 1000) };
    expect(checkBookingAgainstQuote(input, expired).map((i) => i.path)).toContain("quoteId");
  });

  it("builds a content description from the items", () => {
    expect(defaultContentDescription([item, { ...item }, { ...item, description: "Wool socks" }].map((i) => customsItemSchema.parse(i)))).toBe("Cotton shirt, Wool socks");
  });
});

describe("shipment reference", () => {
  it("looks like EX-YYMMDD-XXXXX and is practically unique", () => {
    const now = new Date("2026-10-15T12:00:00Z");
    const set = new Set(Array.from({ length: 2000 }, () => generateReference(now)));
    expect(set.size).toBe(2000);
    for (const ref of set) expect(ref).toMatch(/^EX-261015-[A-HJKMNP-Z2-9]{5}$/);
  });
});

describe("the pickup fee comes from DHL", () => {
  const input = (pickup: boolean) =>
    quoteRequestSchema.parse({
      origin: { postalCode: "M5V 2T6", city: "Toronto" },
      destination: { countryCode: "CM", postalCode: "00237", city: "Douala" },
      parcels: [{ weightKg: 2, lengthCm: 20, widthCm: 20, heightCm: 20 }],
      declaredValueCents: 5000,
      pickupRequested: pickup,
    });

  it("uses DHL's fee over the Settings fallback", async () => {
    const r = await priceRequest({ input: input(true), adapter: new MockDhlAdapter(), clientDiscountPct: 5, settings: { dhlContractDiscountPct: null, pickupFeeCents: 9999 } });
    expect(r.breakdown.pickupFeeCents).toBe(1500); // the mock DHL fee, not 9999
  });

  it("charges no pickup fee for drop-off, whatever DHL or Settings say", async () => {
    const r = await priceRequest({ input: input(false), adapter: new MockDhlAdapter(), clientDiscountPct: 5, settings: { dhlContractDiscountPct: null, pickupFeeCents: 9999 } });
    expect(r.breakdown.pickupFeeCents).toBe(0);
  });

  it("falls back to the Settings fee only when DHL supplies none", async () => {
    const mock = new MockDhlAdapter();
    const noFee = {
      carrier: "dhl",
      validateAddress: mock.validateAddress.bind(mock),
      getRates: async (req: Parameters<CarrierAdapter["getRates"]>[0]) => (await mock.getRates(req)).map((o) => ({ ...o, pickupFeeCents: undefined })),
    } as unknown as CarrierAdapter;
    const r = await priceRequest({ input: input(true), adapter: noFee, clientDiscountPct: 5, settings: { dhlContractDiscountPct: null, pickupFeeCents: 900 } });
    expect(r.breakdown.pickupFeeCents).toBe(900);
  });

  it("passes the pickup request to the carrier so it can quote the fee", async () => {
    let seen: boolean | undefined;
    const mock = new MockDhlAdapter();
    const spy = {
      carrier: "dhl",
      validateAddress: mock.validateAddress.bind(mock),
      getRates: async (req: Parameters<CarrierAdapter["getRates"]>[0]) => {
        seen = req.pickupRequested;
        return mock.getRates(req);
      },
    } as unknown as CarrierAdapter;
    await priceRequest({ input: input(true), adapter: spy, clientDiscountPct: 0, settings: { dhlContractDiscountPct: null, pickupFeeCents: 0 } });
    expect(seen).toBe(true);
  });
});

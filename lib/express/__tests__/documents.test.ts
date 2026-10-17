import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/mongoose", () => ({ default: async () => undefined }));

import { MockDhlAdapter } from "@/lib/shipping/carriers/dhl/mock";
import { DhlApiAdapter } from "@/lib/shipping/carriers/dhl/live";
import { DhlHttpClient } from "@/lib/shipping/carriers/dhl/client";
import type { DhlConfig } from "@/lib/express/config";
import type { CarrierAdapter } from "@/lib/shipping/core/adapter";
import type { RateOption } from "@/lib/shipping/core/types";
import { quoteRequestSchema } from "../quoteSchemas";
import { QuoteError, normalizeRequest, priceRequest } from "../quoteService";
import { bookingSchema } from "../shipmentSchemas";
import { checkBookingAgainstQuote } from "../bookingService";
import { buildShipmentRequest } from "../fulfilment";
import { toClientShipmentDTO, toCustomerShipmentDTO } from "../shipmentDto";
import { toClientQuoteDTO } from "../quoteDto";
import { contentTypeOf, productCodeFor } from "../contentType";
import { settingsSchema } from "../validation";

const base = {
  origin: { postalCode: "M5V 2T6", city: "Toronto" },
  destination: { countryCode: "cm", postalCode: "00237", city: "Douala" },
  parcels: [{ weightKg: 0.5, lengthCm: 30, widthCm: 25, heightCm: 2 }],
  declaredValueCents: 0,
};
const docsInput = (over: Record<string, unknown> = {}) => quoteRequestSchema.parse({ ...base, contentType: "documents", ...over });
const settings = { dhlContractDiscountPct: null as number | null, pickupFeeCents: 0 };

const option = (serviceCode: string): RateOption => ({
  carrier: "dhl",
  serviceCode,
  serviceName: serviceCode,
  currency: "CAD",
  account: { baseFreightCents: 1000, surcharges: [], totalCents: 1000 },
  publicList: { baseFreightCents: 2000, surcharges: [], totalCents: 2000 },
});
const adapterReturning = (...codes: string[]): CarrierAdapter => ({
  carrier: "dhl",
  getRates: async () => codes.map(option),
  validateAddress: async () => ({ valid: true, serviceable: true, suggestions: [], warnings: [] }),
  createShipment: async () => {
    throw new Error("unused");
  },
  bookPickup: async () => {
    throw new Error("unused");
  },
  track: async () => {
    throw new Error("unused");
  },
});

describe("content type helpers", () => {
  it("documents use DHL product D, goods use P, and unknown or old records are goods", () => {
    expect(productCodeFor("documents")).toBe("D");
    expect(productCodeFor("goods")).toBe("P");
    expect(productCodeFor(undefined)).toBe("P");
    expect(contentTypeOf("anything")).toBe("goods");
  });
});

describe("quoting documents", () => {
  it("defaults to goods", () => {
    expect(quoteRequestSchema.parse({ ...base, declaredValueCents: 500 }).contentType).toBe("goods");
  });

  it("a documents request is never customs-declarable and carries no value, whatever the client sent", () => {
    const n = normalizeRequest(docsInput({ declaredValueCents: 99_999, isCustomsDeclarable: true }));
    expect(n.contentType).toBe("documents");
    expect(n.isCustomsDeclarable).toBe(false);
    expect(n.declaredValueCents).toBe(0);
  });

  it("prices documents on DHL product D through the mock carrier", async () => {
    const priced = await priceRequest({ input: docsInput(), adapter: new MockDhlAdapter(), clientDiscountPct: 10, settings });
    expect(priced.option.serviceCode).toBe("D");
    expect(priced.request.contentType).toBe("documents");
    expect(priced.breakdown.client.totalCents).toBeGreaterThan(0);
  });

  it("goods still price on product P", async () => {
    const priced = await priceRequest({ input: quoteRequestSchema.parse({ ...base, declaredValueCents: 5000 }), adapter: new MockDhlAdapter(), clientDiscountPct: 0, settings });
    expect(priced.option.serviceCode).toBe("P");
  });

  it("refuses documents over the weight limit and points to goods; the limit is a setting", async () => {
    const heavy = docsInput({ parcels: [{ weightKg: 1.5, lengthCm: 30, widthCm: 25, heightCm: 2 }, { weightKg: 1, lengthCm: 30, widthCm: 25, heightCm: 2 }] });
    const run = (limit?: number) => priceRequest({ input: heavy, adapter: new MockDhlAdapter(), clientDiscountPct: 0, settings: { ...settings, documentMaxWeightKg: limit } });
    await expect(run()).rejects.toMatchObject({ code: "documents_too_heavy", status: 422 }); // default 2 kg, total 2.5 kg
    await expect(run(2)).rejects.toBeInstanceOf(QuoteError);
    await expect(run(3)).resolves.toBeTruthy();
  });

  it("the limit counts all parcels together and exactly the limit is allowed", async () => {
    const exact = docsInput({ parcels: [{ weightKg: 1, lengthCm: 30, widthCm: 25, heightCm: 2 }, { weightKg: 1, lengthCm: 30, widthCm: 25, heightCm: 2 }] });
    await expect(priceRequest({ input: exact, adapter: new MockDhlAdapter(), clientDiscountPct: 0, settings })).resolves.toBeTruthy();
  });

  it("goods are not held to the document weight limit", async () => {
    const goods = quoteRequestSchema.parse({ ...base, declaredValueCents: 5000, parcels: [{ weightKg: 20, lengthCm: 30, widthCm: 25, heightCm: 20 }] });
    await expect(priceRequest({ input: goods, adapter: new MockDhlAdapter(), clientDiscountPct: 0, settings })).resolves.toBeTruthy();
  });

  it("a route without the document product says so instead of quoting a parcel product", async () => {
    await expect(priceRequest({ input: docsInput(), adapter: adapterReturning("P"), clientDiscountPct: 0, settings })).rejects.toMatchObject({ code: "documents_unavailable" });
  });

  it("only the product the booking will use is quoted: documents ignore P, goods ignore D", async () => {
    const docs = await priceRequest({ input: docsInput(), adapter: adapterReturning("P", "D"), clientDiscountPct: 0, settings });
    expect(docs.option.serviceCode).toBe("D");
    const goods = await priceRequest({ input: quoteRequestSchema.parse({ ...base, declaredValueCents: 100 }), adapter: adapterReturning("D", "P"), clientDiscountPct: 0, settings });
    expect(goods.option.serviceCode).toBe("P");
    await expect(priceRequest({ input: quoteRequestSchema.parse({ ...base, declaredValueCents: 100 }), adapter: adapterReturning("D"), clientDiscountPct: 0, settings })).rejects.toMatchObject({ code: "not_serviced" });
  });
});

describe("booking documents", () => {
  const docsQuote = { request: { ...normalizeRequest(docsInput(), new Date("2026-11-01T00:00:00Z")) }, expiresAt: new Date(Date.now() + 3_600_000) };
  const goodsQuote = { request: { ...docsQuote.request, contentType: "goods" as const, declaredValueCents: 5000, isCustomsDeclarable: true }, expiresAt: docsQuote.expiresAt };
  const people = {
    quoteId: "64b000000000000000000001",
    idempotencyKey: "0123456789abcdef0123456789abcdef",
    shipper: { name: "Amina", line1: "1 Main St", city: "Toronto", postalCode: "M5V 2T6", phone: "+1 514 555 0100", email: "a@example.com" },
    recipient: { name: "Kofi", line1: "12 Rue de la Paix", city: "Douala", postalCode: "00237", phone: "+237 600 000 000", countryCode: "cm" },
    acceptTerms: true,
    termsVersion: "v1",
  };
  const goodsItem = { description: "Shirt", hsCode: "610910", quantity: 1, unitValueCents: 5000, countryOfOrigin: "CA", netWeightKg: 0.3, exportReason: "sale" };

  it("accepts documents with no items, a description and the declaration", () => {
    const input = bookingSchema.parse({ ...people, contentDescription: "Employment contract", documentsDeclaration: true });
    expect(input.items).toEqual([]);
    expect(checkBookingAgainstQuote(input, docsQuote)).toEqual([]);
  });

  it("will not accept documents without a description or without the declaration", () => {
    const noDesc = bookingSchema.parse({ ...people, documentsDeclaration: true });
    expect(checkBookingAgainstQuote(noDesc, docsQuote).map((i) => i.path)).toEqual(["contentDescription"]);
    const noDecl = bookingSchema.parse({ ...people, contentDescription: "Diploma" });
    expect(checkBookingAgainstQuote(noDecl, docsQuote).map((i) => i.path)).toEqual(["documentsDeclaration"]);
    const tiny = bookingSchema.parse({ ...people, contentDescription: "  x ", documentsDeclaration: true });
    expect(checkBookingAgainstQuote(tiny, docsQuote).map((i) => i.path)).toEqual(["contentDescription"]);
  });

  it("will not accept customs items on a documents quote", () => {
    const input = bookingSchema.parse({ ...people, contentDescription: "Diploma", documentsDeclaration: true, items: [goodsItem] });
    expect(checkBookingAgainstQuote(input, docsQuote).map((i) => i.path)).toContain("items");
  });

  it("the declaration can only be 'true'", () => {
    expect(bookingSchema.safeParse({ ...people, documentsDeclaration: false }).success).toBe(false);
  });

  it("goods still need at least one item, and an old quote with no content type is goods", () => {
    const empty = bookingSchema.parse({ ...people });
    expect(checkBookingAgainstQuote(empty, goodsQuote).map((i) => i.path)).toEqual(["items"]);
    const oldQuote = { request: { ...goodsQuote.request, contentType: undefined }, expiresAt: goodsQuote.expiresAt };
    expect(checkBookingAgainstQuote(empty, oldQuote).map((i) => i.path)).toEqual(["items"]);
    const full = bookingSchema.parse({ ...people, items: [goodsItem] });
    expect(checkBookingAgainstQuote(full, goodsQuote)).toEqual([]);
  });
});

describe("sending documents to DHL", () => {
  const shipment = {
    reference: "EX-1",
    shipper: { line1: "1", city: "Toronto", postalCode: "M5V2T6", countryCode: "CA", name: "A", phone: "+14165550100" },
    recipient: { line1: "2", city: "Douala", postalCode: "00237", countryCode: "CM", name: "B", phone: "+237600000000" },
    parcels: [{ weightKg: 0.5, lengthCm: 30, widthCm: 25, heightCm: 2 }],
    items: [],
    declaredValueCents: 0,
    contentDescription: "Employment contract",
    plannedShipDate: "2099-01-01",
    dutiesPayer: "recipient" as const,
    pickupRequested: false,
  };

  it("builds a product D request for documents and P for goods and for old records", () => {
    expect(buildShipmentRequest({ ...shipment, contentType: "documents" } as any, new Date()).serviceCode).toBe("D");
    expect(buildShipmentRequest({ ...shipment, contentType: "documents" } as any, new Date()).contentType).toBe("documents");
    expect(buildShipmentRequest({ ...shipment, contentType: "goods" } as any, new Date()).serviceCode).toBe("P");
    expect(buildShipmentRequest({ ...shipment } as any, new Date()).serviceCode).toBe("P");
  });

  const config: DhlConfig = { mode: "sandbox", baseUrl: "https://dhl.test", apiKey: "k", apiSecret: "s", accountNumber: "123456789" };
  async function sentBody(request: Record<string, unknown>) {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ shipmentTrackingNumber: "1", documents: [{ typeCode: "label", content: "QQ==" }] }), { status: 201 }));
    const adapter = new DhlApiAdapter(config, new DhlHttpClient(config, fetchImpl as unknown as typeof fetch, async () => {}));
    await adapter.createShipment({ ...shipment, serviceCode: "D", ...request } as any);
    const [, init] = fetchImpl.mock.calls[0] as unknown as [URL, RequestInit];
    return JSON.parse(String(init.body));
  }

  it("a documents booking sends no customs declaration, no value and no duties service", async () => {
    const body = await sentBody({ contentType: "documents", dutiesPayer: "sender" });
    expect(body.productCode).toBe("D");
    expect(body.content.isCustomsDeclarable).toBe(false);
    expect(body.content.exportDeclaration).toBeUndefined();
    expect(body.content.declaredValue).toBeUndefined();
    expect(body.valueAddedServices).toBeUndefined();
    expect(body.accounts).toEqual([{ typeCode: "shipper", number: "123456789" }]);
    // The schema still requires these for every shipment.
    expect(body.content.description).toBe("Employment contract");
    expect(body.content.incoterm).toBe("DAP");
    expect(body.content.unitOfMeasurement).toBe("metric");
  });

  it("a goods booking still sends its declaration and keeps the sender-pays duties service", async () => {
    const body = await sentBody({
      serviceCode: "P",
      contentType: "goods",
      dutiesPayer: "sender",
      declaredValueCents: 5000,
      items: [{ description: "Shirt", hsCode: "610910", quantity: 1, unitValueCents: 5000, countryOfOrigin: "CA", netWeightKg: 0.3, exportReason: "gift" }],
    });
    expect(body.content.isCustomsDeclarable).toBe(true);
    expect(body.content.exportDeclaration.lineItems).toHaveLength(1);
    expect(body.content.exportDeclaration.lineItems[0].exportReasonType).toBe("gift");
    expect(body.content.declaredValue).toBe(50);
    expect(body.valueAddedServices).toEqual([{ serviceCode: "DD" }]);
  });

  it("a long description is cut to DHL's 70 characters", async () => {
    const body = await sentBody({ contentType: "documents", contentDescription: "x".repeat(150) });
    expect(body.content.description).toHaveLength(70);
  });
});

describe("what clients see", () => {
  it("shipments and quotes say documents or goods, and old records say goods", () => {
    const sh: any = { _id: "s", status: "label_ready", contentType: "documents" };
    expect(toClientShipmentDTO(sh).contentType).toBe("documents");
    expect(toCustomerShipmentDTO(sh).contentType).toBe("documents");
    expect(toClientShipmentDTO({ _id: "s", status: "paid" } as any).contentType).toBe("goods");
    const pricing: any = { publicList: { baseFreightCents: 1 }, clientDiscountPct: 0, discountCents: 0, client: { baseFreightCents: 1, surcharges: [], totalCents: 1 } };
    expect(toClientQuoteDTO({ _id: "q", pricing, request: { contentType: "documents", destination: {} } } as any).contentType).toBe("documents");
    expect(toClientQuoteDTO({ _id: "q", pricing, request: { destination: {} } } as any).contentType).toBe("goods");
  });
});

describe("document weight limit setting", () => {
  it("is optional, and must be between 0.1 and 70 kg", () => {
    expect(settingsSchema.safeParse({ b2cDiscountPct: 5 }).success).toBe(true);
    expect(settingsSchema.parse({ b2cDiscountPct: 5, documentMaxWeightKg: 2.5 }).documentMaxWeightKg).toBe(2.5);
    expect(settingsSchema.safeParse({ b2cDiscountPct: 5, documentMaxWeightKg: 0 }).success).toBe(false);
    expect(settingsSchema.safeParse({ b2cDiscountPct: 5, documentMaxWeightKg: 71 }).success).toBe(false);
  });
});

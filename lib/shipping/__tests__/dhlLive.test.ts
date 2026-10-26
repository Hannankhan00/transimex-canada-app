import { describe, expect, it, vi } from "vitest";
import type { DhlConfig } from "@/lib/express/config";
import { DhlHttpClient } from "../carriers/dhl/client";
import { DhlApiAdapter, isVisibleTrackingEvent, mapTrackingStatus, splitBreakdown } from "../carriers/dhl/live";
import type { RateRequest } from "../core/types";

const config: DhlConfig = { mode: "sandbox", baseUrl: "https://dhl.test", apiKey: "k", apiSecret: "s", accountNumber: "123456789", importAccountNumber: "987654321" };
const noSleep = async () => {};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function adapterWith(fetchImpl: unknown) {
  return new DhlApiAdapter(config, new DhlHttpClient(config, fetchImpl as typeof fetch, noSleep));
}

const rateRequest: RateRequest = {
  origin: { countryCode: "CA", postalCode: "M5V2T6", city: "Toronto" },
  destination: { countryCode: "CM", postalCode: "00237", city: "Douala" },
  parcels: [{ weightKg: 2, lengthCm: 20, widthCm: 20, heightCm: 20 }],
  declaredValueCents: 10000,
  isCustomsDeclarable: true,
  plannedShipDate: "2026-11-02",
};

function ratesBody(currency: string, total: number, lineTotal: number) {
  return {
    products: [
      {
        productName: "EXPRESS WORLDWIDE",
        productCode: "P",
        totalPrice: [{ currencyType: "BILLC", priceCurrency: currency, price: total }],
        detailedPriceBreakdown: [
          {
            currencyType: "BILLC",
            priceCurrency: currency,
            breakdown: [{ name: "EXPRESS WORLDWIDE", serviceCode: "P", price: lineTotal }],
          },
        ],
        deliveryCapabilities: { estimatedDeliveryDateAndTime: "2026-11-06T18:00:00" },
      },
    ],
  };
}

describe("DHL rate mapping", () => {
  it("splits the billing-currency breakdown into base freight and surcharges", () => {
    const split = splitBreakdown("P", [
      { name: "EXPRESS WORLDWIDE", serviceCode: "P", price: 100.5 },
      { name: "FUEL SURCHARGE", serviceCode: "FF", price: 22.11 },
      { name: "ZERO LINE", serviceCode: "ZZ", price: 0 },
    ]);
    expect(split.baseFreightCents).toBe(10050);
    expect(split.surcharges).toEqual([{ code: "FF", name: "FUEL SURCHARGE", amountCents: 2211 }]);
  });

  it("builds rate options from a DHL response and converts nothing", async () => {
    const body = {
      products: [
        {
          productName: "EXPRESS WORLDWIDE",
          productCode: "P",
          totalPrice: [
            { currencyType: "BILLC", priceCurrency: "CAD", price: 122.61 },
            { currencyType: "PULCL", priceCurrency: "CAD", price: 122.61 },
          ],
          detailedPriceBreakdown: [
            {
              currencyType: "BILLC",
              priceCurrency: "CAD",
              breakdown: [
                { name: "EXPRESS WORLDWIDE", serviceCode: "P", price: 100.5 },
                { name: "FUEL SURCHARGE", serviceCode: "FF", price: 22.11 },
              ],
            },
          ],
        },
      ],
    };
    const [rate] = await adapterWith(vi.fn(async () => json(body))).getRates(rateRequest);
    expect(rate.account.totalCents).toBe(12261);
    expect(rate.account.baseFreightCents).toBe(10050);
    expect(rate.account.surcharges).toHaveLength(1);
    expect(rate.publicList).toBeUndefined();
  });

  it("follows DHL's sample: first line has no serviceCode, unpriced option lines are ignored", () => {
    const split = splitBreakdown("P", [
      { name: "EXPRESS WORLDWIDE", price: 130 },
      { name: "FUEL SURCHARGE", serviceCode: "FF", price: 27.68 },
      { name: "SATURDAY DELIVERY", serviceCode: "AA" } as any,
      { name: "IMPORT BILLING ACCOUNT", serviceCode: "30" } as any,
    ]);
    expect(split.baseFreightCents).toBe(13000);
    expect(split.surcharges).toEqual([{ code: "FF", name: "FUEL SURCHARGE", amountCents: 2768 }]);
  });

  it("sends the schema's shape: accounts array, no top-level accountNumber, x-version header", async () => {
    const fetchImpl = vi.fn(async () => json({ products: [] }));
    await adapterWith(fetchImpl).getRates(rateRequest);
    const [, init] = fetchImpl.mock.calls[0] as unknown as [URL, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(body.accounts).toEqual([{ typeCode: "shipper", number: "123456789" }]);
    expect(body.accountNumber).toBeUndefined();
    expect((init.headers as Record<string, string>)["x-version"]).toBe("3.3.4");
  });

  it("refuses a non-CAD billing currency rather than converting", async () => {
    await expect(adapterWith(vi.fn(async () => json(ratesBody("USD", 10, 10)))).getRates(rateRequest)).rejects.toMatchObject({
      code: "config",
    });
  });

  it("rejects a breakdown that does not add up to the total", async () => {
    await expect(adapterWith(vi.fn(async () => json(ratesBody("CAD", 99, 10)))).getRates(rateRequest)).rejects.toMatchObject({
      code: "unknown",
    });
  });

  it("maps a 404 on rates to not_serviced", async () => {
    await expect(adapterWith(vi.fn(async () => json({ detail: "none" }, 404))).getRates(rateRequest)).rejects.toMatchObject({
      code: "not_serviced",
    });
  });
});

describe("DHL retry rules", () => {
  it("retries read calls on 503 then succeeds", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(json({}, 503))
      .mockResolvedValueOnce(json({ shipments: [{ events: [] }] }));
    const result = await adapterWith(fetchImpl).track("123");
    expect(result.status).toBe("unknown");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("never retries a booking call and flags the outcome as unknown on timeout", async () => {
    const timeout = Object.assign(new Error("timed out"), { name: "TimeoutError" });
    const fetchImpl = vi.fn().mockRejectedValue(timeout);
    await expect(
      adapterWith(fetchImpl).createShipment({
        reference: "r1",
        serviceCode: "P",
        shipper: { line1: "1", city: "Toronto", postalCode: "M5V2T6", countryCode: "CA" },
        recipient: { line1: "2", city: "Douala", postalCode: "00237", countryCode: "CM" },
        parcels: rateRequest.parcels,
        items: [],
        declaredValueCents: 100,
        contentDescription: "x",
        plannedShipDate: "2026-11-02",
        dutiesPayer: "recipient",
        pickupRequested: false,
      })
    ).rejects.toMatchObject({ code: "timeout", outcomeUnknown: true });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("sends Basic auth and does not retry a 401", async () => {
    const fetchImpl = vi.fn(async () => json({}, 401));
    await expect(adapterWith(fetchImpl).track("123")).rejects.toMatchObject({ code: "auth" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const init = (fetchImpl.mock.calls as unknown as [unknown, RequestInit][])[0][1];
    expect((init.headers as Record<string, string>).Authorization).toBe(`Basic ${Buffer.from("k:s").toString("base64")}`);
  });
});

describe("DHL tracking mapping", () => {
  it("maps event codes to neutral statuses", () => {
    expect(mapTrackingStatus("OK")).toBe("delivered");
    expect(mapTrackingStatus("WC")).toBe("out_for_delivery");
    expect(mapTrackingStatus("PU")).toBe("in_transit");
    expect(mapTrackingStatus("MS")).toBe("exception");
  });

  it("a normal hub scan (PL, processed at location) is movement, never 'awaiting pickup'", () => {
    expect(mapTrackingStatus("PL")).toBe("in_transit");
    expect(mapTrackingStatus("AF")).toBe("in_transit");
    expect(mapTrackingStatus("DF")).toBe("in_transit");
    expect(mapTrackingStatus("SD")).toBe("pre_transit");
  });

  it("delivered damaged still counts as delivered; refusals, holds and delays are exceptions", () => {
    expect(mapTrackingStatus("DD")).toBe("delivered");
    for (const code of ["RD", "NH", "BA", "HP", "CD", "UD", "OH", "ND", "MD", "CM"]) expect(mapTrackingStatus(code)).toBe("exception");
    expect(mapTrackingStatus("RT")).toBe("returned");
  });

  it("internal scans DHL marks as not visible are dropped from the timeline", () => {
    for (const code of ["LV", "UV", "RW", "MF", "CI", "DP"]) expect(isVisibleTrackingEvent(code)).toBe(false);
    for (const code of ["PU", "PL", "OK", "WC", "RD"]) expect(isVisibleTrackingEvent(code)).toBe(true);
  });

  it("the adapter leaves internal events out of the result", async () => {
    const body = {
      shipments: [
        {
          events: [
            { date: "2026-10-09", time: "10:00:00", typeCode: "PU", description: "Shipment picked up" },
            { date: "2026-10-09", time: "11:00:00", typeCode: "LV", description: "Load vehicle" },
            { date: "2026-10-09", time: "12:00:00", typeCode: "PL", description: "Processed at Montreal" },
          ],
        },
      ],
    };
    const result = await adapterWith(vi.fn(async () => json(body))).track("123");
    expect(result.events.map((e) => e.description)).toEqual(["Processed at Montreal", "Shipment picked up"]);
    expect(result.status).toBe("in_transit");
  });
});

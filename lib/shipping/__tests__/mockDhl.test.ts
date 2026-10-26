import { describe, expect, it } from "vitest";
import { MockDhlAdapter } from "./support/fakeDhl";
import type { RateRequest, ShipmentRequest } from "../core/types";

const baseRate: RateRequest = {
  origin: { countryCode: "CA", postalCode: "M5V 2T6", city: "Toronto" },
  destination: { countryCode: "CM", postalCode: "00237", city: "Douala" },
  parcels: [{ weightKg: 2, lengthCm: 20, widthCm: 20, heightCm: 20 }],
  declaredValueCents: 10000,
  isCustomsDeclarable: true,
  plannedShipDate: "2026-11-02",
};

const shipment: ShipmentRequest = {
  reference: "express-shipment-1",
  serviceCode: "P",
  shipper: { name: "A", line1: "1 Main", city: "Toronto", postalCode: "M5V 2T6", countryCode: "CA" },
  recipient: { name: "B", line1: "2 Rue", city: "Douala", postalCode: "00237", countryCode: "CM" },
  parcels: baseRate.parcels,
  items: [
    { description: "Shirt", hsCode: "610910", quantity: 2, unitValueCents: 2500, countryOfOrigin: "CA", netWeightKg: 0.5, exportReason: "sale" },
  ],
  declaredValueCents: 5000,
  contentDescription: "Clothing",
  plannedShipDate: "2026-11-02",
  dutiesPayer: "recipient",
  pickupRequested: false,
};

describe("MockDhlAdapter rates", () => {
  const dhl = new MockDhlAdapter();

  it("returns integer-cent prices where total = base + surcharges", async () => {
    const [rate] = await dhl.getRates(baseRate);
    for (const price of [rate.account, rate.publicList!]) {
      expect(Number.isInteger(price.baseFreightCents)).toBe(true);
      const sum = price.surcharges.reduce((s, x) => s + x.amountCents, price.baseFreightCents);
      expect(price.totalCents).toBe(sum);
    }
    expect(rate.currency).toBe("CAD");
  });

  it("charges the account rate below the public list price", async () => {
    const [rate] = await dhl.getRates(baseRate);
    expect(rate.account.baseFreightCents).toBeLessThan(rate.publicList!.baseFreightCents);
  });

  it("charges more for heavier parcels and uses volumetric weight", async () => {
    const [light] = await dhl.getRates(baseRate);
    const [heavy] = await dhl.getRates({ ...baseRate, parcels: [{ weightKg: 10, lengthCm: 20, widthCm: 20, heightCm: 20 }] });
    const [bulky] = await dhl.getRates({ ...baseRate, parcels: [{ weightKg: 1, lengthCm: 80, widthCm: 60, heightCm: 50 }] });
    expect(heavy.account.baseFreightCents).toBeGreaterThan(light.account.baseFreightCents);
    expect(bulky.account.baseFreightCents).toBeGreaterThan(light.account.baseFreightCents);
  });

  it("adds a remote-area surcharge for remote postal codes", async () => {
    const [normal] = await dhl.getRates(baseRate);
    const [remote] = await dhl.getRates({ ...baseRate, destination: { ...baseRate.destination, postalCode: "00299" } });
    expect(normal.account.surcharges.some((s) => s.code === "OO")).toBe(false);
    expect(remote.account.surcharges.some((s) => s.code === "OO")).toBe(true);
  });

  it("reports unserviced destinations as not_serviced", async () => {
    await expect(dhl.getRates({ ...baseRate, destination: { ...baseRate.destination, countryCode: "SS" } })).rejects.toMatchObject({
      code: "not_serviced",
    });
  });
});

describe("MockDhlAdapter without a public price", () => {
  it("omits the public list price when asked, like an account-rate-only API", async () => {
    const [rate] = await new MockDhlAdapter({ omitPublicList: true }).getRates(baseRate);
    expect(rate.publicList).toBeUndefined();
    expect(rate.account.totalCents).toBeGreaterThan(0);
  });
});

describe("MockDhlAdapter shipments", () => {
  it("returns the same tracking number for the same reference", async () => {
    const dhl = new MockDhlAdapter();
    const a = await dhl.createShipment(shipment);
    const b = await dhl.createShipment(shipment);
    expect(a.trackingNumber).toBe(b.trackingNumber);
    expect(a.trackingNumber).toMatch(/^MOCK\d{10}$/);
  });

  it("returns a PDF label", async () => {
    const result = await new MockDhlAdapter().createShipment(shipment);
    const bytes = Buffer.from(result.label.contentBase64, "base64");
    expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
    expect(result.trackingUrl).toContain(result.trackingNumber);
  });

  it("confirms a pickup only when requested", async () => {
    const dhl = new MockDhlAdapter();
    expect((await dhl.createShipment(shipment)).pickupConfirmation).toBeUndefined();
    expect((await dhl.createShipment({ ...shipment, reference: "x2", pickupRequested: true })).pickupConfirmation).toBeTruthy();
  });

  it("advances tracking events over time, newest first", async () => {
    let now = 1_000_000_000_000;
    const dhl = new MockDhlAdapter({ now: () => now });
    const { trackingNumber } = await dhl.createShipment(shipment);

    expect((await dhl.track(trackingNumber)).status).toBe("pre_transit");
    now += 40 * 3_600_000;
    const mid = await dhl.track(trackingNumber);
    expect(mid.status).toBe("in_transit");
    expect(mid.events.length).toBeGreaterThan(1);
    now += 100 * 3_600_000;
    const done = await dhl.track(trackingNumber);
    expect(done.status).toBe("delivered");
    expect(done.events[0].status).toBe("delivered");
  });

  it("rejects unknown tracking numbers", async () => {
    await expect(new MockDhlAdapter().track("123")).rejects.toMatchObject({ code: "not_found" });
  });

  it("validates addresses, flagging remote and unserviced ones", async () => {
    const dhl = new MockDhlAdapter();
    expect((await dhl.validateAddress(shipment.recipient)).serviceable).toBe(true);
    const remote = await dhl.validateAddress({ ...shipment.recipient, postalCode: "00299" });
    expect(remote.warnings.length).toBe(1);
    expect((await dhl.validateAddress({ ...shipment.recipient, countryCode: "SS" })).serviceable).toBe(false);
  });
});

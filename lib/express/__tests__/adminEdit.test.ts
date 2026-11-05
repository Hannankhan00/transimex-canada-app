import { describe, expect, it } from "vitest";
import { adminEditSchema, auditDetails, diffShipment, editBlockReason, type EditSnapshot } from "../adminEdit";

const address = { name: "Sam", company: "XYZ", line1: "4629 Rue Louis B-Mayer", line2: "", city: "Laval", region: "QC", postalCode: "H7P6G5", countryCode: "CA", phone: "5145550100", email: "sam@example.com" };

const base = (): EditSnapshot =>
  ({
    shipper: { ...address },
    recipient: { ...address, name: "Alex", city: "New York", region: "NY", postalCode: "10001", countryCode: "US", email: "" },
    parcels: [{ weightKg: 1, lengthCm: 30, widthCm: 20, heightCm: 10 }],
    items: [{ description: "Shirt", hsCode: "610910", quantity: 2, unitValueCents: 2500, countryOfOrigin: "CA", netWeightKg: 0.5, exportReason: "sale" }],
    contentDescription: undefined,
    pickupRequested: false,
    plannedShipDate: "2026-11-06",
    dutiesPayer: "recipient",
  }) as unknown as EditSnapshot;

const nextWeekday = () => {
  const d = new Date(Date.now() + 86_400_000);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

const validInput = () => ({
  shipper: { name: "Sam", company: "XYZ", line1: "4629 Rue Louis B-Mayer", city: "Laval", region: "QC", postalCode: "H7P6G5", phone: "5145550100", email: "sam@example.com" },
  recipient: { name: "Alex", line1: "2 Main St", city: "New York", postalCode: "10001", phone: "2125550100" },
  pickupRequested: true,
  plannedShipDate: nextWeekday(),
  dutiesPayer: "recipient" as const,
  reason: "Client called: wrong street number",
});

describe("which bookings staff can edit", () => {
  const doc = (over: Record<string, unknown>) => ({ status: "paid", fulfilment: { state: "failed" }, ...over }) as Parameters<typeof editBlockReason>[0];

  it("allows a paid booking whose label failed, and an unpaid one", () => {
    expect(editBlockReason(doc({}))).toBeNull();
    expect(editBlockReason(doc({ status: "awaiting_payment", fulfilment: { state: "none" } }))).toBeNull();
  });
  it("blocks once DHL has the parcel", () => {
    expect(editBlockReason(doc({ status: "label_ready", fulfilment: { state: "ok" } }))).toBe("has_label");
    expect(editBlockReason(doc({ trackingNumber: "123" }))).toBe("has_label");
    expect(editBlockReason(doc({ pickupConfirmation: "PRG1" }))).toBe("has_label");
  });
  it("blocks a cancelled booking, a label being made, and an unknown DHL outcome", () => {
    expect(editBlockReason(doc({ status: "cancelled" }))).toBe("cancelled");
    expect(editBlockReason(doc({ fulfilment: { state: "pending" } }))).toBe("in_progress");
    expect(editBlockReason(doc({ fulfilment: { state: "unknown" } }))).toBe("outcome_unknown");
  });
});

describe("the change record", () => {
  it("is empty when nothing changed", () => {
    expect(diffShipment(base(), base())).toEqual([]);
  });

  it("lists address, weight, pickup and date changes with the old and new value", () => {
    const after = base();
    after.shipper.line1 = "452 Rue de la Couronne";
    after.parcels[0].weightKg = 2.5;
    after.pickupRequested = true;
    after.plannedShipDate = "2026-11-09";
    const changes = diffShipment(base(), after);
    expect(changes).toContainEqual({ field: "Sender address line 1", from: "4629 Rue Louis B-Mayer", to: "452 Rue de la Couronne" });
    expect(changes).toContainEqual({ field: "Parcel 1 weight (kg)", from: "1", to: "2.5" });
    expect(changes).toContainEqual({ field: "Pickup", from: "Drop-off at a DHL service point", to: "DHL pickup" });
    expect(changes).toContainEqual({ field: "Shipping date", from: "2026-11-06", to: "2026-11-09" });
    expect(changes).toHaveLength(4);
  });

  it("records added and removed parcels and items", () => {
    const after = base();
    after.parcels.push({ weightKg: 3, lengthCm: 10, widthCm: 10, heightCm: 10 });
    after.items = [];
    const changes = diffShipment(base(), after);
    expect(changes.find((c) => c.field === "Parcel 2")?.to).toMatch(/^added: 3 kg/);
    expect(changes.find((c) => c.field === "Item 1")?.to).toBe("removed");
  });

  it("shows item values in dollars", () => {
    const after = base();
    after.items[0].unitValueCents = 3000;
    expect(diffShipment(base(), after)).toContainEqual({ field: "Item 1 unit value", from: "$25.00", to: "$30.00" });
  });

  it("builds an audit line that names the reference, the reason and each change", () => {
    const text = auditDetails("EX-1", "Wrong number", [{ field: "Sender city", from: "Laval", to: "Montreal" }]);
    expect(text).toBe("Edited EX-1. Reason: Wrong number. Changes: Sender city: Laval -> Montreal");
  });
});

describe("what staff may submit", () => {
  it("accepts a normal correction", () => {
    expect(adminEditSchema.safeParse(validInput()).success).toBe(true);
  });
  it("requires a reason", () => {
    expect(adminEditSchema.safeParse({ ...validInput(), reason: "" }).success).toBe(false);
    expect(adminEditSchema.safeParse({ ...validInput(), reason: "ok" }).success).toBe(false);
  });
  it("refuses a weekend or a past ship date", () => {
    const d = new Date(Date.now() + 86_400_000);
    while (d.getUTCDay() !== 6) d.setUTCDate(d.getUTCDate() + 1);
    expect(adminEditSchema.safeParse({ ...validInput(), plannedShipDate: d.toISOString().slice(0, 10) }).success).toBe(false);
    expect(adminEditSchema.safeParse({ ...validInput(), plannedShipDate: "2020-01-06" }).success).toBe(false);
  });
  it("ignores a country sent by the client: it cannot be changed", () => {
    const parsed = adminEditSchema.parse({ ...validInput(), recipient: { ...validInput().recipient, countryCode: "FR" } });
    expect("countryCode" in parsed.recipient).toBe(false);
  });
  it("does not accept weights, parcels or items: they cannot be changed", () => {
    const parsed = adminEditSchema.parse({ ...validInput(), parcels: [{ weightKg: 9, lengthCm: 1, widthCm: 1, heightCm: 1 }], items: [{ description: "x" }], contentDescription: "other" });
    expect("parcels" in parsed).toBe(false);
    expect("items" in parsed).toBe(false);
    expect("contentDescription" in parsed).toBe(false);
  });
});

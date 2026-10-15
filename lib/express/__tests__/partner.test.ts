import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/mongoose", () => ({ default: async () => undefined }));

import { effectiveMarkupPct, generateCustomerPassword, isActivePartner, partnerCustomerCreateSchema, partnerCustomerUpdateSchema, partnerSettingsSchema } from "../partner";
import { priceShipment } from "../pricing";
import { toClientQuoteDTO, toCustomerQuoteDTO } from "../quoteDto";
import { toClientShipmentDTO, toCustomerShipmentDTO } from "../shipmentDto";
import { toPartnerCustomerDTO } from "../partnerDto";
import { toClientAccountDTO } from "../accountDto";
import { checkTransition } from "../transitions";
import { accountActionSchema } from "../validation";

const partner = { type: "b2b" as const, status: "active" as const, partner: { enabled: true, defaultMarkupPct: 12 } };

describe("who is a partner", () => {
  it("only an active B2B account that staff switched on", () => {
    expect(isActivePartner(partner)).toBe(true);
    expect(isActivePartner({ ...partner, status: "suspended" })).toBe(false);
    expect(isActivePartner({ ...partner, partner: { enabled: false, defaultMarkupPct: 12 } })).toBe(false);
    expect(isActivePartner({ type: "b2c", status: "active", partner: { enabled: true, defaultMarkupPct: 5 } })).toBe(false);
    expect(isActivePartner(null)).toBe(false);
  });

  it("staff can switch partner mode only on an approved business", () => {
    expect(checkTransition({ type: "b2b", status: "active" }, "partner").ok).toBe(true);
    expect(checkTransition({ type: "b2b", status: "pending" }, "partner").ok).toBe(false);
    expect(checkTransition({ type: "b2c", status: "active" }, "partner").ok).toBe(false);
    expect(checkTransition({ type: "customer", status: "active" }, "partner").ok).toBe(false);
  });

  it("the staff action validates the markup", () => {
    const ok = accountActionSchema.safeParse({ action: "partner", partner: { enabled: true, defaultMarkupPct: 15 } });
    expect(ok.success).toBe(true);
    for (const bad of [-1, 100, 150, 10.123]) {
      expect(accountActionSchema.safeParse({ action: "partner", partner: { enabled: true, defaultMarkupPct: bad } }).success).toBe(false);
    }
    expect(partnerSettingsSchema.safeParse({ enabled: true }).success).toBe(false);
  });
});

describe("markup rules", () => {
  it("a customer's own markup wins, otherwise the partner default", () => {
    expect(effectiveMarkupPct(partner, { markupPct: 20 })).toBe(20);
    expect(effectiveMarkupPct(partner, { markupPct: 0 })).toBe(0);
    expect(effectiveMarkupPct(partner, { markupPct: null })).toBe(12);
    expect(effectiveMarkupPct(partner, null)).toBe(12);
  });

  it("creating a customer needs a name and a real email, and normalizes the email", () => {
    const ok = partnerCustomerCreateSchema.safeParse({ name: "  Ada  ", email: " ADA@Example.COM ", markupPct: 10 });
    expect(ok.success && ok.data.email).toBe("ada@example.com");
    expect(ok.success && ok.data.name).toBe("Ada");
    expect(ok.success && ok.data.createLogin).toBe(false);
    expect(partnerCustomerCreateSchema.safeParse({ name: "", email: "a@b.co" }).success).toBe(false);
    expect(partnerCustomerCreateSchema.safeParse({ name: "A", email: "nope" }).success).toBe(false);
    expect(partnerCustomerCreateSchema.safeParse({ name: "A", email: "a@b.co", markupPct: 100 }).success).toBe(false);
    expect(partnerCustomerCreateSchema.safeParse({ name: "A", email: "a@b.co", markupPct: -5 }).success).toBe(false);
  });

  it("an update cannot be empty, can clear the markup, and cannot change the email", () => {
    expect(partnerCustomerUpdateSchema.safeParse({}).success).toBe(false);
    const clear = partnerCustomerUpdateSchema.safeParse({ markupPct: null });
    expect(clear.success && clear.data.markupPct).toBe(null);
    const sneaky = partnerCustomerUpdateSchema.safeParse({ name: "B", email: "other@x.co" });
    expect(sneaky.success && "email" in sneaky.data).toBe(false);
  });

  it("generated passwords are strong and different every time", () => {
    const a = generateCustomerPassword();
    const b = generateCustomerPassword();
    expect(a).not.toBe(b);
    expect(a).toHaveLength(12);
    expect(a).toMatch(/[A-Z]/);
    expect(a).toMatch(/[a-z]/);
    expect(a).toMatch(/\d/);
    expect(a).toMatch(/[!@#$%*]/);
  });
});

describe("partner pricing", () => {
  const account = { baseFreightCents: 4000, surcharges: [{ code: "FF", name: "Fuel", amountCents: 1000 }], totalCents: 5000 };
  const publicList = { baseFreightCents: 10000, surcharges: [{ code: "FF", name: "Fuel", amountCents: 1000 }], totalCents: 11000 };

  it("the markup is a percent of what the partner pays, and Transimex profit is untouched", () => {
    const plain = priceShipment({ account, publicList, clientDiscountPct: 20, pickupFeeCents: 0 });
    const withMarkup = priceShipment({ account, publicList, clientDiscountPct: 20, pickupFeeCents: 0, markup: { kind: "percent", pct: 25 } });
    expect(plain.client.totalCents).toBe(9000); // 10000 - 2000 + 1000
    expect(withMarkup.client.totalCents).toBe(plain.client.totalCents);
    expect(withMarkup.markupCents).toBe(2250);
    expect(withMarkup.customerTotalCents).toBe(11250);
    expect(withMarkup.profitCents).toBe(plain.profitCents);
  });
});

describe("what each side may see", () => {
  const pricing = priceShipment({
    account: { baseFreightCents: 4000, surcharges: [], totalCents: 4000 },
    publicList: { baseFreightCents: 10000, surcharges: [], totalCents: 10000 },
    clientDiscountPct: 20,
    markup: { kind: "percent", pct: 25 },
  });
  const quote = { _id: "q1", serviceName: "EXPRESS", pricing, partnerCustomerId: "c1", partnerCustomerName: "Ada", partnerMarkupPct: 25, expiresAt: new Date(Date.now() + 60_000), request: { destination: { countryCode: "KE", city: "Nairobi", postalCode: "00100" }, pickupRequested: false } } as any;

  it("the partner sees their price, markup and the customer price", () => {
    const dto = toClientQuoteDTO(quote);
    expect(dto.price.totalCents).toBe(8000);
    expect(dto.partner).toEqual({ customerId: "c1", customerName: "Ada", markupPct: 25, markupCents: 2000, customerTotalCents: 10000 });
  });

  it("the customer sees one price and nothing about discount, markup or Transimex cost", () => {
    const dto = toCustomerQuoteDTO(quote);
    expect(dto.totalCents).toBe(10000);
    const json = JSON.stringify(dto);
    for (const leak of ["discount", "markup", "publicBase", "account", "profit", "8000", "4000"]) expect(json.toLowerCase()).not.toContain(leak.toLowerCase());
  });

  const shipment = {
    _id: "s1", reference: "EX-1", status: "paid", userId: "partnerUser", accountId: "a", accountType: "b2b", partnerCustomerId: "c1", partnerCustomerName: "Ada",
    totalCents: 8000, markupCents: 2000, customerTotalCents: 10000, payment: { state: "paid", paidAt: new Date(), refundedCents: 500, paymentIntentId: "pi_secret" },
    label: { key: "labels/secret.pdf" }, statusHistory: [{ status: "paid", at: new Date(), by: "u" }], quoteId: "q1", termsAccepted: { version: "v3" },
  } as any;

  it("the customer's shipment view hides the partner's cost, payment, label and history", () => {
    const dto = toCustomerShipmentDTO(shipment);
    expect(dto.totalCents).toBe(10000);
    expect(dto.partner).toBeNull();
    expect(dto.canPay).toBe(false);
    expect(dto.labelReady).toBe(false);
    expect(dto.refundedCents).toBe(0);
    expect(dto.paidAt).toBeNull();
    expect(dto.quoteId).toBe("");
    expect(dto.statusHistory).toEqual([]);
    const json = JSON.stringify(dto);
    for (const leak of ["8000", "2000", "pi_secret", "labels/secret", "partnerUser", "v3"]) expect(json).not.toContain(leak);
  });

  it("the partner's own view shows what they pay, earn and charge", () => {
    expect(toClientShipmentDTO(shipment).partner).toEqual({ customerId: "c1", customerName: "Ada", markupCents: 2000, customerTotalCents: 10000 });
  });

  it("a customer record never exposes login ids or password data", () => {
    const dto = toPartnerCustomerDTO({ _id: "c1", name: "Ada", email: "a@b.co", markupPct: null, loginUserId: "u9", loginAccountId: "a9" } as any, partner);
    expect(dto.hasLogin).toBe(true);
    expect(dto.effectiveMarkupPct).toBe(12);
    const json = JSON.stringify(dto);
    expect(json).not.toContain("u9");
    expect(json).not.toContain("a9");
  });

  it("only a switched-on partner gets partner settings in the account view", () => {
    expect(toClientAccountDTO({ _id: "a", ...partner } as any).partner).toEqual({ enabled: true, defaultMarkupPct: 12 });
    expect(toClientAccountDTO({ _id: "a", type: "b2b", status: "active", partner: { enabled: false, defaultMarkupPct: 12 } } as any).partner).toBeNull();
    expect(toClientAccountDTO({ _id: "a", type: "customer", status: "active" } as any).partner).toBeNull();
  });
});

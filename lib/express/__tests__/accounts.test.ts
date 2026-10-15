import { describe, expect, it } from "vitest";
import { accountActionSchema, applySchema, b2bTermsSchema, discountPctSchema, settingsSchema } from "../validation";
import { canUseExpress, checkTransition } from "../transitions";
import { toAdminAccountDTO, toClientAccountDTO } from "../accountDto";

const b2c = { type: "b2c", contactName: "Amina", phone: "+1 514 555 0100", country: "ca", acceptTerms: true, termsVersion: "v1" };
const company = {
  name: "Acme Imports",
  address: "1 Main St, Montreal",
  contactPerson: "Jean",
  businessType: "Retail",
  expectedMonthlyVolume: "50 parcels",
};
const shippingProfile = {
  categories: ["clothing"],
  goodsDescription: "Women's clothing",
  shipsFor: "own",
  destinations: "Cameroon",
  typicalWeight: "light",
  typicalValue: "under_100",
  restrictedGoods: ["none"],
  paymentPreference: "pay_at_booking",
};
const b2b = { ...b2c, type: "b2b", company, shippingProfile };

describe("apply validation", () => {
  it("accepts a B2C application and normalises the country", () => {
    const result = applySchema.parse(b2c);
    expect(result.country).toBe("CA");
    expect(result.language).toBe("en");
  });

  it("requires company details for B2B", () => {
    expect(applySchema.safeParse({ ...b2c, type: "b2b" }).success).toBe(false);
    expect(applySchema.safeParse(b2b).success).toBe(true);
  });

  it("requires the terms to be accepted", () => {
    expect(applySchema.safeParse({ ...b2c, acceptTerms: false }).success).toBe(false);
    expect(applySchema.safeParse({ ...b2c, acceptTerms: undefined }).success).toBe(false);
  });

  it("rejects an unknown country and a bad phone", () => {
    expect(applySchema.safeParse({ ...b2c, country: "ZZ" }).success).toBe(false);
    expect(applySchema.safeParse({ ...b2c, phone: "abc" }).success).toBe(false);
  });

  it("strips status, discount and billing fields a client tries to send", () => {
    const result = applySchema.parse({
      ...b2b,
      status: "active",
      discountPct: 100,
      billingModes: ["invoice"],
      creditLimitCents: 99999999,
    }) as Record<string, unknown>;
    expect(result.status).toBeUndefined();
    expect(result.discountPct).toBeUndefined();
    expect(result.billingModes).toBeUndefined();
    expect(result.creditLimitCents).toBeUndefined();
  });
});

describe("discount range", () => {
  it("accepts 0 and 100 and two decimals", () => {
    expect(discountPctSchema.safeParse(0).success).toBe(true);
    expect(discountPctSchema.safeParse(100).success).toBe(true);
    expect(discountPctSchema.safeParse(12.5).success).toBe(true);
  });

  it("rejects typos that could create free or negative shipments", () => {
    expect(discountPctSchema.safeParse(-1).success).toBe(false);
    expect(discountPctSchema.safeParse(100.01).success).toBe(false);
    expect(discountPctSchema.safeParse(1000).success).toBe(false);
    expect(discountPctSchema.safeParse(12.345).success).toBe(false);
    expect(discountPctSchema.safeParse("15").success).toBe(false);
    expect(discountPctSchema.safeParse(Number.NaN).success).toBe(false);
  });

  it("applies the same range to the global B2C setting", () => {
    expect(settingsSchema.safeParse({ b2cDiscountPct: 5 }).success).toBe(true);
    expect(settingsSchema.safeParse({ b2cDiscountPct: 500 }).success).toBe(false);
  });
});

describe("B2B terms", () => {
  it("pay-at-booking needs no credit limit and clears any sent", () => {
    const result = b2bTermsSchema.parse({
      discountPct: 15,
      billingModes: ["pay_at_booking"],
      creditLimitCents: 500000,
      paymentTermsDays: 14,
    });
    expect(result.creditLimitCents).toBeNull();
    expect(result.paymentTermsDays).toBeNull();
  });

  it("invoice billing requires a credit limit and payment terms", () => {
    expect(b2bTermsSchema.safeParse({ discountPct: 15, billingModes: ["invoice"] }).success).toBe(false);
    expect(b2bTermsSchema.safeParse({ discountPct: 15, billingModes: ["invoice"], creditLimitCents: 500000 }).success).toBe(false);
    const ok = b2bTermsSchema.parse({ discountPct: 15, billingModes: ["invoice"], creditLimitCents: 500000, paymentTermsDays: 7 });
    expect(ok.creditLimitCents).toBe(500000);
  });

  it("allows both modes and removes duplicates", () => {
    const result = b2bTermsSchema.parse({
      discountPct: 10,
      billingModes: ["pay_at_booking", "invoice", "invoice"],
      creditLimitCents: 100000,
      paymentTermsDays: 30,
    });
    expect(result.billingModes).toEqual(["pay_at_booking", "invoice"]);
  });

  it("requires at least one billing mode and whole-cent credit limits", () => {
    expect(b2bTermsSchema.safeParse({ discountPct: 10, billingModes: [] }).success).toBe(false);
    expect(
      b2bTermsSchema.safeParse({ discountPct: 10, billingModes: ["invoice"], creditLimitCents: 100.5, paymentTermsDays: 7 }).success
    ).toBe(false);
  });
});

describe("account actions", () => {
  it("requires a reason to reject or suspend", () => {
    expect(accountActionSchema.safeParse({ action: "reject", reason: "" }).success).toBe(false);
    expect(accountActionSchema.safeParse({ action: "suspend", reason: "  " }).success).toBe(false);
    expect(accountActionSchema.safeParse({ action: "reject", reason: "Incomplete business details" }).success).toBe(true);
  });

  it("rejects unknown actions", () => {
    expect(accountActionSchema.safeParse({ action: "delete" }).success).toBe(false);
  });
});

describe("status transitions", () => {
  it("approves and rejects only B2B applications that are pending", () => {
    expect(checkTransition({ type: "b2b", status: "pending" }, "approve")).toEqual({ ok: true, to: "active" });
    expect(checkTransition({ type: "b2b", status: "pending" }, "reject")).toEqual({ ok: true, to: "rejected" });
    expect(checkTransition({ type: "b2c", status: "pending" }, "approve").ok).toBe(false);
    expect(checkTransition({ type: "b2b", status: "active" }, "reject").ok).toBe(false);
  });

  it("lets staff approve a previously rejected B2B application", () => {
    expect(checkTransition({ type: "b2b", status: "rejected" }, "approve")).toEqual({ ok: true, to: "active" });
  });

  it("suspends active accounts and reactivates suspended ones, B2C included", () => {
    expect(checkTransition({ type: "b2c", status: "active" }, "suspend")).toEqual({ ok: true, to: "suspended" });
    expect(checkTransition({ type: "b2c", status: "suspended" }, "reactivate")).toEqual({ ok: true, to: "active" });
    expect(checkTransition({ type: "b2b", status: "pending" }, "suspend").ok).toBe(false);
    expect(checkTransition({ type: "b2b", status: "active" }, "reactivate").ok).toBe(false);
  });

  it("edits terms only on active or suspended B2B accounts, keeping the status", () => {
    expect(checkTransition({ type: "b2b", status: "active" }, "update")).toEqual({ ok: true, to: "active" });
    expect(checkTransition({ type: "b2b", status: "suspended" }, "update")).toEqual({ ok: true, to: "suspended" });
    expect(checkTransition({ type: "b2b", status: "pending" }, "update").ok).toBe(false);
    expect(checkTransition({ type: "b2c", status: "active" }, "update").ok).toBe(false);
  });

  it("lets only active accounts use Express; pending B2B waits", () => {
    expect(canUseExpress({ status: "active" })).toBe(true);
    for (const status of ["pending", "rejected", "suspended"] as const) {
      expect(canUseExpress({ status })).toBe(false);
    }
    expect(canUseExpress(null)).toBe(false);
  });
});

describe("account DTOs", () => {
  const base = {
    _id: "abc",
    userId: "user1",
    type: "b2b" as const,
    contactName: "Jean",
    phone: "123",
    country: "CA",
    discountPct: 15,
    billingModes: ["invoice" as const],
    creditLimitCents: 500000,
    paymentTermsDays: 7,
    rejectionReason: "old reason",
    suspensionReason: "old suspension",
    reviewedBy: "staff9",
    language: "fr" as const,
    terms: { version: "v1", acceptedAt: new Date("2026-10-01") },
  };

  it("hides commercial terms from a client whose application is still pending", () => {
    const dto = toClientAccountDTO({ ...base, status: "pending" });
    expect(dto.discountPct).toBeNull();
    expect(dto.billingModes).toEqual([]);
    expect(dto.creditLimitCents).toBeNull();
  });

  it("shows the rejection reason only while rejected and never staff identifiers", () => {
    expect(toClientAccountDTO({ ...base, status: "rejected" }).rejectionReason).toBe("old reason");
    expect(toClientAccountDTO({ ...base, status: "active" }).rejectionReason).toBe("");
    expect(JSON.stringify(toClientAccountDTO({ ...base, status: "active" }))).not.toContain("staff9");
  });

  it("gives staff the full record", () => {
    const dto = toAdminAccountDTO({ ...base, status: "pending" }, { name: "Jean", email: "j@x.com" });
    expect(dto.discountPct).toBe(15);
    expect(dto.reviewedBy).toBe("staff9");
    expect(dto.user.email).toBe("j@x.com");
    expect(dto.language).toBe("fr");
  });
});

import { describe, expect, it } from "vitest";
import { applySchema, shippingProfileSchema } from "../validation";
import {
  CATEGORY_VALUES,
  CLIENT_COUNT_VALUES,
  OPTIONS,
  PAYMENT_VALUES,
  QUESTIONS,
  RESTRICTED_VALUES,
  SHIPS_FOR_VALUES,
  VALUE_VALUES,
  WEIGHT_VALUES,
  optionLabel,
} from "../shippingProfile";

const profile = {
  categories: ["clothing", "electronics"],
  goodsDescription: "Women's clothing and phone accessories",
  shipsFor: "own",
  destinations: "Cameroon, Ivory Coast",
  typicalWeight: "medium",
  typicalValue: "100_500",
  restrictedGoods: ["none"],
  paymentPreference: "pay_at_booking",
};

const company = { name: "Acme", address: "1 Main St", contactPerson: "Jean", businessType: "Retail", expectedMonthlyVolume: "50" };
const b2b = { type: "b2b", contactName: "Jean", phone: "+1 514 555 0100", country: "CA", acceptTerms: true, termsVersion: "v1", company };

describe("business shipping profile", () => {
  it("accepts a complete answer set", () => {
    const r = shippingProfileSchema.parse(profile);
    expect(r.shipsFor).toBe("own");
    expect(r.categories).toEqual(["clothing", "electronics"]);
  });

  it("requires the questions staff need to decide", () => {
    for (const key of ["categories", "goodsDescription", "shipsFor", "destinations", "typicalWeight", "typicalValue", "restrictedGoods", "paymentPreference"]) {
      const { [key]: _omit, ...rest } = profile as Record<string, unknown>;
      expect(shippingProfileSchema.safeParse(rest).success, `missing ${key}`).toBe(false);
    }
  });

  it("rejects empty choices and too-short descriptions", () => {
    expect(shippingProfileSchema.safeParse({ ...profile, categories: [] }).success).toBe(false);
    expect(shippingProfileSchema.safeParse({ ...profile, restrictedGoods: [] }).success).toBe(false);
    expect(shippingProfileSchema.safeParse({ ...profile, goodsDescription: "abc" }).success).toBe(false);
    expect(shippingProfileSchema.safeParse({ ...profile, destinations: "x" }).success).toBe(false);
  });

  it("rejects answers that are not on the list", () => {
    expect(shippingProfileSchema.safeParse({ ...profile, shipsFor: "everyone" }).success).toBe(false);
    expect(shippingProfileSchema.safeParse({ ...profile, categories: ["weapons"] }).success).toBe(false);
    expect(shippingProfileSchema.safeParse({ ...profile, typicalWeight: "huge" }).success).toBe(false);
    expect(shippingProfileSchema.safeParse({ ...profile, paymentPreference: "cash" }).success).toBe(false);
  });

  it("asks how many clients only for people who ship for clients", () => {
    expect(shippingProfileSchema.safeParse({ ...profile, shipsFor: "clients" }).success).toBe(false);
    expect(shippingProfileSchema.safeParse({ ...profile, shipsFor: "both" }).success).toBe(false);
    const ok = shippingProfileSchema.parse({ ...profile, shipsFor: "clients", clientCount: "6_20", clientsDescription: "Small shops" });
    expect(ok.clientCount).toBe("6_20");
    expect(ok.clientsDescription).toBe("Small shops");
  });

  it("drops the client answers for someone who ships only their own goods", () => {
    const r = shippingProfileSchema.parse({ ...profile, shipsFor: "own", clientCount: "50_plus", clientsDescription: "ignored" });
    expect(r.clientCount).toBeUndefined();
    expect(r.clientsDescription).toBeUndefined();
  });

  it("'None of these' cannot be combined with a real restricted-goods choice", () => {
    expect(shippingProfileSchema.safeParse({ ...profile, restrictedGoods: ["none", "batteries"] }).success).toBe(false);
    expect(shippingProfileSchema.parse({ ...profile, restrictedGoods: ["batteries", "liquids"] }).restrictedGoods).toEqual(["batteries", "liquids"]);
  });

  it("removes duplicate choices and turns blank optional answers into nothing", () => {
    const r = shippingProfileSchema.parse({ ...profile, categories: ["clothing", "clothing"], currentCarriers: "   ", businessNumber: "", website: "" });
    expect(r.categories).toEqual(["clothing"]);
    expect(r.currentCarriers).toBeUndefined();
    expect(r.businessNumber).toBeUndefined();
    expect(r.website).toBeUndefined();
  });

  it("checks the website only when one is given", () => {
    expect(shippingProfileSchema.safeParse({ ...profile, website: "example.com" }).success).toBe(true);
    expect(shippingProfileSchema.safeParse({ ...profile, website: "https://www.example.ca/shop" }).success).toBe(true);
    expect(shippingProfileSchema.safeParse({ ...profile, website: "not a site" }).success).toBe(false);
    expect(shippingProfileSchema.safeParse({ ...profile, website: "javascript:alert(1)" }).success).toBe(false);
  });
});

describe("applying as a business", () => {
  it("now needs the shipping profile", () => {
    expect(applySchema.safeParse(b2b).success).toBe(false);
    expect(applySchema.safeParse({ ...b2b, shippingProfile: profile }).success).toBe(true);
  });

  it("an individual does not send one, and any sent is ignored", () => {
    const r = applySchema.parse({ type: "b2c", contactName: "A", phone: "+1 514 555 0100", country: "CA", acceptTerms: true, termsVersion: "v1", shippingProfile: profile }) as Record<string, unknown>;
    expect(r.shippingProfile).toBeUndefined();
  });
});

describe("labels", () => {
  const groups = {
    categories: CATEGORY_VALUES,
    shipsFor: SHIPS_FOR_VALUES,
    clientCount: CLIENT_COUNT_VALUES,
    typicalWeight: WEIGHT_VALUES,
    typicalValue: VALUE_VALUES,
    restrictedGoods: RESTRICTED_VALUES,
    paymentPreference: PAYMENT_VALUES,
  } as const;

  it("every answer has an English and a French label, so nothing shows blank in either language", () => {
    for (const [group, values] of Object.entries(groups)) {
      for (const v of values) {
        for (const lang of ["en", "fr"] as const) {
          expect(optionLabel(group as keyof typeof OPTIONS, v, lang).trim().length, `${group}.${v}.${lang}`).toBeGreaterThan(0);
          expect(optionLabel(group as keyof typeof OPTIONS, v, lang), `${group}.${v}.${lang} is still the raw key`).not.toBe(v);
        }
      }
    }
  });

  it("every question has both languages", () => {
    for (const [key, text] of Object.entries(QUESTIONS)) {
      expect(text.en.length, key).toBeGreaterThan(0);
      expect(text.fr.length, key).toBeGreaterThan(0);
      expect(text.fr, `${key} is not translated`).not.toBe(text.en);
    }
  });

  it("an unknown value is shown as it is rather than crashing", () => {
    expect(optionLabel("categories", "mystery", "en")).toBe("mystery");
  });
});

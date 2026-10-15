import { z } from "zod";
import { COUNTRIES } from "@/lib/data/countries";
import {
  CATEGORY_VALUES,
  CLIENT_COUNT_VALUES,
  PAYMENT_VALUES,
  RESTRICTED_VALUES,
  SHIPS_FOR_VALUES,
  VALUE_VALUES,
  WEIGHT_VALUES,
} from "./shippingProfile";
import { partnerSettingsSchema } from "./partner";

const COUNTRY_CODES = new Set(COUNTRIES.map((c) => c.code));

const text = (label: string, max: number) =>
  z.string({ required_error: `${label} is required` }).trim().min(1, `${label} is required`).max(max);

const country = z
  .string()
  .trim()
  .transform((v) => v.toUpperCase())
  .refine((v) => COUNTRY_CODES.has(v), "Choose a valid country");

const phone = z
  .string()
  .trim()
  .regex(/^[+()\d\s.-]{7,25}$/, "Enter a valid phone number");

const language = z.enum(["en", "fr"]).default("en");

const acceptTerms = z.literal(true, { errorMap: () => ({ message: "You must accept the terms" }) });

/** The terms version the client was shown; the server rejects it if it is no longer current. */
const termsVersion = z.string().trim().min(1, "Terms version is required").max(40);

const unique = <T,>(list: T[]) => Array.from(new Set(list));
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || undefined);

/**
 * A business applicant's answers about what they ship and for whom. Staff read these to decide
 * whether to approve the account and on what terms, so the important ones are required.
 */
export const shippingProfileSchema = z
  .object({
    categories: z.array(z.enum(CATEGORY_VALUES)).min(1, "Choose at least one type of goods").transform(unique),
    goodsDescription: z.string({ required_error: "Describe what you ship" }).trim().min(5, "Describe what you ship").max(500),
    shipsFor: z.enum(SHIPS_FOR_VALUES, { errorMap: () => ({ message: "Tell us who you ship for" }) }),
    clientCount: z.enum(CLIENT_COUNT_VALUES).optional(),
    clientsDescription: optionalText(300),
    destinations: z.string({ required_error: "Tell us where you ship to" }).trim().min(2, "Tell us where you ship to").max(200),
    typicalWeight: z.enum(WEIGHT_VALUES, { errorMap: () => ({ message: "Choose a typical parcel weight" }) }),
    typicalValue: z.enum(VALUE_VALUES, { errorMap: () => ({ message: "Choose a typical shipment value" }) }),
    restrictedGoods: z.array(z.enum(RESTRICTED_VALUES)).min(1, "Tell us about restricted goods, or choose \"None of these\"").transform(unique),
    currentCarriers: optionalText(200),
    paymentPreference: z.enum(PAYMENT_VALUES, { errorMap: () => ({ message: "Choose how you would like to pay" }) }),
    businessNumber: optionalText(60),
    website: optionalText(200).refine((v) => v === undefined || /^(https?:\/\/)?[^\s/]+\.[^\s]{2,}$/i.test(v), "Enter a valid website"),
  })
  .superRefine((v, ctx) => {
    if (v.shipsFor !== "own" && !v.clientCount) {
      ctx.addIssue({ code: "custom", path: ["clientCount"], message: "Tell us roughly how many clients you ship for" });
    }
    if (v.restrictedGoods.includes("none") && v.restrictedGoods.length > 1) {
      ctx.addIssue({ code: "custom", path: ["restrictedGoods"], message: "\"None of these\" cannot be combined with other choices" });
    }
  })
  .transform((v) => ({
    ...v,
    // Questions that only apply to people who ship for clients are dropped for everyone else.
    clientCount: v.shipsFor === "own" ? undefined : v.clientCount,
    clientsDescription: v.shipsFor === "own" ? undefined : v.clientsDescription,
  }));

export type ShippingProfileInput = z.infer<typeof shippingProfileSchema>;

/**
 * What a client may send when applying. Unknown keys are stripped, so a
 * `status`, `discountPct` or `billingModes` in the request body is silently
 * ignored: the server decides those.
 */
export const applySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("b2c"),
    contactName: text("Name", 120),
    phone,
    country,
    language,
    acceptTerms,
    termsVersion,
  }),
  z.object({
    type: z.literal("b2b"),
    contactName: text("Contact person", 120),
    phone,
    country,
    language,
    acceptTerms,
    termsVersion,
    company: z.object({
      name: text("Company name", 160),
      address: text("Address", 300),
      contactPerson: text("Contact person", 120),
      businessType: text("Business type", 120),
      expectedMonthlyVolume: text("Expected monthly volume", 60),
    }),
    shippingProfile: shippingProfileSchema,
  }),
]);

export type ApplyInput = z.infer<typeof applySchema>;

/** Percent, 0 to 100, at most two decimals. */
export const discountPctSchema = z
  .number({ required_error: "Discount is required", invalid_type_error: "Discount must be a number" })
  .min(0, "Discount cannot be negative")
  .max(100, "Discount cannot exceed 100")
  .refine((v) => Math.round(v * 100) / 100 === v, "At most two decimals");

const billingModes = z
  .array(z.enum(["pay_at_booking", "invoice"]))
  .min(1, "Choose at least one billing mode")
  .transform((modes) => Array.from(new Set(modes)));

/**
 * Commercial terms staff set when approving a B2B account, and may edit later.
 * Credit limit and payment terms exist only when invoicing is enabled.
 */
export const b2bTermsSchema = z
  .object({
    discountPct: discountPctSchema,
    billingModes,
    creditLimitCents: z.number().int("Whole cents only").min(1).max(100_000_000_00).nullish(),
    paymentTermsDays: z.number().int().min(1).max(365).nullish(),
  })
  .superRefine((value, ctx) => {
    if (!value.billingModes.includes("invoice")) return;
    if (!value.creditLimitCents) {
      ctx.addIssue({ code: "custom", path: ["creditLimitCents"], message: "Credit limit is required for invoice billing" });
    }
    if (!value.paymentTermsDays) {
      ctx.addIssue({ code: "custom", path: ["paymentTermsDays"], message: "Payment terms are required for invoice billing" });
    }
  })
  .transform((value) => {
    const invoicing = value.billingModes.includes("invoice");
    return {
      discountPct: value.discountPct,
      billingModes: value.billingModes,
      creditLimitCents: invoicing ? (value.creditLimitCents ?? null) : null,
      paymentTermsDays: invoicing ? (value.paymentTermsDays ?? null) : null,
    };
  });

export type B2bTermsInput = z.infer<typeof b2bTermsSchema>;

export const reasonSchema = z.object({
  reason: z.string().trim().min(3, "Please give a reason").max(1000),
});

/** DHL's discount to us. Strictly below 100: the public price is rebuilt by dividing by (1 - discount). */
export const contractDiscountSchema = discountPctSchema.refine((v) => v < 100, "Must be below 100");

/** Omitted fields are left unchanged. dhlContractDiscountPct: null clears it. */
export const settingsSchema = z.object({
  b2cDiscountPct: discountPctSchema,
  dhlContractDiscountPct: contractDiscountSchema.nullable().optional(),
  pickupFeeCents: z.number().int("Whole cents only").min(0).max(100000, "At most $1,000").optional(),
});

/** Staff actions on an account, discriminated by `action`. */
export const accountActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve"), terms: b2bTermsSchema }),
  z.object({ action: z.literal("reject"), reason: reasonSchema.shape.reason }),
  z.object({ action: z.literal("suspend"), reason: reasonSchema.shape.reason }),
  z.object({ action: z.literal("reactivate") }),
  z.object({ action: z.literal("update"), terms: b2bTermsSchema }),
  z.object({ action: z.literal("partner"), partner: partnerSettingsSchema }),
]);

export type AccountAction = z.infer<typeof accountActionSchema>;

const termsText = (label: string, max: number) => z.string().trim().min(1, `${label} is required`).max(max);

const termsLanguage = z.object({
  heading: termsText("Heading", 200),
  intro: termsText("Introduction", 2000),
  sections: z
    .array(z.object({ title: termsText("Section title", 200), body: termsText("Section text", 4000) }))
    .min(1, "Add at least one section")
    .max(30, "At most 30 sections"),
});

/** A full set of terms. Both languages are required so neither is ever blank. */
export const termsContentSchema = z.object({ en: termsLanguage, fr: termsLanguage });

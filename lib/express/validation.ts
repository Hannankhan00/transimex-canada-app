import { z } from "zod";
import { COUNTRIES } from "@/lib/data/countries";

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
  }),
  z.object({
    type: z.literal("b2b"),
    contactName: text("Contact person", 120),
    phone,
    country,
    language,
    acceptTerms,
    company: z.object({
      name: text("Company name", 160),
      address: text("Address", 300),
      contactPerson: text("Contact person", 120),
      businessType: text("Business type", 120),
      expectedMonthlyVolume: text("Expected monthly volume", 60),
    }),
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

export const settingsSchema = z.object({
  b2cDiscountPct: discountPctSchema,
});

/** Staff actions on an account, discriminated by `action`. */
export const accountActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve"), terms: b2bTermsSchema }),
  z.object({ action: z.literal("reject"), reason: reasonSchema.shape.reason }),
  z.object({ action: z.literal("suspend"), reason: reasonSchema.shape.reason }),
  z.object({ action: z.literal("reactivate") }),
  z.object({ action: z.literal("update"), terms: b2bTermsSchema }),
]);

export type AccountAction = z.infer<typeof accountActionSchema>;

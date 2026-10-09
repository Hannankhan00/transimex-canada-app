import { z } from "zod";
import { LIMITS, findCountry } from "@/lib/promotionTypes";

/** Relative path ("/quote") or absolute http(s) URL. Rejects javascript:, data:, protocol-relative, etc. */
export function isSafeLink(value: string): boolean {
  if (value.startsWith("/")) return !value.startsWith("//") && !value.includes("\\");
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

const link = z
  .string()
  .trim()
  .min(1, "Required")
  .max(2048)
  .refine(isSafeLink, "Must be a relative path (/quote) or an http(s) URL");

const countryCode = z
  .string()
  .trim()
  .transform((v) => v.toUpperCase())
  .refine((v) => v === "" || !!findCountry(v), "Unknown country code");

const text = z.object({
  title: z.string().trim().min(1, "Required").max(LIMITS.title),
  description: z.string().trim().max(LIMITS.description).default(""),
  badge: z.string().trim().max(LIMITS.badge).default(""),
  ctaLabel: z.string().trim().min(1, "Required").max(LIMITS.ctaLabel),
  footer: z.string().trim().max(LIMITS.footer).default(""),
  imageAlt: z.string().trim().max(LIMITS.imageAlt).default(""),
});

const image = z
  .object({
    url: link,
    width: z.number().int().positive().max(20000),
    height: z.number().int().positive().max(20000),
    bytes: z.number().int().nonnegative().optional(),
    originalBytes: z.number().int().nonnegative().optional(),
    mediaId: z.string().max(64).optional(),
  })
  .nullable()
  .default(null);

const isoDate = z.string().datetime({ offset: true }).nullable().default(null);

export const promotionInputSchema = z
  .object({
    name: z.string().trim().min(1, "Required").max(120),
    isActive: z.boolean().default(false),
    priority: z.number().int().min(0).max(999).default(1),
    delaySeconds: z.number().int().min(0).max(LIMITS.maxDelaySeconds).default(5),
    startsAt: isoDate,
    endsAt: isoDate,
    departureDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
      .refine((v) => !Number.isNaN(new Date(`${v}T00:00:00Z`).getTime()), "Invalid date")
      .nullable()
      .default(null),
    destination: z.object({
      city: z.string().trim().max(80).default(""),
      countryCode: countryCode.default(""),
    }),
    ports: z
      .array(z.object({ label: z.string().trim().min(1, "Required").max(80), countryCode: countryCode.default("") }))
      .max(LIMITS.maxPorts)
      .default([]),
    showFlags: z.boolean().default(true),
    cta: z.object({ url: link }),
    image: z.object({ en: image, fr: image }).default({ en: null, fr: null }),
    content: z.object({ en: text, fr: text }),
  })
  .refine((v) => !v.startsAt || !v.endsAt || new Date(v.endsAt) > new Date(v.startsAt), {
    message: "End must be after start",
    path: ["endsAt"],
  });

export type PromotionInput = z.infer<typeof promotionInputSchema>;

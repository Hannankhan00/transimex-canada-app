import { z } from "zod";
import { isAfricanCountry } from "./africa";

const place = (label: string) => z.string({ required_error: `${label} is required` }).trim().min(1, `${label} is required`).max(80);

const parcel = z.object({
  weightKg: z.number({ invalid_type_error: "Weight must be a number" }).min(0.1, "Minimum 0.1 kg").max(70, "Maximum 70 kg per parcel"),
  lengthCm: z.number().min(1).max(120, "Maximum 120 cm"),
  widthCm: z.number().min(1).max(120, "Maximum 120 cm"),
  heightCm: z.number().min(1).max(120, "Maximum 120 cm"),
});

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

/** What anyone requesting a quote supplies. Canada to Africa only. */
export const quoteRequestSchema = z.object({
  origin: z.object({
    postalCode: place("Origin postal code"),
    city: place("Origin city"),
  }),
  destination: z.object({
    countryCode: z
      .string()
      .trim()
      .transform((v) => v.toUpperCase())
      .refine(isAfricanCountry, "Express ships from Canada to African countries only"),
    postalCode: place("Destination postal code"),
    city: place("Destination city"),
  }),
  parcels: z.array(parcel).min(1, "Add at least one parcel").max(10, "At most 10 parcels per quote"),
  declaredValueCents: z.number().int("Whole cents only").min(0).max(100_000_000),
  /** Partners only: price this for one of their customers. The server checks the customer is theirs. */
  partnerCustomerId: z.string().trim().regex(/^[a-f\d]{24}$/i, "Invalid customer").optional(),
  /** Paper documents (no customs paperwork, DHL document product) or goods. Documents ignore the declared value. */
  contentType: z.enum(["documents", "goods"]).default("goods"),
  isCustomsDeclarable: z.boolean().default(true),
  pickupRequested: z.boolean().default(false),
  plannedShipDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .refine((d) => d >= today() && d <= addDays(30), "Ship date must be within the next 30 days")
    .optional(),
});

export type QuoteRequestInput = z.infer<typeof quoteRequestSchema>;

/** Staff simulator: the same request, optionally for a chosen account and with what-if overrides. */
export const simulateSchema = z.object({
  request: quoteRequestSchema,
  accountId: z.string().trim().optional(),
  /** When there is no account: price as B2C ("b2c") using the global discount. */
  discountPctOverride: z.number().min(0).max(100).optional(),
  markup: z
    .discriminatedUnion("kind", [
      z.object({ kind: z.literal("flat"), cents: z.number().int().min(0).max(100_000_000) }),
      z.object({ kind: z.literal("percent"), pct: z.number().min(0).max(99.99) }),
    ])
    .nullish(),
});

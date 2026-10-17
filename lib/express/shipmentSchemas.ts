import { z } from "zod";
import { COUNTRIES } from "@/lib/data/countries";

const COUNTRY_CODES = new Set(COUNTRIES.map((c) => c.code));

const req = (label: string, max: number) =>
  z.string({ required_error: `${label} is required` }).trim().min(1, `${label} is required`).max(max);
const opt = (max: number) => z.string().trim().max(max).optional().transform((v) => v || undefined);

const country = z
  .string()
  .trim()
  .transform((v) => v.toUpperCase())
  .refine((v) => COUNTRY_CODES.has(v), "Choose a valid country");

const phone = z
  .string({ required_error: "Phone is required" })
  .trim()
  .regex(/^[+()\d\s.-]{7,25}$/, "Enter a valid phone number");

const email = z.string().trim().toLowerCase().email("Enter a valid email").max(160);

const address = z.object({
  name: req("Name", 120),
  company: opt(120),
  line1: req("Address line 1", 120),
  line2: opt(120),
  city: req("City", 80),
  region: opt(80),
  postalCode: req("Postal code", 20),
  phone,
});

/** Customs line item. Every field is required: the booking will not submit without them. */
export const customsItemSchema = z.object({
  description: req("Item description", 100),
  hsCode: z
    .string({ required_error: "Tariff (HS) code is required" })
    .transform((v) => v.replace(/[\s.\-]/g, ""))
    .refine((v) => /^\d{6,10}$/.test(v), "HS code must be 6 to 10 digits"),
  quantity: z.number({ required_error: "Quantity is required", invalid_type_error: "Quantity must be a number" }).int("Whole units only").min(1).max(9999),
  unitValueCents: z.number({ required_error: "Item value is required", invalid_type_error: "Value must be a number" }).int("Whole cents only").min(1, "Value must be greater than 0").max(100_000_000),
  countryOfOrigin: country,
  netWeightKg: z.number({ required_error: "Item weight is required", invalid_type_error: "Weight must be a number" }).min(0.01, "Minimum 0.01 kg").max(70),
  exportReason: z.enum(["sale", "gift", "sample", "return", "repair", "personal_effects"], { required_error: "Reason for export is required" }),
});

/** Confirm a booking from a saved quote. */
export const bookingSchema = z.object({
  quoteId: z.string().trim().min(1, "Quote is required"),
  idempotencyKey: z.string().trim().min(16, "Idempotency key is too short").max(64).regex(/^[A-Za-z0-9_-]+$/, "Invalid idempotency key"),
  shipper: address.extend({ email }),
  recipient: address.extend({ countryCode: country, email: email.optional() }),
  /** Goods need at least one item and documents none: the saved quote says which, so that is checked against it. */
  items: z.array(customsItemSchema).max(20, "At most 20 items").default([]),
  /** Documents only: the client confirms the shipment holds paper documents with no commercial value. */
  documentsDeclaration: z.literal(true).optional(),
  contentDescription: opt(200),
  dutiesPayer: z.enum(["recipient", "sender"]).default("recipient"),
  /** Business accounts with both modes choose; omitted = card when allowed, otherwise invoice. */
  paymentMethod: z.enum(["card", "invoice"]).optional(),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "You must accept the terms" }) }),
  termsVersion: z.string().trim().min(1).max(40),
});

export type BookingInput = z.infer<typeof bookingSchema>;

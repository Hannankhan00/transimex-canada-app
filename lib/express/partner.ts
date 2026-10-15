import { randomInt } from "node:crypto";
import { z } from "zod";
import type { IExpressAccount } from "@/models/ExpressAccount";
import type { IExpressPartnerCustomer } from "@/models/ExpressPartnerCustomer";

/** Markup is strictly below 100%: the pricing function refuses anything else. */
export const MARKUP_MAX_PCT = 99.99;

const markupPct = z
  .number({ invalid_type_error: "Markup must be a number" })
  .min(0, "Markup cannot be negative")
  .max(MARKUP_MAX_PCT, "Markup must be below 100")
  .refine((v) => Math.round(v * 100) / 100 === v, "At most two decimals");

/** Staff switch a B2B account into a partner (or back) and set its default markup. */
export const partnerSettingsSchema = z.object({
  enabled: z.boolean(),
  defaultMarkupPct: markupPct,
});
export type PartnerSettingsInput = z.infer<typeof partnerSettingsSchema>;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || undefined);

const customerFields = {
  name: z.string({ required_error: "Name is required" }).trim().min(1, "Name is required").max(120),
  email: z.string({ required_error: "Email is required" }).trim().toLowerCase().email("Enter a valid email").max(160),
  phone: optionalText(40),
  company: optionalText(160),
  notes: optionalText(500),
  /** null or omitted = use the partner's default markup. */
  markupPct: markupPct.nullish().transform((v) => v ?? null),
};

export const partnerCustomerCreateSchema = z.object({ ...customerFields, createLogin: z.boolean().default(false) });
export type PartnerCustomerCreateInput = z.infer<typeof partnerCustomerCreateSchema>;

export const partnerCustomerUpdateSchema = z
  .object({
    name: customerFields.name.optional(),
    phone: z.string().trim().max(40).optional(),
    company: z.string().trim().max(160).optional(),
    notes: z.string().trim().max(500).optional(),
    markupPct: markupPct.nullable().optional(),
    archived: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");
export type PartnerCustomerUpdateInput = z.infer<typeof partnerCustomerUpdateSchema>;

type PartnerFields = Pick<IExpressAccount, "type" | "status"> & { partner?: { enabled?: boolean; defaultMarkupPct?: number } | null };

/** An approved B2B account that staff have switched on as a partner. */
export function isActivePartner(account: PartnerFields | null | undefined): boolean {
  return Boolean(account && account.type === "b2b" && account.status === "active" && account.partner?.enabled);
}

/** The markup a customer is priced with: their own, else the partner's default. */
export function effectiveMarkupPct(partner: Pick<PartnerFields, "partner">, customer: Pick<IExpressPartnerCustomer, "markupPct"> | null | undefined): number {
  const own = customer?.markupPct;
  return own != null ? own : (partner.partner?.defaultMarkupPct ?? 0);
}

const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const DIGIT = "23456789";
const SYMBOL = "!@#$%*";

/** A strong password the partner can hand to a customer. Uses the crypto RNG, never Math.random. */
export function generateCustomerPassword(): string {
  const pick = (set: string) => set[randomInt(set.length)];
  const all = UPPER + LOWER + DIGIT + SYMBOL;
  const chars = [pick(UPPER), pick(LOWER), pick(DIGIT), pick(SYMBOL), ...Array.from({ length: 8 }, () => pick(all))];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

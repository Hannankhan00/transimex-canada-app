import type { PriceBreakdown } from "./pricing";
import type { IExpressQuote } from "@/models/ExpressQuote";

type QuoteDoc = Omit<Partial<IExpressQuote>, "_id" | "pricing"> & { _id: unknown; pricing: PriceBreakdown };

const iso = (d: unknown): string | null => {
  if (!d) return null;
  const date = new Date(d as string);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const surcharges = (list: PriceBreakdown["client"]["surcharges"]) =>
  list.map((s) => ({ code: s.code, name: s.name, amountCents: s.amountCents }));

/**
 * What a CLIENT (a B2C customer or a B2B partner) may see: the DHL public price,
 * their discount and their final price. Built field by field on purpose, so a
 * staff-only field added to the stored pricing can never leak by accident.
 * Never included: DHL account rate, profit, DHL contract discount, how the
 * public price was obtained.
 */
export function toClientQuoteDTO(doc: QuoteDoc, now: Date = new Date()) {
  const p = doc.pricing;
  const expiresAt = iso(doc.expiresAt);
  return {
    id: String(doc._id),
    createdAt: iso(doc.createdAt),
    expiresAt,
    expired: expiresAt ? new Date(expiresAt).getTime() <= now.getTime() : true,
    currency: "CAD" as const,
    service: { name: doc.serviceName || "", estimatedDelivery: iso(doc.estimatedDelivery) },
    destination: {
      countryCode: doc.request?.destination.countryCode || "",
      city: doc.request?.destination.city || "",
      postalCode: doc.request?.destination.postalCode || "",
    },
    pickupRequested: Boolean(doc.request?.pickupRequested),
    price: {
      publicBaseFreightCents: p.publicList.baseFreightCents,
      discountPct: p.clientDiscountPct,
      discountCents: p.discountCents,
      baseFreightCents: p.client.baseFreightCents,
      surcharges: surcharges(p.client.surcharges),
      totalCents: p.client.totalCents,
    },
  };
}

export type ClientQuoteDTO = ReturnType<typeof toClientQuoteDTO>;

/** Everything, for staff only. */
export function toAdminQuoteDTO(doc: QuoteDoc) {
  return {
    ...toClientQuoteDTO(doc),
    userId: doc.userId || "",
    accountId: doc.accountId || "",
    accountType: doc.accountType,
    pricing: doc.pricing,
  };
}

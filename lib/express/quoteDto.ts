import type { PriceBreakdown } from "./pricing";
import type { IExpressQuote } from "@/models/ExpressQuote";
import { contentTypeOf } from "./contentType";

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
    contentType: contentTypeOf(doc.request?.contentType),
    price: {
      publicBaseFreightCents: p.publicList.baseFreightCents,
      discountPct: p.clientDiscountPct,
      discountCents: p.discountCents,
      // True when no discount was given because neither end of the shipment is in Canada.
      discountWaived: p.discountWaived === "no_canada",
      baseFreightCents: p.client.baseFreightCents,
      surcharges: surcharges(p.client.surcharges),
      totalCents: p.client.totalCents,
    },
    // Only when a partner priced this for one of their customers: what the partner adds and what the customer is shown.
    partner: doc.partnerCustomerId
      ? {
          customerId: doc.partnerCustomerId,
          customerName: doc.partnerCustomerName || "",
          markupPct: doc.partnerMarkupPct ?? 0,
          markupCents: p.markupCents,
          customerTotalCents: p.customerTotalCents,
        }
      : null,
  };
}

/**
 * Splits `total` across `weights` in proportion, in whole cents, so the parts always add up to `total` exactly
 * (largest remainder). Used to fold a partner's markup into each price line without showing it as a line.
 */
export function allocateCents(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, w) => a + w, 0);
  if (weights.length === 0) return [];
  if (sum <= 0) return weights.map((_, i) => (i === 0 ? total : 0));
  const exact = weights.map((w) => (total * w) / sum);
  const parts = exact.map(Math.floor);
  let left = total - parts.reduce((a, n) => a + n, 0);
  const order = exact.map((e, i) => ({ i, r: e - Math.floor(e) })).sort((a, b) => b.r - a.r);
  for (let k = 0; left > 0; k = (k + 1) % order.length, left--) parts[order[k].i] += 1;
  return parts;
}

/**
 * What a partner's CUSTOMER may see: the service, delivery date and the full
 * price breakdown (shipping, fuel surcharge, Go Green and so on) adding up to
 * their final price. No DHL public price, no Transimex discount, and no
 * separate markup line: the partner's markup is spread across the lines, so
 * the lines always add up to what the customer pays.
 */
export function toCustomerQuoteDTO(doc: QuoteDoc, now: Date = new Date()) {
  const expiresAt = iso(doc.expiresAt);
  const client = doc.pricing.client;
  const lines = [
    { code: "FREIGHT", name: "Shipping", amountCents: client.baseFreightCents },
    ...client.surcharges.map((s) => ({ code: s.code, name: s.name, amountCents: s.amountCents })),
  ];
  const shares = allocateCents(doc.pricing.customerTotalCents, lines.map((l) => l.amountCents));
  const priced = lines.map((l, i) => ({ ...l, amountCents: shares[i] }));
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
    lines: priced,
    totalCents: doc.pricing.customerTotalCents,
  };
}

export type CustomerQuoteDTO = ReturnType<typeof toCustomerQuoteDTO>;

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

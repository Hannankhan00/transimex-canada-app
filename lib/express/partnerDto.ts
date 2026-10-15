import type { IExpressPartnerCustomer } from "@/models/ExpressPartnerCustomer";
import { effectiveMarkupPct } from "./partner";

type CustomerDoc = Omit<Partial<IExpressPartnerCustomer>, "_id"> & { _id: unknown };

export interface CustomerStats {
  shipments: number;
  /** What the partner paid Transimex. */
  partnerCents: number;
  /** What the customer was quoted. */
  customerCents: number;
  /** What the partner earned on top: customer price minus partner price. */
  markupCents: number;
}

export const EMPTY_STATS: CustomerStats = { shipments: 0, partnerCents: 0, customerCents: 0, markupCents: 0 };

const iso = (d: unknown): string | null => {
  if (!d) return null;
  const date = new Date(d as string);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

/** A customer as the partner sees them. The login's password hash is never part of this. */
export function toPartnerCustomerDTO(doc: CustomerDoc, partner: { partner?: { defaultMarkupPct?: number } | null }, stats: CustomerStats = EMPTY_STATS) {
  return {
    id: String(doc._id),
    name: doc.name || "",
    email: doc.email || "",
    phone: doc.phone || "",
    company: doc.company || "",
    notes: doc.notes || "",
    markupPct: doc.markupPct ?? null,
    effectiveMarkupPct: effectiveMarkupPct(partner, { markupPct: doc.markupPct ?? null }),
    archived: Boolean(doc.archived),
    hasLogin: Boolean(doc.loginUserId),
    createdAt: iso(doc.createdAt),
    stats,
  };
}

export type PartnerCustomerDTO = ReturnType<typeof toPartnerCustomerDTO>;

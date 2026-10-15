import type { IExpressShipment } from "@/models/ExpressShipment";
import type { AccountUserInfo } from "./accountDto";

type ShipmentDoc = Omit<Partial<IExpressShipment>, "_id"> & { _id: unknown };

const iso = (d: unknown): string | null => {
  if (!d) return null;
  const date = new Date(d as string);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const trackingUrl = (n?: string) => (n ? `https://www.dhl.com/ca-en/home/tracking.html?tracking-id=${encodeURIComponent(n)}` : null);

const address = (a: any) => ({
  name: a?.name || "",
  company: a?.company || "",
  line1: a?.line1 || "",
  line2: a?.line2 || "",
  city: a?.city || "",
  region: a?.region || "",
  postalCode: a?.postalCode || "",
  countryCode: a?.countryCode || "",
  phone: a?.phone || "",
  email: a?.email || "",
});

/**
 * What the OWNER sees. Built field by field. No staff identifiers and no
 * pricing breakdown: only the total they were quoted (the quote DTO carries
 * the client-safe price lines).
 */
export function toClientShipmentDTO(doc: ShipmentDoc) {
  return {
    id: String(doc._id),
    reference: doc.reference || "",
    status: doc.status!,
    statusHistory: (doc.statusHistory || []).map((h) => ({ status: h.status, at: iso(h.at), note: h.note || "" })),
    createdAt: iso(doc.createdAt),
    plannedShipDate: doc.plannedShipDate || "",
    quoteId: doc.quoteId || "",
    shipper: address(doc.shipper),
    recipient: address(doc.recipient),
    parcels: (doc.parcels || []).map((p) => ({ weightKg: p.weightKg, lengthCm: p.lengthCm, widthCm: p.widthCm, heightCm: p.heightCm })),
    items: (doc.items || []).map((i) => ({
      description: i.description,
      hsCode: i.hsCode,
      quantity: i.quantity,
      unitValueCents: i.unitValueCents,
      countryOfOrigin: i.countryOfOrigin,
      netWeightKg: i.netWeightKg,
      exportReason: i.exportReason,
    })),
    declaredValueCents: doc.declaredValueCents ?? 0,
    contentDescription: doc.contentDescription || "",
    pickupRequested: Boolean(doc.pickupRequested),
    dutiesPayer: doc.dutiesPayer!,
    totalCents: doc.totalCents ?? 0,
    currency: "CAD" as const,
    trackingNumber: doc.trackingNumber || "",
    trackingUrl: trackingUrl(doc.trackingNumber),
    termsVersion: doc.termsAccepted?.version || "",
  };
}

export type ClientShipmentDTO = ReturnType<typeof toClientShipmentDTO>;

/** Staff view: the client view plus ownership and the quote reference. Pricing is attached by the route. */
export function toAdminShipmentDTO(doc: ShipmentDoc, user?: AccountUserInfo | null) {
  return {
    ...toClientShipmentDTO(doc),
    userId: doc.userId || "",
    accountId: doc.accountId || "",
    accountType: doc.accountType!,
    user: { name: user?.name || "", email: user?.email || "", companyName: user?.companyName || "" },
  };
}

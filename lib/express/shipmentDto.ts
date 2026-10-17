import type { IExpressShipment } from "@/models/ExpressShipment";
import type { AccountUserInfo } from "./accountDto";
import { contentTypeOf } from "./contentType";

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
    contentType: contentTypeOf(doc.contentType),
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
    trackingUrl: doc.trackingUrl || trackingUrl(doc.trackingNumber),
    termsVersion: doc.termsAccepted?.version || "",
    // Payment status only. Never the provider's session, intent or refund ids, and never an error detail.
    canPay: doc.status === "awaiting_payment",
    paidAt: iso(doc.payment?.paidAt),
    refundedCents: doc.payment?.refundedCents ?? 0,
    labelReady: doc.status === "label_ready" && Boolean(doc.label?.key),
    // How this booking is paid. "invoice" = on the account's weekly invoice (invoiceId once invoiced).
    billing: doc.billing?.mode === "invoice" ? { mode: "invoice" as const, invoiceId: doc.billing.invoiceId || null } : null,
    // Only when a partner booked this for one of their customers.
    partner: doc.partnerCustomerId
      ? { customerId: doc.partnerCustomerId, customerName: doc.partnerCustomerName || "", markupCents: doc.markupCents ?? 0, customerTotalCents: doc.customerTotalCents ?? doc.totalCents ?? 0 }
      : null,
    // Where the parcel is with DHL. Null until the first DHL scan.
    tracking: doc.tracking?.events?.length
      ? {
          status: doc.tracking.status,
          events: doc.tracking.events.map((e) => ({ at: iso(e.at), status: e.status, description: e.description, location: e.location || "" })),
          lastCheckedAt: iso(doc.tracking.lastCheckedAt),
          deliveredAt: iso(doc.tracking.deliveredAt),
        }
      : null,
    cancelledAt: iso(doc.cancellation?.at),
  };
}

export type ClientShipmentDTO = ReturnType<typeof toClientShipmentDTO>;

/**
 * What a partner's CUSTOMER sees of a shipment the partner booked for them:
 * progress, tracking and the price they were quoted. Never the partner's own
 * price, the markup, payment or refund details, or the label.
 */
export function toCustomerShipmentDTO(doc: ShipmentDoc) {
  const full = toClientShipmentDTO(doc);
  return {
    ...full,
    totalCents: doc.customerTotalCents ?? full.totalCents,
    partner: null,
    billing: null,
    quoteId: "",
    termsVersion: "",
    canPay: false,
    paidAt: null,
    refundedCents: 0,
    labelReady: false,
    cancelledAt: full.cancelledAt,
    // The booking's payment steps are between the partner and Transimex.
    statusHistory: [],
  };
}

export type AttentionReason = "label_failed" | "outcome_unknown" | "label_overdue" | "amount_mismatch" | "refund_failed" | "delivery_exception" | "tracking_failing" | "no_scan";

/** Consecutive failed DHL tracking checks before staff are told. */
export const TRACKING_FAILURE_ALERT = 5;
/** A label that DHL still has no scan for after this many days is shown to staff. */
export const NO_SCAN_ALERT_DAYS = 10;

/** A paid booking still without a label after this long needs a human. */
export const LABEL_OVERDUE_MINUTES = 10;

/** Why staff should look at this booking. Empty means everything is on track. */
export function attentionReasons(doc: ShipmentDoc, now: Date = new Date()): AttentionReason[] {
  const reasons: AttentionReason[] = [];
  const f = doc.fulfilment?.state;
  if (f === "failed") reasons.push("label_failed");
  if (f === "unknown") reasons.push("outcome_unknown");
  const paidAt = doc.payment?.paidAt ? new Date(doc.payment.paidAt).getTime() : 0;
  if (doc.status === "paid" && (f === "none" || f === undefined) && paidAt && now.getTime() - paidAt > LABEL_OVERDUE_MINUTES * 60_000) reasons.push("label_overdue");
  if (doc.payment?.state === "mismatch") reasons.push("amount_mismatch");
  if (doc.payment?.refundState === "failed") reasons.push("refund_failed");
  if (doc.status === "label_ready") {
    if (doc.tracking?.status === "exception") reasons.push("delivery_exception");
    if ((doc.tracking?.failures ?? 0) >= TRACKING_FAILURE_ALERT) reasons.push("tracking_failing");
    const labelAt = doc.statusHistory?.find((h) => h.status === "label_ready")?.at;
    if (!doc.tracking?.events?.length && labelAt && now.getTime() - new Date(labelAt).getTime() > NO_SCAN_ALERT_DAYS * 86_400_000) reasons.push("no_scan");
  }
  return reasons;
}

/** Staff view: the client view plus ownership, payment, fulfilment and what needs attention. Pricing is attached by the route. */
export function toAdminShipmentDTO(doc: ShipmentDoc, user?: AccountUserInfo | null) {
  const p = doc.payment;
  return {
    ...toClientShipmentDTO(doc),
    userId: doc.userId || "",
    accountId: doc.accountId || "",
    accountType: doc.accountType!,
    documentsDeclaredAt: iso(doc.documentsDeclaredAt),
    user: { name: user?.name || "", email: user?.email || "", companyName: user?.companyName || "" },
    payment: {
      provider: p?.provider || "",
      state: p?.state || "none",
      attempts: p?.attempts ?? 0,
      sessionId: p?.sessionId || "",
      paymentIntentId: p?.paymentIntentId || "",
      amountCents: p?.amountCents ?? null,
      paidAt: iso(p?.paidAt),
      refundedCents: p?.refundedCents ?? 0,
      refunds: (p?.refunds || []).map((r) => ({ refundId: r.refundId, amountCents: r.amountCents, at: iso(r.at), reason: r.reason, by: r.by })),
      refundState: p?.refundState || "none",
      refundError: p?.refundError || "",
      duplicatePayments: (p?.duplicatePayments || []).map((d) => ({ paymentIntentId: d.paymentIntentId, refundId: d.refundId || "", at: iso(d.at) })),
      mismatchNote: p?.mismatchNote || "",
    },
    fulfilment: {
      state: doc.fulfilment?.state || "none",
      attempts: doc.fulfilment?.attempts ?? 0,
      lastError: doc.fulfilment?.lastError || "",
      lastAttemptAt: iso(doc.fulfilment?.lastAttemptAt),
    },
    label: doc.label ? { source: doc.label.source, uploadedAt: iso(doc.label.uploadedAt), bytes: doc.label.bytes } : null,
    pickupConfirmation: doc.pickupConfirmation || "",
    // Invoice-account detail (staff only): the charge, what was credited back, and the invoice it is on.
    billingDetail: doc.billing?.mode === "invoice"
      ? { mode: "invoice" as const, chargeCents: doc.billing.chargeCents, creditedCents: doc.billing.creditedCents ?? 0, invoiceId: doc.billing.invoiceId || null }
      : null,
    trackingCheck: { failures: doc.tracking?.failures ?? 0, lastError: doc.tracking?.lastError || "", lastChangedAt: iso(doc.tracking?.lastChangedAt) },
    cancellation: doc.cancellation ? { reason: doc.cancellation.reason, by: doc.cancellation.by, at: iso(doc.cancellation.at), refundCents: doc.cancellation.refundCents } : null,
    attention: attentionReasons(doc),
  };
}

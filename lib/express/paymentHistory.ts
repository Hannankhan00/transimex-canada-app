/**
 * The client's payment history: every card payment for a booking, every paid invoice, and every refund, as one
 * list from newest to oldest. Built field by field: no provider session or payment ids, no staff ids.
 */

export type PaymentEntryKind = "booking" | "invoice" | "refund";

export interface PaymentEntry {
  id: string;
  kind: PaymentEntryKind;
  /** ISO date of the payment or refund. */
  date: string;
  /** The booking reference, invoice number, or the booking the refund belongs to. */
  reference: string;
  /** Where the client can see the booking or invoice. */
  href: string;
  /** How it was paid. Refunds go back to the card, so they carry "card". */
  method: "card" | "manual";
  /** Integer CAD cents. Positive for a payment, negative for a refund. */
  amountCents: number;
}

export interface PaymentHistory {
  entries: PaymentEntry[];
  paidCents: number;
  refundedCents: number;
  netCents: number;
}

interface ShipmentLike {
  _id: unknown;
  reference?: string;
  payment?: {
    provider?: string;
    state?: string;
    amountCents?: number;
    paidAt?: Date | string;
    refunds?: { refundId?: string; amountCents: number; at: Date | string }[];
  };
}

interface InvoiceLike {
  _id: unknown;
  number?: string;
  totalCents?: number;
  paidAt?: Date | string;
  paidMethod?: "card" | "manual";
}

const iso = (d: unknown): string | null => {
  if (!d) return null;
  const date = new Date(d as string);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export function buildPaymentHistory(shipments: ShipmentLike[], invoices: InvoiceLike[]): PaymentHistory {
  const entries: PaymentEntry[] = [];

  for (const sh of shipments) {
    const pay = sh.payment;
    // Bookings put on the account's credit are paid through an invoice, not by card: they appear as that invoice.
    if (!pay || pay.state !== "paid" || pay.provider === "invoice") continue;
    const date = iso(pay.paidAt);
    if (!date || !pay.amountCents) continue;
    const id = String(sh._id);
    const reference = sh.reference || "";
    entries.push({ id: `pay-${id}`, kind: "booking", date, reference, href: `/express/shipments/${id}`, method: "card", amountCents: pay.amountCents });
    (pay.refunds || []).forEach((r, i) => {
      const at = iso(r.at);
      if (at && r.amountCents > 0) entries.push({ id: `refund-${id}-${i}`, kind: "refund", date: at, reference, href: `/express/shipments/${id}`, method: "card", amountCents: -r.amountCents });
    });
  }

  for (const inv of invoices) {
    const date = iso(inv.paidAt);
    if (!date || !inv.totalCents) continue;
    entries.push({ id: `inv-${String(inv._id)}`, kind: "invoice", date, reference: inv.number || "", href: `/express/invoices/${String(inv._id)}`, method: inv.paidMethod === "manual" ? "manual" : "card", amountCents: inv.totalCents });
  }

  entries.sort((a, b) => b.date.localeCompare(a.date));
  const paidCents = entries.filter((e) => e.amountCents > 0).reduce((s, e) => s + e.amountCents, 0);
  const refundedCents = -entries.filter((e) => e.amountCents < 0).reduce((s, e) => s + e.amountCents, 0);
  return { entries, paidCents, refundedCents, netCents: paidCents - refundedCents };
}

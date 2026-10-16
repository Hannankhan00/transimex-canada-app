import ExpressShipment from "@/models/ExpressShipment";
import ExpressInvoice from "@/models/ExpressInvoice";
import ExpressCreditNote from "@/models/ExpressCreditNote";
import type { ExpressBillingMode } from "@/models/ExpressAccount";

export interface CreditSummary {
  limitCents: number | null;
  /** Booked on credit and not yet paid: uninvoiced bookings plus unpaid invoices, less credits waiting to be applied. */
  usedCents: number;
  availableCents: number;
  uninvoicedCents: number;
  unpaidInvoiceCents: number;
  pendingCreditCents: number;
  /** Invoices past their due date and still unpaid. */
  overdueCount: number;
  overdueCents: number;
}

export type InvoiceBookingDecision =
  | { ok: true }
  | { ok: false; code: "invoice_not_allowed" | "invoice_overdue" | "credit_exceeded"; message: string };

/**
 * Whether an account may put one more booking on its invoice. Pure.
 * An overdue invoice blocks new credit bookings entirely (the account can still
 * pay by card if it has that mode). The limit is checked against what is already
 * owed plus this booking.
 */
export function decideInvoiceBooking(input: {
  billingModes: ExpressBillingMode[];
  creditLimitCents: number | null;
  usedCents: number;
  overdueCount: number;
  totalCents: number;
}): InvoiceBookingDecision {
  if (!input.billingModes.includes("invoice") || !input.creditLimitCents || input.creditLimitCents <= 0) {
    return { ok: false, code: "invoice_not_allowed", message: "Invoice billing is not enabled for your account." };
  }
  if (input.overdueCount > 0) {
    return { ok: false, code: "invoice_overdue", message: "You have an overdue invoice. Please pay it before booking on credit." };
  }
  if (input.usedCents + input.totalCents > input.creditLimitCents) {
    return { ok: false, code: "credit_exceeded", message: "This booking would go over your credit limit. Pay an open invoice or contact us." };
  }
  return { ok: true };
}

/** What an invoice booking is worth to the account right now: charge minus anything already credited back. */
export const NET_BILLABLE = { $subtract: ["$billing.chargeCents", { $ifNull: ["$billing.creditedCents", 0] }] };

/** Everything an account owes or has committed on credit. Always computed from the records, never a stored counter. */
export async function creditSummary(account: { _id: unknown; creditLimitCents?: number | null }, now: Date = new Date()): Promise<CreditSummary> {
  const accountId = String(account._id);
  const [uninvoiced, unpaid, credits, overdue] = await Promise.all([
    ExpressShipment.aggregate([
      { $match: { accountId, "billing.mode": "invoice", "billing.invoiceId": { $exists: false } } },
      { $group: { _id: null, total: { $sum: NET_BILLABLE } } },
    ]),
    ExpressInvoice.aggregate([
      { $match: { accountId, status: "issued" } },
      { $group: { _id: null, total: { $sum: "$totalCents" } } },
    ]),
    ExpressCreditNote.aggregate([
      { $match: { accountId, appliedInvoiceId: { $exists: false } } },
      { $group: { _id: null, total: { $sum: "$amountCents" } } },
    ]),
    ExpressInvoice.aggregate([
      { $match: { accountId, status: "issued", dueAt: { $lt: now } } },
      { $group: { _id: null, count: { $sum: 1 }, total: { $sum: "$totalCents" } } },
    ]),
  ]);

  const uninvoicedCents = uninvoiced[0]?.total ?? 0;
  const unpaidInvoiceCents = unpaid[0]?.total ?? 0;
  const pendingCreditCents = credits[0]?.total ?? 0;
  const usedCents = Math.max(0, uninvoicedCents + unpaidInvoiceCents - pendingCreditCents);
  const limitCents = account.creditLimitCents ?? null;
  return {
    limitCents,
    usedCents,
    availableCents: limitCents == null ? 0 : Math.max(0, limitCents - usedCents),
    uninvoicedCents,
    unpaidInvoiceCents,
    pendingCreditCents,
    overdueCount: overdue[0]?.count ?? 0,
    overdueCents: overdue[0]?.total ?? 0,
  };
}

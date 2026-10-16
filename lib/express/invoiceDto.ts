import type { IExpressInvoice } from "@/models/ExpressInvoice";

type InvoiceDoc = Omit<Partial<IExpressInvoice>, "_id"> & { _id: unknown };

const iso = (d: unknown): string | null => {
  if (!d) return null;
  const date = new Date(d as string);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

/** What an invoice is, for display: issued invoices past their due date are overdue. */
export type InvoiceDisplayStatus = "issued" | "overdue" | "paid" | "void";

export function displayStatus(doc: Pick<IExpressInvoice, "status" | "dueAt">, now: Date = new Date()): InvoiceDisplayStatus {
  if (doc.status === "issued" && new Date(doc.dueAt).getTime() < now.getTime()) return "overdue";
  return doc.status;
}

/**
 * What the account owner sees of an invoice. Built field by field: no
 * provider session or intent ids, no staff ids, no internal notes.
 */
export function toClientInvoiceDTO(doc: InvoiceDoc, now: Date = new Date()) {
  return {
    id: String(doc._id),
    number: doc.number || "",
    status: displayStatus(doc as Pick<IExpressInvoice, "status" | "dueAt">, now),
    totalCents: doc.totalCents ?? 0,
    currency: "CAD" as const,
    issuedAt: iso(doc.issuedAt),
    dueAt: iso(doc.dueAt),
    paymentTermsDays: doc.paymentTermsDays ?? 0,
    paidAt: iso(doc.paidAt),
    paidMethod: doc.paidMethod || null,
    lines: (doc.lines || []).map((l) => ({
      kind: l.kind,
      shipmentId: l.shipmentId || "",
      reference: l.reference || "",
      description: l.description,
      amountCents: l.amountCents,
    })),
    canPay: doc.status === "issued",
  };
}

export type ClientInvoiceDTO = ReturnType<typeof toClientInvoiceDTO>;

export interface InvoiceOwnerInfo {
  name?: string;
  email?: string;
  companyName?: string;
}

/** Staff view: the client view plus the account owner, payment attempts and void details. */
export function toAdminInvoiceDTO(doc: InvoiceDoc, owner?: InvoiceOwnerInfo | null, now: Date = new Date()) {
  const p = doc.payment;
  return {
    ...toClientInvoiceDTO(doc, now),
    accountId: doc.accountId || "",
    userId: doc.userId || "",
    owner: { name: owner?.name || "", email: owner?.email || "", companyName: owner?.companyName || "" },
    paidReference: doc.paidReference || "",
    paidBy: doc.paidBy || "",
    payment: {
      provider: p?.provider || "",
      state: p?.state || "none",
      attempts: p?.attempts ?? 0,
      paymentIntentId: p?.paymentIntentId || "",
      mismatchNote: p?.mismatchNote || "",
      duplicatePayments: (p?.duplicatePayments || []).map((d) => ({ paymentIntentId: d.paymentIntentId, refundId: d.refundId || "", at: iso(d.at) })),
    },
    reminderCount: doc.reminderCount ?? 0,
    lastReminderAt: iso(doc.lastReminderAt),
    voidedAt: iso(doc.voidedAt),
    voidReason: doc.voidReason || "",
    voidedBy: doc.voidedBy || "",
  };
}

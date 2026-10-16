import { Types } from "mongoose";
import connectDB from "@/lib/mongoose";
import ExpressAccount, { type IExpressAccount } from "@/models/ExpressAccount";
import ExpressCounter from "@/models/ExpressCounter";
import ExpressCreditNote, { type IExpressCreditNote } from "@/models/ExpressCreditNote";
import ExpressInvoice, { type IExpressInvoice, type IExpressInvoiceLine } from "@/models/ExpressInvoice";
import ExpressShipment, { type IExpressShipment } from "@/models/ExpressShipment";
import { NET_BILLABLE } from "./credit";
import { notifyInvoiceEvent } from "./invoiceNotify";

/** Used when an account has invoice billing but no payment terms were recorded. Staff normally set it. */
export const DEFAULT_TERMS_DAYS = 7;
/** An overdue invoice is reminded about at most this often. */
export const REMINDER_INTERVAL_DAYS = 7;

const DAY_MS = 86_400_000;

export const addDays = (from: Date, days: number) => new Date(from.getTime() + days * DAY_MS);

/** The bookings an invoice may bill: on credit, labelled (or cancelled but still partly charged), and not on an invoice yet. */
const eligibleFilter = (accountId?: string): Record<string, unknown> => ({
  ...(accountId ? { accountId } : {}),
  "billing.mode": "invoice",
  "billing.invoiceId": { $exists: false },
  status: { $in: ["label_ready", "cancelled"] },
  $expr: { $gt: [NET_BILLABLE, 0] },
});

type LineShipment = Pick<IExpressShipment, "reference" | "status" | "plannedShipDate" | "shipper" | "recipient" | "trackingNumber" | "billing"> & { _id: unknown };

/** The net amount of a booking to bill: the charge less what was credited back. */
export const netBillable = (sh: Pick<IExpressShipment, "billing">) => Math.max(0, (sh.billing?.chargeCents ?? 0) - (sh.billing?.creditedCents ?? 0));

/**
 * Builds the invoice lines from the claimed bookings and credits. Pure.
 * Bookings first (oldest first), then credits as negative lines.
 */
export function buildInvoiceLines(shipments: LineShipment[], credits: Pick<IExpressCreditNote, "amountCents" | "reason" | "shipmentId">[]): { lines: IExpressInvoiceLine[]; totalCents: number } {
  const lines: IExpressInvoiceLine[] = shipments.map((sh) => ({
    kind: "shipment" as const,
    shipmentId: String(sh._id),
    reference: sh.reference,
    description: `${sh.shipper.city} to ${sh.recipient.city}, ${sh.recipient.countryCode} · ${sh.plannedShipDate}${sh.status === "cancelled" ? " (cancelled, partly charged)" : ""}`.slice(0, 300),
    // The amount the claim recorded; falls back to the live value for a booking claimed by older code.
    amountCents: sh.billing?.billedCents ?? netBillable(sh),
  }));
  for (const c of credits) {
    lines.push({ kind: "credit", shipmentId: c.shipmentId, description: `Credit: ${c.reason}`.slice(0, 300), amountCents: -c.amountCents });
  }
  return { lines, totalCents: lines.reduce((sum, l) => sum + l.amountCents, 0) };
}

/** Next gap-free invoice number, e.g. EXI-2026-000123. */
export async function nextInvoiceNumber(now: Date): Promise<string> {
  const year = now.getUTCFullYear();
  const counter = await ExpressCounter.findOneAndUpdate({ key: `invoice-${year}` }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" });
  return `EXI-${year}-${String(counter.seq).padStart(6, "0")}`;
}

export type InvoiceRunOutcome = { accountId: string; outcome: "issued" | "nothing_to_bill" | "failed"; invoiceId?: string; number?: string; totalCents?: number; error?: string };

/**
 * Issues one invoice for an account's unbilled bookings and credits.
 *
 * Safe to run twice, even at the same time: bookings are CLAIMED atomically
 * (only a booking with no invoice yet can be claimed), the invoice lines are
 * built from what this run actually claimed, and a failure releases the claim.
 */
export async function generateInvoiceForAccount(account: Pick<IExpressAccount, "paymentTermsDays" | "userId"> & { _id: unknown }, now: Date = new Date()): Promise<InvoiceRunOutcome> {
  await connectDB();
  const accountId = String(account._id);

  const [candidates, pendingCredits] = await Promise.all([
    ExpressShipment.find(eligibleFilter(accountId)).sort({ createdAt: 1 }).limit(500).select("_id").lean(),
    ExpressCreditNote.find({ accountId, appliedInvoiceId: { $exists: false } }).select("_id").lean(),
  ]);
  if (candidates.length === 0) return { accountId, outcome: "nothing_to_bill" };

  const invoiceId = new Types.ObjectId();
  const invoiceKey = String(invoiceId);
  const shipmentIds = candidates.map((c) => c._id as Types.ObjectId);
  const creditIds = pendingCredits.map((c) => c._id as Types.ObjectId);

  const release = async () => {
    await ExpressShipment.collection.updateMany({ "billing.invoiceId": invoiceKey }, { $unset: { "billing.invoiceId": "", "billing.invoicedAt": "", "billing.billedCents": "" } });
    await ExpressCreditNote.updateMany({ appliedInvoiceId: invoiceKey }, { $unset: { appliedInvoiceId: "" } });
  };

  try {
    // Claim. A pipeline update records the billed amount in the same atomic step as the invoice id.
    await ExpressShipment.collection.updateMany(
      { _id: { $in: shipmentIds }, "billing.invoiceId": { $exists: false }, $expr: { $gt: [NET_BILLABLE, 0] } },
      [{ $set: { "billing.invoiceId": invoiceKey, "billing.invoicedAt": now, "billing.billedCents": NET_BILLABLE } }]
    );
    if (creditIds.length > 0) {
      await ExpressCreditNote.updateMany({ _id: { $in: creditIds }, appliedInvoiceId: { $exists: false } }, { $set: { appliedInvoiceId: invoiceKey } });
    }

    const [claimed, claimedCredits] = await Promise.all([
      ExpressShipment.find({ "billing.invoiceId": invoiceKey }).sort({ createdAt: 1 }).lean<IExpressShipment[]>(),
      ExpressCreditNote.find({ appliedInvoiceId: invoiceKey }).lean<IExpressCreditNote[]>(),
    ]);
    if (claimed.length === 0) {
      await release();
      return { accountId, outcome: "nothing_to_bill" };
    }

    const { lines, totalCents } = buildInvoiceLines(claimed, claimedCredits);
    // Credits larger than the bookings: carry them forward instead of issuing an empty or negative invoice.
    if (totalCents <= 0) {
      await release();
      return { accountId, outcome: "nothing_to_bill" };
    }

    const termsDays = account.paymentTermsDays && account.paymentTermsDays > 0 ? account.paymentTermsDays : DEFAULT_TERMS_DAYS;
    const number = await nextInvoiceNumber(now);
    const invoice = await ExpressInvoice.create({
      _id: invoiceId,
      number,
      accountId,
      userId: account.userId,
      status: "issued",
      lines,
      totalCents,
      issuedAt: now,
      dueAt: addDays(now, termsDays),
      paymentTermsDays: termsDays,
    });
    await notifyInvoiceEvent(String(invoice._id), "issued");
    return { accountId, outcome: "issued", invoiceId: String(invoice._id), number, totalCents };
  } catch (error) {
    console.error("[Express] Invoice generation failed for account", accountId, error);
    await release().catch((e) => console.error("[Express] Could not release a failed invoice claim:", e));
    return { accountId, outcome: "failed", error: error instanceof Error ? error.message : String(error) };
  }
}

export interface InvoiceRunSummary {
  accounts: number;
  issued: number;
  failed: number;
  totalCents: number;
  released: number;
  invoices: { accountId: string; number?: string; totalCents?: number; outcome: string }[];
}

/**
 * Bookings can be left claimed by an invoice that was never created (a crash
 * between the claim and the insert). They are released so the next run bills them.
 */
export async function releaseOrphanClaims(): Promise<number> {
  await connectDB();
  const claimed = await ExpressShipment.collection.distinct("billing.invoiceId", { "billing.invoiceId": { $exists: true } });
  if (claimed.length === 0) return 0;
  const valid = claimed.filter((id) => Types.ObjectId.isValid(id));
  const existing = new Set((await ExpressInvoice.find({ _id: { $in: valid } }).select("_id").lean()).map((i) => String(i._id)));
  const orphans = claimed.filter((id) => !existing.has(String(id)));
  if (orphans.length === 0) return 0;
  const res = await ExpressShipment.collection.updateMany({ "billing.invoiceId": { $in: orphans } }, { $unset: { "billing.invoiceId": "", "billing.invoicedAt": "", "billing.billedCents": "" } });
  await ExpressCreditNote.updateMany({ appliedInvoiceId: { $in: orphans } }, { $unset: { appliedInvoiceId: "" } });
  return res.modifiedCount;
}

/** The scheduled run: every account with unbilled credit bookings gets its invoice. Pass accountId for one account only. */
export async function runInvoicing(options: { now?: Date; accountId?: string } = {}): Promise<InvoiceRunSummary> {
  await connectDB();
  const now = options.now ?? new Date();
  const released = await releaseOrphanClaims();

  const ids: string[] = options.accountId ? [options.accountId] : (await ExpressShipment.distinct("accountId", eligibleFilter())).map(String);
  const accounts = ids.length ? await ExpressAccount.find({ _id: { $in: ids.filter((id) => Types.ObjectId.isValid(id)) }, type: "b2b" }).select("userId paymentTermsDays").lean<IExpressAccount[]>() : [];

  const summary: InvoiceRunSummary = { accounts: accounts.length, issued: 0, failed: 0, totalCents: 0, released, invoices: [] };
  for (const account of accounts) {
    const result = await generateInvoiceForAccount(account, now);
    if (result.outcome === "issued") {
      summary.issued++;
      summary.totalCents += result.totalCents ?? 0;
    } else if (result.outcome === "failed") summary.failed++;
    if (result.outcome !== "nothing_to_bill") summary.invoices.push({ accountId: result.accountId, number: result.number, totalCents: result.totalCents, outcome: result.outcome });
  }
  return summary;
}

/** Whether an issued invoice is past its due date. */
export const isOverdue = (inv: Pick<IExpressInvoice, "status" | "dueAt">, now: Date = new Date()) => inv.status === "issued" && new Date(inv.dueAt).getTime() < now.getTime();

/** Reminds accounts about overdue invoices, at most once per REMINDER_INTERVAL_DAYS each. */
export async function sendOverdueReminders(now: Date = new Date()): Promise<number> {
  await connectDB();
  const cutoff = addDays(now, -REMINDER_INTERVAL_DAYS);
  const due = await ExpressInvoice.find({
    status: "issued",
    dueAt: { $lt: now },
    $or: [{ lastReminderAt: { $exists: false } }, { lastReminderAt: { $lt: cutoff } }],
  })
    .limit(200)
    .select("_id lastReminderAt")
    .lean();

  let sent = 0;
  for (const inv of due) {
    // The conditional update is the lock: only one overlapping run reminds.
    const claimed = await ExpressInvoice.findOneAndUpdate(
      { _id: inv._id, status: "issued", $or: [{ lastReminderAt: { $exists: false } }, { lastReminderAt: { $lt: cutoff } }] },
      { $set: { lastReminderAt: now }, $inc: { reminderCount: 1 } }
    );
    if (!claimed) continue;
    await notifyInvoiceEvent(String(inv._id), "overdue");
    sent++;
  }
  return sent;
}

export interface VoidResult {
  ok: boolean;
  code?: "not_found" | "not_voidable";
  message?: string;
}

/** Staff cancel an unpaid invoice. Its bookings and credits go back to "not invoiced" so the next run bills them again. */
export async function voidInvoice(invoiceId: string, staffId: string, reason: string): Promise<VoidResult> {
  await connectDB();
  const inv = await ExpressInvoice.findById(invoiceId).lean<IExpressInvoice>().catch(() => null);
  if (!inv) return { ok: false, code: "not_found", message: "Invoice not found" };

  const voided = await ExpressInvoice.findOneAndUpdate(
    { _id: invoiceId, status: "issued", "payment.state": { $ne: "paid" } },
    { $set: { status: "void", voidedAt: new Date(), voidReason: reason, voidedBy: staffId } },
    { returnDocument: "after" }
  ).lean<IExpressInvoice>();
  if (!voided) return { ok: false, code: "not_voidable", message: "Only an unpaid invoice can be voided." };

  await ExpressShipment.collection.updateMany({ "billing.invoiceId": invoiceId }, { $unset: { "billing.invoiceId": "", "billing.invoicedAt": "", "billing.billedCents": "" } });
  await ExpressCreditNote.updateMany({ appliedInvoiceId: invoiceId }, { $unset: { appliedInvoiceId: "" } });
  return { ok: true };
}

/** Staff record a payment made outside the app (bank transfer, cheque). */
export async function markInvoicePaidManually(invoiceId: string, staffId: string, reference: string): Promise<VoidResult> {
  await connectDB();
  const paid = await ExpressInvoice.findOneAndUpdate(
    { _id: invoiceId, status: "issued" },
    { $set: { status: "paid", paidAt: new Date(), paidMethod: "manual", paidReference: reference, paidBy: staffId } },
    { returnDocument: "after" }
  ).lean<IExpressInvoice>()
    .catch(() => null);
  if (!paid) return { ok: false, code: "not_voidable", message: "Only an unpaid invoice can be marked paid." };
  await notifyInvoiceEvent(invoiceId, "paid");
  return { ok: true };
}

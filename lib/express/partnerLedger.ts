/**
 * The money rules for partners who are paid by Transimex (their customers pay Transimex, not the partner's own Stripe).
 * Pure functions only: no database, no clock except what is passed in, so every rule can be tested exactly.
 * All amounts are whole CAD cents.
 */
import { estimateCardFeeCents } from "./profitReport";

/** Earnings become withdrawable this many days after the customer paid, so a refund or chargeback can still be taken back. */
export const PAYOUT_HOLD_DAYS = 7;
/** The smallest payout a partner can ask for. */
export const MIN_PAYOUT_CENTS = 2500;
/** After a partner changes where payouts go, they cannot request one for this long (stops a hijacked login from redirecting money). */
export const DETAILS_COOLING_HOURS = 24;

const DAY_MS = 86_400_000;

/**
 * What a partner earns from a customer payment taken by Transimex: their markup, minus Stripe's card fee on the WHOLE
 * payment (the partner bears the card fee). It can be negative when the markup is smaller than the fee.
 */
export function partnerEarningCents(params: { markupCents: number; feeCents: number }): number {
  return params.markupCents - params.feeCents;
}

/** Stripe's fee: the real amount when Stripe reported it, else the standard rate as an estimate. */
export function cardFee(chargeCents: number, actualFeeCents: number | null | undefined): { feeCents: number; estimated: boolean } {
  if (typeof actualFeeCents === "number" && Number.isSafeInteger(actualFeeCents) && actualFeeCents >= 0) return { feeCents: actualFeeCents, estimated: false };
  return { feeCents: estimateCardFeeCents(chargeCents), estimated: true };
}

/**
 * When a refund gives money back to the customer, the partner gives back the same share of their markup. Stripe keeps
 * its card fee on a refund, so that part stays with the partner (it is not returned). Returns a negative number.
 */
export function reversalForRefundCents(params: { refundCents: number; chargeCents: number; markupCents: number }): number {
  if (params.chargeCents <= 0 || params.refundCents <= 0) return 0;
  const refund = Math.min(params.refundCents, params.chargeCents);
  return -Math.round((refund * params.markupCents) / params.chargeCents);
}

/** When an earning counts as withdrawable. A negative earning (the fee exceeded the markup) counts at once. */
export function availableAtFor(amountCents: number, paidAt: Date): Date {
  return amountCents > 0 ? new Date(paidAt.getTime() + PAYOUT_HOLD_DAYS * DAY_MS) : paidAt;
}

export interface LedgerLike {
  type: "earning" | "reversal" | "payout" | "adjustment";
  amountCents: number;
  availableAt: Date | string;
  createdAt: Date | string;
}

export interface BalanceSummary {
  /** Everything Transimex owes the partner right now (can be negative). */
  balanceCents: number;
  /** The part that has passed its hold period. */
  availableCents: number;
  /** The part still inside the hold period. */
  pendingCents: number;
  /** Already asked for in an open payout request. */
  reservedCents: number;
  /** What can be requested now. */
  withdrawableCents: number;
  paidOutCents: number;
}

export function summariseLedger(entries: LedgerLike[], openRequestCents: number, now: Date): BalanceSummary {
  let balance = 0;
  let available = 0;
  let paidOut = 0;
  for (const e of entries) {
    balance += e.amountCents;
    if (new Date(e.availableAt).getTime() <= now.getTime()) available += e.amountCents;
    if (e.type === "payout") paidOut += -e.amountCents;
  }
  return {
    balanceCents: balance,
    availableCents: available,
    pendingCents: balance - available,
    reservedCents: openRequestCents,
    withdrawableCents: Math.max(0, available - openRequestCents),
    paidOutCents: paidOut,
  };
}

export type PayoutRefusal = "below_minimum" | "exceeds_balance" | "no_details" | "details_recently_changed" | "open_request" | "invalid_amount";

export interface PayoutCheck {
  ok: boolean;
  code?: PayoutRefusal;
  message?: string;
}

/** Whether a payout of this amount may be requested right now. */
export function checkPayoutRequest(params: {
  amountCents: number;
  summary: BalanceSummary;
  hasDetails: boolean;
  detailsUpdatedAt?: Date | null;
  hasOpenRequest: boolean;
  now: Date;
}): PayoutCheck {
  const { amountCents, summary, now } = params;
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) return { ok: false, code: "invalid_amount", message: "Enter an amount above zero." };
  if (params.hasOpenRequest) return { ok: false, code: "open_request", message: "You already have a payout request waiting. Cancel it or wait until it is paid." };
  if (!params.hasDetails) return { ok: false, code: "no_details", message: "Add where we should send your payout first." };
  if (params.detailsUpdatedAt && now.getTime() - params.detailsUpdatedAt.getTime() < DETAILS_COOLING_HOURS * 3_600_000) {
    return { ok: false, code: "details_recently_changed", message: `For your security, payouts are paused for ${DETAILS_COOLING_HOURS} hours after you change your payout details.` };
  }
  if (amountCents < MIN_PAYOUT_CENTS) return { ok: false, code: "below_minimum", message: `The smallest payout is ${(MIN_PAYOUT_CENTS / 100).toFixed(2)} CAD.` };
  if (amountCents > summary.withdrawableCents) return { ok: false, code: "exceeds_balance", message: "That is more than you can withdraw right now." };
  return { ok: true };
}

export interface WeekStatement {
  /** The Monday (UTC) the week starts, YYYY-MM-DD. */
  weekStart: string;
  /** Earnings from customer payments (after Stripe's card fee). */
  earnedCents: number;
  /** Given back because of refunds. */
  reversedCents: number;
  /** Paid out to the partner (shown as a positive number). */
  paidOutCents: number;
  /** Everything in the week: earned + reversed + adjustments - payouts. */
  netCents: number;
  entries: number;
}

export function weekStartOf(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const sinceMonday = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - sinceMonday);
  return d.toISOString().slice(0, 10);
}

/** The ledger grouped by week, newest week first, for the partner's weekly statement. */
export function weeklyStatements(entries: LedgerLike[]): WeekStatement[] {
  const weeks = new Map<string, WeekStatement>();
  for (const e of entries) {
    const key = weekStartOf(new Date(e.createdAt));
    const w = weeks.get(key) ?? { weekStart: key, earnedCents: 0, reversedCents: 0, paidOutCents: 0, netCents: 0, entries: 0 };
    if (e.type === "earning") w.earnedCents += e.amountCents;
    else if (e.type === "reversal") w.reversedCents += e.amountCents;
    else if (e.type === "payout") w.paidOutCents += -e.amountCents;
    w.netCents += e.amountCents;
    w.entries++;
    weeks.set(key, w);
  }
  return [...weeks.values()].sort((a, b) => b.weekStart.localeCompare(a.weekStart));
}

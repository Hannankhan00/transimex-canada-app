/**
 * Transimex Express profit report. Built from what each booking was sold for and what DHL's rate was when it was
 * quoted (the saved quote), so it is an estimate until DHL's own weekly invoice is reconciled: a weight correction
 * DHL bills later is not in these figures.
 *
 * A booking counts once DHL has booked it (it has a tracking number), on the day its label was created, because
 * that is when DHL's charge is incurred. A booking cancelled after that still counts: DHL's charge stays, only the
 * refund or credit reduces what Transimex earned.
 */

/** Stripe's standard rate for Canadian cards. Only an estimate: the real fee is on Stripe's own statements. */
export const CARD_FEE_PCT = 2.9;
export const CARD_FEE_FIXED_CENTS = 30;

export interface ProfitRow {
  id: string;
  reference: string;
  /** ISO date the label was created. */
  date: string;
  accountId: string;
  accountType: "b2c" | "b2b" | "customer";
  originCountry: string;
  destinationCountry: string;
  payMethod: "card" | "invoice";
  /** What the client paid, after refunds or credits. */
  revenueCents: number;
  /** What DHL charges Transimex: its real charge once recorded, else the rate quoted at booking. */
  dhlCostCents: number;
  /** What the rate said at booking time. */
  quotedCostCents: number;
  /** "actual" when DHL's real charge is recorded, "quoted" while it is only the estimate. */
  costSource: "actual" | "quoted";
  /** A pickup fee passed through from DHL, paid back out of the revenue. */
  pickupFeeCents: number;
  /** revenue - pickup fee - DHL cost, before card fees. */
  profitCents: number;
  /** Estimated card processing fee (card payments only). */
  cardFeeCents: number;
  /** profit - card fee. */
  netProfitCents: number;
  discountPct: number;
  /** True when no discount was given because neither end is in Canada. */
  discountWaived: boolean;
  cancelled: boolean;
}

export interface Bucket {
  key: string;
  count: number;
  revenueCents: number;
  dhlCostCents: number;
  profitCents: number;
  netProfitCents: number;
}

export interface ProfitReport {
  totals: Bucket & { marginPct: number; cardFeeCents: number; belowCostCount: number; waivedCount: number; actualCount: number; varianceCents: number };
  byMonth: Bucket[];
  byType: Bucket[];
  byRoute: Bucket[];
  byAccount: Bucket[];
  rows: ProfitRow[];
}

interface ShipmentLike {
  _id: unknown;
  reference?: string;
  accountId?: string;
  accountType?: "b2c" | "b2b" | "customer";
  status?: string;
  quoteId?: string;
  totalCents?: number;
  trackingNumber?: string;
  label?: { uploadedAt?: Date | string };
  statusHistory?: { status: string; at: Date | string }[];
  payment?: { provider?: string; amountCents?: number; refundedCents?: number; connect?: { chargeCents?: number; applicationFeeCents?: number } };
  dhlActual?: { chargeCents?: number };
  billing?: { mode?: string; creditedCents?: number };
  recipient?: { countryCode?: string };
  shipper?: { countryCode?: string };
}

interface QuoteLike {
  pricing?: {
    account?: { totalCents?: number };
    pickupFeeCents?: number;
    clientDiscountPct?: number;
    discountWaived?: string;
  };
}

const iso = (d: unknown): string | null => {
  if (!d) return null;
  const date = new Date(d as string);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export function estimateCardFeeCents(paidCents: number): number {
  return paidCents > 0 ? Math.round((paidCents * CARD_FEE_PCT) / 100) + CARD_FEE_FIXED_CENTS : 0;
}

/** One row per booking that DHL booked in the period. A booking whose saved quote is missing is skipped and counted. */
export function buildProfitRows(shipments: ShipmentLike[], quotes: Map<string, QuoteLike>): { rows: ProfitRow[]; skipped: number } {
  const rows: ProfitRow[] = [];
  let skipped = 0;
  for (const sh of shipments) {
    if (!sh.trackingNumber) continue;
    const quote = sh.quoteId ? quotes.get(sh.quoteId) : undefined;
    const quoted = quote?.pricing?.account?.totalCents;
    const actual = sh.dhlActual?.chargeCents;
    const cost = actual ?? quoted;
    const date = iso(sh.label?.uploadedAt) || iso(sh.statusHistory?.find((h) => h.status === "label_ready")?.at);
    if (cost === undefined || !date) {
      skipped++;
      continue;
    }

    const onCredit = sh.billing?.mode === "invoice";
    const total = sh.totalCents ?? 0;
    // A partner's customer pays the partner's Stripe account; Transimex only receives its share (the application
    // fee = totalCents) and a refund gives back the same share of it. The partner, not Transimex, bears the card fee.
    const connect = sh.payment?.connect;
    const refunded = onCredit ? sh.billing?.creditedCents ?? 0 : sh.payment?.refundedCents ?? 0;
    const refundedOurShare = connect?.chargeCents ? Math.round((refunded * (connect.applicationFeeCents ?? total)) / connect.chargeCents) : refunded;
    const revenueCents = Math.max(0, total - refundedOurShare);
    const pickupFeeCents = quote?.pricing?.pickupFeeCents ?? 0;
    const profitCents = revenueCents - pickupFeeCents - cost;
    const cardFeeCents = !onCredit && !connect && sh.payment?.provider === "stripe" ? estimateCardFeeCents(sh.payment?.amountCents ?? total) : 0;

    rows.push({
      id: String(sh._id),
      reference: sh.reference || "",
      date,
      accountId: sh.accountId || "",
      accountType: sh.accountType || "b2c",
      originCountry: (sh.shipper?.countryCode || "").toUpperCase(),
      destinationCountry: (sh.recipient?.countryCode || "").toUpperCase(),
      payMethod: onCredit ? "invoice" : "card",
      revenueCents,
      dhlCostCents: cost,
      quotedCostCents: quoted ?? cost,
      costSource: actual !== undefined ? "actual" : "quoted",
      pickupFeeCents,
      profitCents,
      cardFeeCents,
      netProfitCents: profitCents - cardFeeCents,
      discountPct: quote?.pricing?.clientDiscountPct ?? 0,
      discountWaived: quote?.pricing?.discountWaived === "no_canada",
      cancelled: sh.status === "cancelled",
    });
  }
  rows.sort((a, b) => b.date.localeCompare(a.date));
  return { rows, skipped };
}

function group(rows: ProfitRow[], keyOf: (r: ProfitRow) => string): Bucket[] {
  const map = new Map<string, Bucket>();
  for (const r of rows) {
    const key = keyOf(r);
    const b = map.get(key) ?? { key, count: 0, revenueCents: 0, dhlCostCents: 0, profitCents: 0, netProfitCents: 0 };
    b.count++;
    b.revenueCents += r.revenueCents;
    b.dhlCostCents += r.dhlCostCents;
    b.profitCents += r.profitCents;
    b.netProfitCents += r.netProfitCents;
    map.set(key, b);
  }
  return [...map.values()];
}

export function summariseProfit(rows: ProfitRow[]): ProfitReport {
  const total = group(rows, () => "all")[0] ?? { key: "all", count: 0, revenueCents: 0, dhlCostCents: 0, profitCents: 0, netProfitCents: 0 };
  return {
    totals: {
      ...total,
      marginPct: total.revenueCents > 0 ? Math.round((total.profitCents / total.revenueCents) * 1000) / 10 : 0,
      cardFeeCents: rows.reduce((s, r) => s + r.cardFeeCents, 0),
      belowCostCount: rows.filter((r) => r.profitCents < 0).length,
      waivedCount: rows.filter((r) => r.discountWaived).length,
      actualCount: rows.filter((r) => r.costSource === "actual").length,
      // Real minus quoted, over the shipments where the real charge is known: positive means DHL charged more than quoted.
      varianceCents: rows.filter((r) => r.costSource === "actual").reduce((s, r) => s + r.dhlCostCents - r.quotedCostCents, 0),
    },
    byMonth: group(rows, (r) => r.date.slice(0, 7)).sort((a, b) => b.key.localeCompare(a.key)),
    byType: group(rows, (r) => r.accountType).sort((a, b) => b.profitCents - a.profitCents),
    byRoute: group(rows, (r) => `${r.originCountry || "??"} → ${r.destinationCountry || "??"}`).sort((a, b) => b.profitCents - a.profitCents),
    byAccount: group(rows, (r) => r.accountId || "unknown").sort((a, b) => b.profitCents - a.profitCents),
    rows,
  };
}

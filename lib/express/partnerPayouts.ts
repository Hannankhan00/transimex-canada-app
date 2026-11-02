import { isValidObjectId } from "mongoose";
import connectDB from "@/lib/mongoose";
import ExpressAccount, { type IExpressAccount } from "@/models/ExpressAccount";
import ExpressShipment, { type IExpressShipment } from "@/models/ExpressShipment";
import ExpressPartnerLedger from "@/models/ExpressPartnerLedger";
import ExpressPartnerPayout, { type IExpressPartnerPayout } from "@/models/ExpressPartnerPayout";
import { encryptPayoutDetails } from "./payoutCrypto";
import { maskPayoutDetails, type PayoutDetails } from "./payoutDetails";
import {
  availableAtFor,
  cardFee,
  checkPayoutRequest,
  partnerEarningCents,
  reversalForRefundCents,
  summariseLedger,
  type BalanceSummary,
  type PayoutCheck,
} from "./partnerLedger";
import type { PaymentProvider } from "./payments/types";

const isDuplicate = (error: unknown) => (error as { code?: number })?.code === 11000;

/**
 * The unique ledger key and the one-open-request index are what stop a double entry or a double request, so they must
 * really exist. Build them explicitly (cheap once they exist) instead of trusting Mongoose's autoIndex setting; if they
 * cannot be built, money-moving writes refuse to run.
 */
let indexesReady: Promise<unknown> | null = null;
async function ensureMoneyIndexes(): Promise<void> {
  indexesReady ??= Promise.all([ExpressPartnerLedger.createIndexes(), ExpressPartnerPayout.createIndexes()]).catch((error) => {
    indexesReady = null;
    throw error;
  });
  await indexesReady;
}

/**
 * Adds a partner's earning for a customer payment that Transimex collected. Safe to call any number of times for the
 * same shipment: the ledger key allows one earning per shipment. The earning is the partner's markup minus Stripe's
 * card fee on the whole payment (the real fee when Stripe reports it, else the standard rate as an estimate).
 */
export async function recordPartnerEarning(shipmentId: string, provider?: Pick<PaymentProvider, "getPaymentFeeCents">): Promise<"recorded" | "exists" | "skipped"> {
  await connectDB();
  if (!isValidObjectId(shipmentId)) return "skipped";
  await ensureMoneyIndexes();
  const sh = await ExpressShipment.findById(shipmentId).select("payment status").lean<IExpressShipment>();
  const share = sh?.payment?.partnerShare;
  if (!sh || !share || !sh.payment.paidAt || !sh.payment.paymentIntentId) return "skipped";

  let actual: number | null = null;
  try {
    actual = (await provider?.getPaymentFeeCents?.(sh.payment.paymentIntentId)) ?? null;
  } catch (error) {
    console.warn("[Express] Could not read Stripe's fee for", shipmentId, error);
  }
  const fee = cardFee(share.chargeCents, actual);
  const amountCents = partnerEarningCents({ markupCents: share.markupCents, feeCents: fee.feeCents });

  try {
    await ExpressPartnerLedger.create({
      partnerAccountId: share.partnerAccountId,
      type: "earning",
      amountCents,
      availableAt: availableAtFor(amountCents, new Date(sh.payment.paidAt)),
      key: `earn:${shipmentId}`,
      shipmentId,
      detail: { chargeCents: share.chargeCents, markupCents: share.markupCents, feeCents: fee.feeCents, feeEstimated: fee.estimated },
    });
    return "recorded";
  } catch (error) {
    if (isDuplicate(error)) return "exists";
    throw error;
  }
}

/** Takes back the partner's share of a refund. One entry per refund, however many times it is reported. */
export async function recordPartnerReversal(params: { shipmentId: string; refundKey: string; refundCents: number; note?: string }): Promise<"recorded" | "exists" | "skipped"> {
  await connectDB();
  if (!isValidObjectId(params.shipmentId)) return "skipped";
  await ensureMoneyIndexes();
  const sh = await ExpressShipment.findById(params.shipmentId).select("payment").lean<IExpressShipment>();
  const share = sh?.payment?.partnerShare;
  if (!share) return "skipped";
  const amountCents = reversalForRefundCents({ refundCents: params.refundCents, chargeCents: share.chargeCents, markupCents: share.markupCents });
  if (amountCents === 0) return "skipped";
  // The reversal waits out the same hold as the earning it takes back, so the two net out while the earning is still
  // pending instead of lowering what the partner can withdraw from other jobs.
  const earning = await ExpressPartnerLedger.findOne({ key: `earn:${params.shipmentId}` }).select("availableAt").lean<{ availableAt: Date }>();
  const now = new Date();
  const availableAt = earning && new Date(earning.availableAt).getTime() > now.getTime() ? new Date(earning.availableAt) : now;
  try {
    await ExpressPartnerLedger.create({
      partnerAccountId: share.partnerAccountId,
      type: "reversal",
      amountCents,
      availableAt,
      key: `rev:${params.shipmentId}:${params.refundKey}`,
      shipmentId: params.shipmentId,
      note: params.note ?? "Customer refund",
    });
    return "recorded";
  } catch (error) {
    if (isDuplicate(error)) return "exists";
    throw error;
  }
}

/**
 * Repairs anything a crash or a lost webhook could have left out: a paid customer booking with no earning yet, and a
 * paid payout with no ledger entry. Cheap and idempotent, so it runs whenever balances are shown.
 */
export async function reconcilePartner(partnerAccountId: string, provider?: Pick<PaymentProvider, "getPaymentFeeCents">): Promise<void> {
  await connectDB();
  const paid = await ExpressShipment.find({ "payment.partnerShare.partnerAccountId": partnerAccountId, "payment.paidAt": { $exists: true } }).select("_id").limit(2000).lean();
  if (paid.length > 0) {
    const have = new Set((await ExpressPartnerLedger.find({ partnerAccountId, type: "earning" }).select("key").lean()).map((e) => e.key));
    for (const sh of paid) {
      if (!have.has(`earn:${String(sh._id)}`)) await recordPartnerEarning(String(sh._id), provider).catch((e) => console.error("[Express] Earning repair failed", e));
    }
  }
  // A refund that was paid out but whose reversal was lost (a crash between the two writes) is taken back here.
  const refunded = await ExpressShipment.find({ "payment.partnerShare.partnerAccountId": partnerAccountId, "payment.refunds.0": { $exists: true } })
    .select("payment.refunds")
    .limit(2000)
    .lean<{ _id: unknown; payment?: { refunds?: { refundId: string; amountCents: number }[] } }[]>();
  if (refunded.length > 0) {
    const haveKeys = new Set((await ExpressPartnerLedger.find({ partnerAccountId, type: "reversal" }).select("key").lean()).map((e) => e.key));
    for (const sh of refunded) {
      for (const r of sh.payment?.refunds ?? []) {
        if (!haveKeys.has(`rev:${String(sh._id)}:${r.refundId}`)) {
          await recordPartnerReversal({ shipmentId: String(sh._id), refundKey: r.refundId, refundCents: r.amountCents }).catch((e) => console.error("[Express] Reversal repair failed", e));
        }
      }
    }
  }
  const payouts = await ExpressPartnerPayout.find({ partnerAccountId, status: "paid" }).select("_id amountCents resolvedAt").lean();
  for (const p of payouts) await ensurePayoutLedger(p).catch((e) => console.error("[Express] Payout ledger repair failed", e));
}

async function ensurePayoutLedger(p: { _id: unknown; amountCents: number; resolvedAt?: Date }): Promise<void> {
  const doc = await ExpressPartnerPayout.findById(p._id).select("partnerAccountId").lean();
  if (!doc) return;
  try {
    await ExpressPartnerLedger.create({
      partnerAccountId: doc.partnerAccountId,
      type: "payout",
      amountCents: -p.amountCents,
      availableAt: p.resolvedAt ?? new Date(),
      key: `payout:${String(p._id)}`,
      payoutId: String(p._id),
      note: "Payout sent",
    });
  } catch (error) {
    if (!isDuplicate(error)) throw error;
  }
}

export interface PartnerFinance {
  summary: BalanceSummary;
  openRequest: IExpressPartnerPayout | null;
}

/** The partner's balance, with what is already asked for in an open request set aside. */
export async function getPartnerFinance(partnerAccountId: string, now: Date = new Date()): Promise<PartnerFinance> {
  await connectDB();
  const [entries, open] = await Promise.all([
    ExpressPartnerLedger.find({ partnerAccountId }).select("type amountCents availableAt createdAt").limit(20000).lean(),
    ExpressPartnerPayout.findOne({ partnerAccountId, status: "requested" }).lean<IExpressPartnerPayout>(),
  ]);
  return { summary: summariseLedger(entries as any[], open?.amountCents ?? 0, now), openRequest: open ?? null };
}

/** Saves where payouts go, encrypted. Changing it starts the security cool-off. */
export async function savePayoutDetails(params: { accountId: string; details: PayoutDetails; now?: Date }): Promise<{ masked: string }> {
  await connectDB();
  const masked = maskPayoutDetails(params.details);
  const { method, ...secret } = params.details;
  const cipher = encryptPayoutDetails({ method, ...secret });
  await ExpressAccount.updateOne({ _id: params.accountId }, { $set: { "partner.payoutDetails": { method, cipher, masked, updatedAt: params.now ?? new Date() } } });
  return { masked };
}

export type RequestResult = { ok: true; payout: IExpressPartnerPayout } | ({ ok: false } & Required<Pick<PayoutCheck, "code" | "message">>);

/** Starts a payout request for the partner after every rule has been checked on the server. */
export async function requestPayout(params: { account: IExpressAccount; amountCents: number; now?: Date }): Promise<RequestResult> {
  await connectDB();
  await ensureMoneyIndexes();
  const now = params.now ?? new Date();
  const accountId = String(params.account._id);
  const details = params.account.partner?.payoutDetails;

  const { summary, openRequest } = await getPartnerFinance(accountId, now);
  const check = checkPayoutRequest({
    amountCents: params.amountCents,
    summary,
    hasDetails: Boolean(details),
    detailsUpdatedAt: details?.updatedAt ? new Date(details.updatedAt) : null,
    hasOpenRequest: Boolean(openRequest),
    now,
  });
  if (!check.ok || !details) return { ok: false, code: check.code ?? "no_details", message: check.message ?? "Add where we should send your payout first." };

  try {
    const payout = await ExpressPartnerPayout.create({
      partnerAccountId: accountId,
      partnerUserId: params.account.userId,
      amountCents: params.amountCents,
      status: "requested",
      destination: details.masked,
      destinationMethod: details.method,
      destinationCipher: details.cipher,
      requestedAt: now,
    });
    return { ok: true, payout: payout.toObject() as IExpressPartnerPayout };
  } catch (error) {
    // The database allows one open request per partner, so a second click lands here.
    if (isDuplicate(error)) return { ok: false, code: "open_request", message: "You already have a payout request waiting." };
    throw error;
  }
}

/** The partner withdraws their own open request. */
export async function cancelPayout(params: { accountId: string; payoutId: string }): Promise<boolean> {
  await connectDB();
  if (!isValidObjectId(params.payoutId)) return false;
  const res = await ExpressPartnerPayout.updateOne(
    { _id: params.payoutId, partnerAccountId: params.accountId, status: "requested" },
    { $set: { status: "cancelled", resolvedAt: new Date() } }
  );
  return res.modifiedCount === 1;
}

export type ResolveResult = { ok: true; payout: IExpressPartnerPayout } | { ok: false; code: "not_found" | "not_open" | "balance_too_low"; message: string };

/**
 * Staff finish a request. "paid" is only allowed while the partner still has the money (a refund since the request may
 * have lowered it) and records the transfer's reference; "reject" gives the reason back to the partner.
 */
export async function resolvePayout(params: {
  payoutId: string;
  actorId: string;
  action: "paid" | "reject";
  reference?: string;
  reason?: string;
  now?: Date;
}): Promise<ResolveResult> {
  await connectDB();
  const now = params.now ?? new Date();
  if (!isValidObjectId(params.payoutId)) return { ok: false, code: "not_found", message: "Payout request not found." };
  const payout = await ExpressPartnerPayout.findById(params.payoutId).lean<IExpressPartnerPayout>();
  if (!payout) return { ok: false, code: "not_found", message: "Payout request not found." };
  if (payout.status !== "requested") return { ok: false, code: "not_open", message: "This request was already handled." };

  if (params.action === "paid") {
    await reconcilePartner(payout.partnerAccountId);
    const { summary } = await getPartnerFinance(payout.partnerAccountId, now);
    // The request itself is counted as reserved, so compare against what has matured, before reserving.
    if (summary.availableCents < payout.amountCents) {
      return { ok: false, code: "balance_too_low", message: "The partner's available balance is now lower than this request (a refund came in). Reject it so they can request again." };
    }
  }

  const update =
    params.action === "paid"
      ? { status: "paid" as const, resolvedBy: params.actorId, resolvedAt: now, reference: params.reference }
      : { status: "rejected" as const, resolvedBy: params.actorId, resolvedAt: now, rejectedReason: params.reason };
  // The claim is atomic: only the first staff member to act wins, so a payout can never be recorded twice.
  const claimed = await ExpressPartnerPayout.findOneAndUpdate({ _id: params.payoutId, status: "requested" }, { $set: update }, { returnDocument: "after" }).lean<IExpressPartnerPayout>();
  if (!claimed) return { ok: false, code: "not_open", message: "This request was already handled." };

  // The request is already settled. If the ledger line cannot be written now, reconcilePartner writes it on the next
  // look, and every later payout re-checks the balance after reconciling. The caller must still be told it worked.
  if (params.action === "paid") {
    await ensurePayoutLedger({ _id: claimed._id, amountCents: claimed.amountCents, resolvedAt: now }).catch((e) =>
      console.error("[Express] Payout", String(claimed._id), "is paid but its ledger line failed; reconcile will add it:", e)
    );
  }
  return { ok: true, payout: claimed };
}

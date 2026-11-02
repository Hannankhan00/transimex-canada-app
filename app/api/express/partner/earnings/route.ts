import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import ExpressShipment from "@/models/ExpressShipment";
import ExpressPartnerLedger from "@/models/ExpressPartnerLedger";
import ExpressPartnerPayout from "@/models/ExpressPartnerPayout";
import { requireActivePartner } from "@/lib/express/partnerAccess";
import { getPaymentProvider } from "@/lib/express/payments";
import { DETAILS_COOLING_HOURS, MIN_PAYOUT_CENTS, PAYOUT_HOLD_DAYS, weeklyStatements } from "@/lib/express/partnerLedger";
import { getPartnerFinance, reconcilePartner } from "@/lib/express/partnerPayouts";
import { payoutCryptoConfigured } from "@/lib/express/payoutCrypto";

export const dynamic = "force-dynamic";

const iso = (d: unknown) => (d ? new Date(d as string).toISOString() : null);

/**
 * The partner's own money with Transimex: balance, weekly statements, recent entries and payout requests.
 * Bank details are never sent back, only a masked label.
 */
export async function GET() {
  try {
    const access = await requireActivePartner();
    if (access.error) return access.error;
    const accountId = String(access.account._id);
    await connectDB();

    // Repair anything a lost webhook left out before showing the balance.
    let provider = null;
    try {
      provider = getPaymentProvider();
    } catch {
      provider = null;
    }
    await reconcilePartner(accountId, provider ?? undefined);

    const [{ summary, openRequest }, entries, payouts] = await Promise.all([
      getPartnerFinance(accountId),
      ExpressPartnerLedger.find({ partnerAccountId: accountId }).sort({ createdAt: -1 }).limit(5000).lean(),
      ExpressPartnerPayout.find({ partnerAccountId: accountId }).sort({ createdAt: -1 }).limit(100).lean(),
    ]);

    const recent = entries.slice(0, 60);
    const refs = new Map(
      (await ExpressShipment.find({ _id: { $in: recent.map((e) => e.shipmentId).filter((id): id is string => Boolean(id)) } }).select("reference").lean()).map((s) => [String(s._id), s.reference])
    );
    const details = access.account.partner?.payoutDetails;

    return NextResponse.json({
      success: true,
      collection: access.account.partner?.customerPayments ?? "stripe",
      stripeConnected: Boolean(access.account.partner?.stripe?.chargesEnabled),
      cryptoReady: payoutCryptoConfigured(),
      rules: { holdDays: PAYOUT_HOLD_DAYS, minPayoutCents: MIN_PAYOUT_CENTS, coolingHours: DETAILS_COOLING_HOURS },
      summary,
      payoutDetails: details ? { method: details.method, masked: details.masked, updatedAt: iso(details.updatedAt) } : null,
      openRequestId: openRequest ? String(openRequest._id) : null,
      weeks: weeklyStatements(entries as any[]).slice(0, 26),
      entries: recent.map((e) => ({
        id: String(e._id),
        type: e.type,
        amountCents: e.amountCents,
        createdAt: iso(e.createdAt),
        availableAt: iso(e.availableAt),
        reference: e.shipmentId ? refs.get(e.shipmentId) || "" : "",
        note: e.note || "",
        fee: e.detail ? { feeCents: e.detail.feeCents, estimated: e.detail.feeEstimated, markupCents: e.detail.markupCents } : null,
      })),
      payouts: payouts.map((p) => ({
        id: String(p._id),
        amountCents: p.amountCents,
        status: p.status,
        destination: p.destination,
        requestedAt: iso(p.requestedAt),
        resolvedAt: iso(p.resolvedAt),
        reference: p.reference || "",
        rejectedReason: p.rejectedReason || "",
      })),
    });
  } catch (error) {
    console.error("Express partner earnings error:", error);
    return NextResponse.json({ error: "Failed to load your earnings" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import connectDB from "@/lib/mongoose";
import ExpressAccount from "@/models/ExpressAccount";
import ExpressPartnerLedger from "@/models/ExpressPartnerLedger";
import ExpressPartnerPayout from "@/models/ExpressPartnerPayout";
import { requireExpressStaff } from "@/lib/express/access";
import { getPartnerFinance } from "@/lib/express/partnerPayouts";

export const dynamic = "force-dynamic";

const iso = (d: unknown) => (d ? new Date(d as string).toISOString() : null);

/**
 * Payout requests (open ones first) and what Transimex owes each partner. Bank details are never in this list: staff
 * open them one request at a time, which is logged.
 */
export async function GET() {
  try {
    const access = await requireExpressStaff();
    if (access.error) return access.error;
    await connectDB();

    const [requests, owed] = await Promise.all([
      ExpressPartnerPayout.find().sort({ createdAt: -1 }).limit(200).lean(),
      ExpressPartnerLedger.aggregate([{ $group: { _id: "$partnerAccountId", balanceCents: { $sum: "$amountCents" }, entries: { $sum: 1 } } }]),
    ]);

    const ids = Array.from(new Set([...requests.map((r) => r.partnerAccountId), ...owed.map((o) => String(o._id))])).filter((id) => isValidObjectId(id));
    const accounts = await ExpressAccount.find({ _id: { $in: ids } }).select("contactName company.name partner.collection").lean<any[]>();
    const names = new Map(accounts.map((a) => [String(a._id), a.company?.name || a.contactName || String(a._id)]));

    // The open requests also show what the partner can still withdraw, so staff see a refund that came in since.
    const open = requests.filter((r) => r.status === "requested");
    const finances = await Promise.all(open.map((r) => getPartnerFinance(r.partnerAccountId)));
    const availableBy = new Map(open.map((r, i) => [String(r._id), finances[i].summary.availableCents]));

    const rows = requests
      .map((r) => ({
        id: String(r._id),
        partnerAccountId: r.partnerAccountId,
        partnerName: names.get(r.partnerAccountId) || "Partner",
        amountCents: r.amountCents,
        status: r.status,
        destination: r.destination,
        requestedAt: iso(r.requestedAt),
        resolvedAt: iso(r.resolvedAt),
        reference: r.reference || "",
        rejectedReason: r.rejectedReason || "",
        availableCents: availableBy.get(String(r._id)) ?? null,
      }))
      .sort((a, b) => (a.status === "requested" ? 0 : 1) - (b.status === "requested" ? 0 : 1));

    return NextResponse.json({
      success: true,
      requests: rows,
      owed: owed
        .map((o) => ({ partnerAccountId: String(o._id), partnerName: names.get(String(o._id)) || "Partner", balanceCents: o.balanceCents as number, entries: o.entries as number }))
        .sort((a, b) => b.balanceCents - a.balanceCents),
      totalOwedCents: owed.reduce((s, o) => s + (o.balanceCents as number), 0),
    });
  } catch (error) {
    console.error("Express admin payouts error:", error);
    return NextResponse.json({ error: "Failed to load payouts" }, { status: 500 });
  }
}

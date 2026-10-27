import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import connectDB from "@/lib/mongoose";
import ExpressShipment from "@/models/ExpressShipment";
import ExpressQuote from "@/models/ExpressQuote";
import ExpressAccount from "@/models/ExpressAccount";
import { requireExpressStaff } from "@/lib/express/access";
import { buildProfitRows, summariseProfit } from "@/lib/express/profitReport";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Staff profit report: what DHL-booked shipments sold for, what DHL's rate said they cost, and the difference.
 * ?from=YYYY-MM-DD&to=YYYY-MM-DD limits it to labels created in that period (both optional, inclusive).
 */
export async function GET(req: Request) {
  try {
    const access = await requireExpressStaff();
    if (access.error) return access.error;

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";
    if ((from && !DAY.test(from)) || (to && !DAY.test(to))) return NextResponse.json({ error: "Use dates like 2026-10-31." }, { status: 400 });

    const range: Record<string, Date> = {};
    if (from) range.$gte = new Date(`${from}T00:00:00.000Z`);
    if (to) range.$lte = new Date(`${to}T23:59:59.999Z`);

    await connectDB();
    // Booked at DHL (has a tracking number) and still on record: finished or cancelled after the label.
    const filter: Record<string, unknown> = { trackingNumber: { $exists: true, $ne: "" }, status: { $in: ["label_ready", "cancelled"] } };
    if (from || to) filter["label.uploadedAt"] = range;

    const shipments = await ExpressShipment.find(filter)
      .select("reference accountId accountType status quoteId totalCents trackingNumber label statusHistory payment.provider payment.amountCents payment.refundedCents billing.mode billing.creditedCents shipper.countryCode recipient.countryCode")
      .sort({ "label.uploadedAt": -1 })
      .limit(5000)
      .lean();

    const quoteIds = Array.from(new Set(shipments.map((s) => s.quoteId).filter((id) => isValidObjectId(id))));
    const quotes = await ExpressQuote.find({ _id: { $in: quoteIds } })
      .select("pricing.account.totalCents pricing.pickupFeeCents pricing.clientDiscountPct pricing.discountWaived")
      .lean();
    const quoteMap = new Map(quotes.map((q) => [String(q._id), q as any]));

    const { rows, skipped } = buildProfitRows(shipments as any[], quoteMap);
    const report = summariseProfit(rows);

    // Names for the per-account table.
    const accountIds = Array.from(new Set(rows.map((r) => r.accountId))).filter((id) => isValidObjectId(id));
    const accounts = await ExpressAccount.find({ _id: { $in: accountIds } }).select("contactName company.name type").lean<any[]>();
    const names = Object.fromEntries(accounts.map((a) => [String(a._id), a.company?.name || a.contactName || String(a._id)]));

    // Bookings that are paid but have no DHL label yet: not in the figures, shown so nothing looks missing.
    const awaitingLabel = await ExpressShipment.countDocuments({ status: "paid", $or: [{ trackingNumber: { $exists: false } }, { trackingNumber: "" }] });

    return NextResponse.json({ success: true, currency: "CAD", from, to, ...report, names, skipped, awaitingLabel });
  } catch (error) {
    console.error("Express profit report error:", error);
    return NextResponse.json({ error: "Failed to build the profit report" }, { status: 500 });
  }
}

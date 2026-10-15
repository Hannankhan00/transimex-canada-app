import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import ExpressAccount from "@/models/ExpressAccount";
import ExpressQuote from "@/models/ExpressQuote";
import { requireExpressClient, validationError } from "@/lib/express/access";
import { quoteRequestSchema } from "@/lib/express/quoteSchemas";
import { QUOTE_TTL_MINUTES, QuoteError, priceRequest } from "@/lib/express/quoteService";
import { toClientQuoteDTO } from "@/lib/express/quoteDto";
import { getPricingSettings } from "@/lib/express/settings";
import { canUseExpress } from "@/lib/express/transitions";
import { getCarrierAdapter } from "@/lib/shipping/registry";

/** Quotes a client can request per rolling 10 minutes; each one calls DHL. */
const QUOTES_PER_10_MIN = 30;

export async function GET() {
  try {
    const access = await requireExpressClient();
    if (access.error) return access.error;

    await connectDB();
    const docs = await ExpressQuote.find({ userId: access.actor.userId }).sort({ createdAt: -1 }).limit(20).lean();
    return NextResponse.json({ success: true, quotes: docs.map((d) => toClientQuoteDTO(d as any)) });
  } catch (error) {
    console.error("Express quotes list error:", error);
    return NextResponse.json({ error: "Failed to load quotes" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const access = await requireExpressClient();
    if (access.error) return access.error;
    const userId = access.actor.userId;

    const body = await req.json().catch(() => null);
    const parsed = quoteRequestSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    await connectDB();

    const account = await ExpressAccount.findOne({ userId }).lean();
    if (!account) {
      return NextResponse.json({ error: "Apply for an Express account first.", code: "no_account" }, { status: 403 });
    }
    // A pending B2B account waits; rejected and suspended accounts cannot quote either.
    if (!canUseExpress(account)) {
      return NextResponse.json({ error: "Your Express account is not active.", code: `account_${account.status}` }, { status: 403 });
    }

    const recent = await ExpressQuote.countDocuments({ userId, createdAt: { $gte: new Date(Date.now() - 10 * 60_000) } });
    if (recent >= QUOTES_PER_10_MIN) {
      return NextResponse.json({ error: "Too many quote requests. Please wait a few minutes.", code: "rate_limited" }, { status: 429 });
    }

    const settings = await getPricingSettings();
    // B2C: the single global discount. B2B: the account's own, set by staff at approval.
    const clientDiscountPct = account.type === "b2c" ? settings.b2cDiscountPct : account.discountPct;
    if (clientDiscountPct == null) {
      console.error("[Express] Active B2B account has no discount set:", String(account._id));
      return NextResponse.json({ error: "Your account is not fully set up yet. Please contact us.", code: "account_incomplete" }, { status: 409 });
    }

    const priced = await priceRequest({
      input: parsed.data,
      adapter: getCarrierAdapter("dhl"),
      clientDiscountPct,
      settings,
    });

    // Never sell below what DHL charges us (for example a mistyped discount).
    if (priced.breakdown.belowCost) {
      console.error("[Express] Refused below-cost quote", { account: String(account._id), profitCents: priced.breakdown.profitCents });
      return NextResponse.json(
        { error: "We cannot quote this shipment online right now. Please contact us.", code: "pricing_unavailable" },
        { status: 503 }
      );
    }

    const saved = await ExpressQuote.create({
      userId,
      accountId: String(account._id),
      accountType: account.type,
      carrier: "dhl",
      serviceCode: priced.option.serviceCode,
      serviceName: priced.option.serviceName,
      estimatedDelivery: priced.option.estimatedDelivery ? new Date(priced.option.estimatedDelivery) : null,
      request: priced.request,
      pricing: priced.breakdown,
      expiresAt: new Date(Date.now() + QUOTE_TTL_MINUTES * 60_000),
    });

    return NextResponse.json({ success: true, quote: toClientQuoteDTO(saved.toObject() as any) }, { status: 201 });
  } catch (error) {
    if (error instanceof QuoteError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("Express quote error:", error);
    return NextResponse.json({ error: "Failed to create quote" }, { status: 500 });
  }
}

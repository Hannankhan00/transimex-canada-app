import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import connectDB from "@/lib/mongoose";
import ExpressAccount from "@/models/ExpressAccount";
import { requireExpressStaff, validationError } from "@/lib/express/access";
import { simulateSchema } from "@/lib/express/quoteSchemas";
import { QuoteError, priceRequest } from "@/lib/express/quoteService";
import { getPricingSettings } from "@/lib/express/settings";
import { getCarrierAdapter } from "@/lib/shipping/registry";

/**
 * Staff price simulator. Prices a shipment for a chosen account (or as B2C)
 * and returns every price level, including the staff-only ones. Nothing is saved.
 */
export async function POST(req: Request) {
  try {
    const access = await requireExpressStaff();
    if (access.error) return access.error;

    const body = await req.json().catch(() => null);
    const parsed = simulateSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);
    const { request, accountId, discountPctOverride, markup } = parsed.data;

    await connectDB();
    const settings = await getPricingSettings();

    let discountPct = settings.b2cDiscountPct;
    let discountSource = "Global B2C discount";
    let accountInfo: { id: string; type: string; status: string; name: string } | null = null;

    if (accountId) {
      if (!isValidObjectId(accountId)) return NextResponse.json({ error: "Account not found" }, { status: 404 });
      const account = await ExpressAccount.findById(accountId).lean();
      if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });
      accountInfo = { id: String(account._id), type: account.type, status: account.status, name: account.company?.name || account.contactName };

      if (account.type === "b2b") {
        if (account.discountPct == null) {
          return NextResponse.json({ error: "This B2B account has no discount yet. Approve it with terms first." }, { status: 409 });
        }
        discountPct = account.discountPct;
        discountSource = "B2B account discount";
      }
    }
    if (discountPctOverride !== undefined) {
      discountPct = discountPctOverride;
      discountSource = "What-if override";
    }

    const priced = await priceRequest({
      input: request,
      adapter: getCarrierAdapter("dhl"),
      clientDiscountPct: discountPct,
      settings,
      markup: markup ?? null,
    });

    return NextResponse.json({
      success: true,
      account: accountInfo,
      discountSource,
      service: {
        code: priced.option.serviceCode,
        name: priced.option.serviceName,
        estimatedDelivery: priced.option.estimatedDelivery ?? null,
      },
      request: priced.request,
      pricing: priced.breakdown,
    });
  } catch (error) {
    if (error instanceof QuoteError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("Express simulate error:", error);
    return NextResponse.json({ error: "Failed to simulate quote" }, { status: 500 });
  }
}

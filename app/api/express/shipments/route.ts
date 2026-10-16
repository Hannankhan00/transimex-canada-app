import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import connectDB from "@/lib/mongoose";
import ExpressAccount from "@/models/ExpressAccount";
import ExpressQuote from "@/models/ExpressQuote";
import ExpressShipment from "@/models/ExpressShipment";
import { notifyUser } from "@/lib/notifications";
import { requireExpressClient, validationError } from "@/lib/express/access";
import { bookingSchema } from "@/lib/express/shipmentSchemas";
import { checkBookingAgainstQuote, defaultContentDescription, generateReference } from "@/lib/express/bookingService";
import { toClientQuoteDTO } from "@/lib/express/quoteDto";
import { toClientShipmentDTO, toCustomerShipmentDTO } from "@/lib/express/shipmentDto";
import { resolvePricingContext } from "@/lib/express/partnerPricing";
import { getPricingSettings } from "@/lib/express/settings";
import { creditSummary, decideInvoiceBooking } from "@/lib/express/credit";
import { authorizeOnAccount } from "@/lib/express/invoiceBooking";
import { getCurrentTerms } from "@/lib/express/termsStore";
import { canUseExpress } from "@/lib/express/transitions";

export async function GET() {
  try {
    const access = await requireExpressClient();
    if (access.error) return access.error;

    await connectDB();
    const account = await ExpressAccount.findOne({ userId: access.actor.userId }).select("type partnerCustomerId").lean();
    // A partner's customer sees the shipments their partner booked for them, with the price they were quoted.
    if (account?.type === "customer") {
      if (!account.partnerCustomerId) return NextResponse.json({ success: true, shipments: [] });
      const docs = await ExpressShipment.find({ partnerCustomerId: account.partnerCustomerId, status: { $ne: "awaiting_payment" } }).sort({ createdAt: -1 }).limit(100).lean();
      return NextResponse.json({ success: true, shipments: docs.map((d) => toCustomerShipmentDTO(d as any)) });
    }
    const docs = await ExpressShipment.find({ userId: access.actor.userId }).sort({ createdAt: -1 }).limit(100).lean();
    return NextResponse.json({ success: true, shipments: docs.map((d) => toClientShipmentDTO(d as any)) });
  } catch (error) {
    console.error("Express shipments list error:", error);
    return NextResponse.json({ error: "Failed to load shipments" }, { status: 500 });
  }
}

/**
 * Confirm a booking from a saved quote. Safe to repeat: the same
 * idempotencyKey always returns the same booking, and a quote can only be
 * booked once, so a double click cannot create two shipments.
 */
export async function POST(req: Request) {
  try {
    const access = await requireExpressClient();
    if (access.error) return access.error;
    const userId = access.actor.userId;

    const body = await req.json().catch(() => null);
    const parsed = bookingSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);
    const input = parsed.data;

    await connectDB();

    // Replay: same client, same key -> the booking that already exists.
    const replay = await ExpressShipment.findOne({ userId, idempotencyKey: input.idempotencyKey }).lean();
    if (replay) {
      return NextResponse.json({ success: true, replayed: true, shipment: toClientShipmentDTO(replay as any) }, { status: 200 });
    }

    const account = await ExpressAccount.findOne({ userId }).lean();
    if (!account) {
      return NextResponse.json({ error: "Apply for an Express account first.", code: "no_account" }, { status: 403 });
    }
    if (!canUseExpress(account)) {
      return NextResponse.json({ error: "Your Express account is not active.", code: `account_${account.status}` }, { status: 403 });
    }
    // A partner's customer can look at prices and shipments but cannot book yet: who pays Transimex for
    // a customer's own booking is still undecided, so booking stays with the partner.
    if (account.type === "customer") {
      return NextResponse.json(
        { error: "Your shipping partner books shipments for you. Contact them to book.", code: "customer_booking_disabled" },
        { status: 403 }
      );
    }
    const currentTerms = await getCurrentTerms();
    if (input.termsVersion !== currentTerms.version) {
      return NextResponse.json(
        { error: "The terms of service were updated. Please review them and confirm again.", code: "terms_changed" },
        { status: 409 }
      );
    }

    if (!isValidObjectId(input.quoteId)) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    const quote = await ExpressQuote.findOne({ _id: input.quoteId, userId }).lean();
    if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

    if (new Date(quote.expiresAt).getTime() <= Date.now()) {
      return NextResponse.json({ error: "This quote has expired. Please get a new price.", code: "quote_expired" }, { status: 409 });
    }
    const booked = await ExpressShipment.findOne({ quoteId: String(quote._id) }).lean();
    if (booked) {
      // Our own request, arriving twice at once, is a replay. Anyone else's (or a new key) is a conflict.
      if (booked.userId === userId && booked.idempotencyKey === input.idempotencyKey) {
        return NextResponse.json({ success: true, replayed: true, shipment: toClientShipmentDTO(booked as any) }, { status: 200 });
      }
      return NextResponse.json({ error: "This quote has already been booked.", code: "quote_used" }, { status: 409 });
    }

    // The partner's price for this customer is fixed by the quote, and the customer must still be theirs and active.
    let partnerFields: Record<string, unknown> = {};
    if (quote.partnerCustomerId) {
      const settings = await getPricingSettings();
      const context = await resolvePricingContext({ account, b2cDiscountPct: settings.b2cDiscountPct, requestedCustomerId: quote.partnerCustomerId });
      if (!context.ok) return NextResponse.json({ error: context.error, code: context.code }, { status: context.status });
      partnerFields = {
        partnerCustomerId: quote.partnerCustomerId,
        partnerCustomerName: quote.partnerCustomerName || context.partnerCustomerName,
        markupCents: quote.pricing.markupCents,
        customerTotalCents: quote.pricing.customerTotalCents,
      };
    }

    // How this booking is paid: by card now, or on the account's weekly invoice (business accounts only).
    const modes = account.type === "b2b" ? account.billingModes : (["pay_at_booking"] as const);
    const method = input.paymentMethod ?? (modes.includes("pay_at_booking") ? "card" : "invoice");
    if (method === "card" && !modes.includes("pay_at_booking")) {
      return NextResponse.json({ error: "Card payment is not enabled for your account. Please contact us.", code: "billing_not_available" }, { status: 403 });
    }
    if (method === "invoice") {
      const summary = await creditSummary(account);
      const decision = decideInvoiceBooking({
        billingModes: [...modes],
        creditLimitCents: account.creditLimitCents ?? null,
        usedCents: summary.usedCents,
        overdueCount: summary.overdueCount,
        totalCents: quote.pricing.client.totalCents,
      });
      if (!decision.ok) {
        return NextResponse.json({ error: decision.message, code: decision.code }, { status: decision.code === "invoice_not_allowed" ? 403 : 402 });
      }
    }

    const issues = checkBookingAgainstQuote(input, quote);
    if (issues.length > 0) {
      return NextResponse.json({ error: "Validation failed", fields: issues }, { status: 422 });
    }

    const now = new Date();
    const base = {
      userId,
      accountId: String(account._id),
      accountType: account.type,
      ...partnerFields,
      quoteId: String(quote._id),
      idempotencyKey: input.idempotencyKey,
      status: "awaiting_payment" as const,
      statusHistory: [{ status: "awaiting_payment" as const, at: now, by: userId }],
      shipper: { ...input.shipper, countryCode: "CA" },
      recipient: input.recipient,
      parcels: quote.request.parcels,
      items: input.items,
      declaredValueCents: quote.request.declaredValueCents,
      contentDescription: input.contentDescription || defaultContentDescription(input.items),
      plannedShipDate: quote.request.plannedShipDate,
      pickupRequested: quote.request.pickupRequested,
      dutiesPayer: input.dutiesPayer,
      totalCents: quote.pricing.client.totalCents,
      ...(method === "invoice" ? { billing: { mode: "invoice" as const, chargeCents: quote.pricing.client.totalCents, creditedCents: 0 } } : {}),
      currency: "CAD" as const,
      termsAccepted: { version: currentTerms.version, acceptedAt: now },
    };

    let created;
    for (let attempt = 0; attempt < 3 && !created; attempt++) {
      try {
        created = await ExpressShipment.create({ ...base, reference: generateReference(now) });
      } catch (error: any) {
        if (error?.code !== 11000) throw error;
        const key = Object.keys(error.keyPattern || {})[0] || "";
        if (key === "reference") continue; // reference collision: try a new one
        // A parallel request with the same key won the race: return its booking.
        const winner = await ExpressShipment.findOne({ userId, idempotencyKey: input.idempotencyKey }).lean();
        if (winner) return NextResponse.json({ success: true, replayed: true, shipment: toClientShipmentDTO(winner as any) }, { status: 200 });
        return NextResponse.json({ error: "This quote has already been booked.", code: "quote_used" }, { status: 409 });
      }
    }
    if (!created) throw new Error("Could not allocate a unique shipment reference");

    // On credit: check the limit again with this booking counted, then start the label.
    if (method === "invoice") {
      const result = await authorizeOnAccount(String(created._id), account);
      if (!result.ok) {
        const status = result.code === "credit_exceeded" ? 402 : 409;
        return NextResponse.json({ error: result.message, code: result.code }, { status });
      }
      const fresh = await ExpressShipment.findById(created._id).lean();
      return NextResponse.json(
        { success: true, replayed: false, shipment: toClientShipmentDTO((fresh ?? created.toObject()) as any), quote: toClientQuoteDTO(quote as any) },
        { status: 201 }
      );
    }

    await notifyUser({
      userId,
      title: `Express booking ${created.reference} received`,
      titleFr: `Réservation Express ${created.reference} reçue`,
      desc: "Your booking is saved and waiting for payment.",
      descFr: "Votre réservation est enregistrée et en attente de paiement.",
      category: "transit",
      link: `/express/shipments/${created._id}`,
    });

    return NextResponse.json(
      {
        success: true,
        replayed: false,
        shipment: toClientShipmentDTO(created.toObject() as any),
        quote: toClientQuoteDTO(quote as any),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Express booking error:", error);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}

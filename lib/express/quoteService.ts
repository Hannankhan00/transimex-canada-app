import type { CarrierAdapter } from "@/lib/shipping/core/adapter";
import { CarrierError } from "@/lib/shipping/core/errors";
import type { RateOption } from "@/lib/shipping/core/types";
import { PricingError, priceShipment, type MarkupInput, type PriceBreakdown } from "./pricing";
import type { QuoteRequestInput } from "./quoteSchemas";
import type { ExpressPricingSettings } from "./settings";
import { DEFAULT_DOCUMENT_MAX_KG, productCodeFor, type ContentType } from "./contentType";

/** How long a saved quote can be used to book. */
export const QUOTE_TTL_MINUTES = 60;

export type QuoteErrorCode = "not_serviced" | "carrier_unavailable" | "pricing_unavailable" | "invalid_account" | "documents_too_heavy" | "documents_unavailable";

export class QuoteError extends Error {
  constructor(
    readonly code: QuoteErrorCode,
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "QuoteError";
  }
}

export interface NormalizedQuoteRequest {
  origin: { countryCode: string; postalCode: string; city: string };
  destination: { countryCode: string; postalCode: string; city: string };
  parcels: QuoteRequestInput["parcels"];
  contentType: ContentType;
  declaredValueCents: number;
  isCustomsDeclarable: boolean;
  pickupRequested: boolean;
  plannedShipDate: string;
}

export interface PricedRequest {
  option: RateOption;
  breakdown: PriceBreakdown;
  request: NormalizedQuoteRequest;
}

const tomorrow = (now: Date) => new Date(now.getTime() + 86_400_000).toISOString().slice(0, 10);

export function normalizeRequest(input: QuoteRequestInput, now: Date = new Date()): NormalizedQuoteRequest {
  // Documents have no commercial value and need no customs declaration, whatever else was sent.
  const documents = input.contentType === "documents";
  return {
    origin: { countryCode: input.origin.countryCode, postalCode: input.origin.postalCode, city: input.origin.city },
    destination: { ...input.destination },
    parcels: input.parcels,
    contentType: documents ? "documents" : "goods",
    declaredValueCents: documents ? 0 : input.declaredValueCents,
    isCustomsDeclarable: !documents,
    pickupRequested: input.pickupRequested,
    plannedShipDate: input.plannedShipDate ?? tomorrow(now),
  };
}

/**
 * Checks the destination, fetches rates through the carrier adapter and prices
 * the cheapest service. No database access: callers supply the discount and
 * settings, so this is reusable by the client quote route and the staff simulator.
 */
export async function priceRequest(params: {
  input: QuoteRequestInput;
  adapter: CarrierAdapter;
  clientDiscountPct: number;
  settings: Pick<ExpressPricingSettings, "dhlContractDiscountPct"> & { documentMaxWeightKg?: number };
  markup?: MarkupInput | null;
  now?: Date;
}): Promise<PricedRequest> {
  const request = normalizeRequest(params.input, params.now);

  if (request.contentType === "documents") {
    const limit = params.settings.documentMaxWeightKg ?? DEFAULT_DOCUMENT_MAX_KG;
    const weight = request.parcels.reduce((sum, p) => sum + p.weightKg, 0);
    if (weight > limit + 0.001) {
      throw new QuoteError("documents_too_heavy", `Documents can weigh at most ${limit} kg in total. Choose "Goods" for anything heavier.`, 422);
    }
  }

  let options: RateOption[];
  try {
    // Check the address first so remote-area fees and unserviced places show up before a quote is locked.
    const check = await params.adapter.validateAddress({
      line1: "",
      city: request.destination.city,
      postalCode: request.destination.postalCode,
      countryCode: request.destination.countryCode,
    });
    if (!check.serviceable) {
      throw new QuoteError("not_serviced", "DHL does not serve this destination.", 422);
    }

    options = await params.adapter.getRates({
      origin: request.origin,
      destination: request.destination,
      parcels: request.parcels,
      declaredValueCents: request.declaredValueCents,
      isCustomsDeclarable: request.isCustomsDeclarable,
      plannedShipDate: request.plannedShipDate,
      pickupRequested: request.pickupRequested,
      contentType: request.contentType,
    });
  } catch (error) {
    if (error instanceof QuoteError) throw error;
    if (error instanceof CarrierError) {
      if (error.code === "not_serviced") {
        throw new QuoteError("not_serviced", "DHL does not serve this destination.", 422);
      }
      console.error("[Express] Carrier error while quoting:", error.code, error.detail || error.message);
      throw new QuoteError("carrier_unavailable", "Shipping rates are temporarily unavailable. Please try again shortly.", 503);
    }
    throw error;
  }

  if (options.length === 0) {
    throw new QuoteError("not_serviced", "DHL has no service for this route.", 422);
  }

  // The booking is made on one DHL product (P for goods, D for documents), so only that product can be quoted.
  const wanted = productCodeFor(request.contentType);
  const matching = options.filter((o) => o.serviceCode === wanted);
  if (matching.length === 0) {
    if (request.contentType === "documents") {
      throw new QuoteError("documents_unavailable", "Document shipping is not available for this destination. Book it as goods instead.", 422);
    }
    throw new QuoteError("not_serviced", "DHL has no service for this route.", 422);
  }

  // One quote per request: the cheapest service by what DHL charges us.
  const option = matching.reduce((best, o) => (o.account.totalCents < best.account.totalCents ? o : best));

  // The client discount only applies to shipments to or from Canada, for every kind of account. A shipment between
  // two other countries is priced without it.
  const involvesCanada = request.origin.countryCode.toUpperCase() === "CA" || request.destination.countryCode.toUpperCase() === "CA";

  try {
    const breakdown = priceShipment({
      account: option.account,
      publicList: option.publicList,
      dhlContractDiscountPct: params.settings.dhlContractDiscountPct,
      clientDiscountPct: involvesCanada ? params.clientDiscountPct : 0,
      // The pickup fee is whatever DHL's rate includes (the live API returns none, so pickups are not charged separately).
      pickupFeeCents: request.pickupRequested ? (option.pickupFeeCents ?? 0) : 0,
      markup: params.markup,
    });
    return { option, breakdown: involvesCanada ? breakdown : { ...breakdown, discountWaived: "no_canada" as const }, request };
  } catch (error) {
    if (error instanceof PricingError) {
      console.error("[Express] Pricing error:", error.message);
      throw new QuoteError("pricing_unavailable", "We cannot price this shipment online right now. Please contact us.", 503);
    }
    throw error;
  }
}

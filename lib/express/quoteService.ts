import type { CarrierAdapter } from "@/lib/shipping/core/adapter";
import { CarrierError } from "@/lib/shipping/core/errors";
import type { RateOption } from "@/lib/shipping/core/types";
import { PricingError, priceShipment, type MarkupInput, type PriceBreakdown } from "./pricing";
import type { QuoteRequestInput } from "./quoteSchemas";
import type { ExpressPricingSettings } from "./settings";

/** How long a saved quote can be used to book. */
export const QUOTE_TTL_MINUTES = 60;

export type QuoteErrorCode = "not_serviced" | "carrier_unavailable" | "pricing_unavailable" | "invalid_account";

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
  origin: { countryCode: "CA"; postalCode: string; city: string };
  destination: { countryCode: string; postalCode: string; city: string };
  parcels: QuoteRequestInput["parcels"];
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
  return {
    origin: { countryCode: "CA", postalCode: input.origin.postalCode, city: input.origin.city },
    destination: { ...input.destination },
    parcels: input.parcels,
    declaredValueCents: input.declaredValueCents,
    isCustomsDeclarable: input.isCustomsDeclarable,
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
  settings: Pick<ExpressPricingSettings, "dhlContractDiscountPct" | "pickupFeeCents">;
  markup?: MarkupInput | null;
  now?: Date;
}): Promise<PricedRequest> {
  const request = normalizeRequest(params.input, params.now);

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

  // One quote per request: the cheapest service by what DHL charges us.
  const option = options.reduce((best, o) => (o.account.totalCents < best.account.totalCents ? o : best));

  try {
    const breakdown = priceShipment({
      account: option.account,
      publicList: option.publicList,
      dhlContractDiscountPct: params.settings.dhlContractDiscountPct,
      clientDiscountPct: params.clientDiscountPct,
      pickupFeeCents: request.pickupRequested ? params.settings.pickupFeeCents : 0,
      markup: params.markup,
    });
    return { option, breakdown, request };
  } catch (error) {
    if (error instanceof PricingError) {
      console.error("[Express] Pricing error:", error.message);
      throw new QuoteError("pricing_unavailable", "We cannot price this shipment online right now. Please contact us.", 503);
    }
    throw error;
  }
}

import type { Cents, RatePrice, Surcharge } from "@/lib/shipping/core/types";

/**
 * Express pricing. A PURE function: no database, no network, no clock.
 * All money is integer CAD cents. Percentages are held internally as integer
 * basis points (1% = 100 bp), so rounding is exact and identical every time:
 * round half up, once per derived amount.
 *
 * Three price levels for one shipment:
 *   account  - what DHL charges Transimex                (STAFF ONLY)
 *   client   - DHL public price, base freight discounted (B2C customer, or the B2B partner)
 *   customer - client price plus a partner's markup      (a partner's own customer)
 *
 * The discount applies to base freight only. Surcharges (fuel, remote area...)
 * and the pickup fee pass through at DHL's amount.
 */

export type MarkupInput = { kind: "flat"; cents: Cents } | { kind: "percent"; pct: number };

export interface PricingInput {
  /** What DHL charges Transimex. */
  account: RatePrice;
  /** The DHL public list price, when the carrier API returns one. */
  publicList?: RatePrice;
  /**
   * Transimex's DHL contract discount on base freight (percent, 0 to <100).
   * Used only to rebuild the public base freight when the carrier does not
   * return a public price: public = account / (1 - discount).
   */
  dhlContractDiscountPct?: number | null;
  /** Discount off public base freight: the single B2C setting, or the B2B account's own. */
  clientDiscountPct: number;
  /** Flat fee when DHL pickup is chosen. 0 or omitted for drop-off. Never discounted. */
  pickupFeeCents?: Cents;
  /** A partner's markup, applied on top of the client price. Never negative. */
  markup?: MarkupInput | null;
}

export type PublicPriceSource = "carrier" | "rebuilt_from_account_rate";

export interface PriceBreakdown {
  publicSource: PublicPriceSource;
  /** Present only when the public price was rebuilt. STAFF ONLY. */
  dhlContractDiscountPct: number | null;

  /** STAFF ONLY. */
  account: RatePrice;
  publicList: RatePrice;

  clientDiscountPct: number;
  discountCents: Cents;

  /** Surcharges plus the pickup fee, as the client sees them. */
  client: RatePrice;
  pickupFeeCents: Cents;

  markupCents: Cents;
  /** Client price plus markup. Equals client.totalCents when there is no markup. */
  customerTotalCents: Cents;

  /** client total minus account total. STAFF ONLY. */
  profitCents: Cents;
  /** True when the client price is below what DHL charges us. STAFF ONLY. */
  belowCost: boolean;
  /**
   * Set when the client's discount was not applied: neither the sender nor the recipient is in Canada, so the
   * Transimex discount does not apply (to B2B and B2C alike).
   */
  discountWaived?: "no_canada";
}

export class PricingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PricingError";
  }
}

const PCT_SCALE = 10_000; // 100% in basis points

function assertCents(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new PricingError(`${label} must be a non-negative whole number of cents (got ${value}).`);
  }
}

function assertPrice(price: RatePrice, label: string): void {
  assertCents(price.baseFreightCents, `${label} base freight`);
  // A surcharge can be negative: a credit DHL gives on the shipment. It must still be a whole number of cents.
  for (const s of price.surcharges) {
    if (!Number.isSafeInteger(s.amountCents)) throw new PricingError(`${label} surcharge ${s.code} must be a whole number of cents (got ${s.amountCents}).`);
  }
  const total = price.surcharges.reduce((sum, s) => sum + s.amountCents, price.baseFreightCents);
  if (total !== price.totalCents) {
    throw new PricingError(`${label} total does not equal base freight plus surcharges.`);
  }
}

/** Converts a percent with at most two decimals to integer basis points. */
function toBasisPoints(pct: number, label: string, maxInclusive: boolean): number {
  if (typeof pct !== "number" || !Number.isFinite(pct)) throw new PricingError(`${label} must be a number.`);
  const bp = Math.round(pct * 100);
  if (Math.abs(bp - pct * 100) > 1e-6) throw new PricingError(`${label} may have at most two decimals.`);
  if (bp < 0) throw new PricingError(`${label} cannot be negative.`);
  if (maxInclusive ? bp > PCT_SCALE : bp >= PCT_SCALE) {
    throw new PricingError(`${label} must be ${maxInclusive ? "at most" : "below"} 100.`);
  }
  return bp;
}

/** Round half up. Inputs are non-negative integers, so this is exact. */
function mulDiv(amount: number, numerator: number, denominator: number): number {
  return Math.floor((amount * numerator * 2 + denominator) / (denominator * 2));
}

function withTotal(baseFreightCents: Cents, surcharges: Surcharge[]): RatePrice {
  return {
    baseFreightCents,
    surcharges,
    totalCents: surcharges.reduce((sum, s) => sum + s.amountCents, baseFreightCents),
  };
}

export function priceShipment(input: PricingInput): PriceBreakdown {
  assertPrice(input.account, "Account rate");
  const clientBp = toBasisPoints(input.clientDiscountPct, "Client discount", true);
  const pickupFeeCents = input.pickupFeeCents ?? 0;
  assertCents(pickupFeeCents, "Pickup fee");

  // 1. Public price: from the carrier if given, otherwise rebuilt from our account rate.
  let publicList: RatePrice;
  let publicSource: PublicPriceSource;
  let contractPct: number | null = null;

  if (input.publicList) {
    assertPrice(input.publicList, "Public price");
    publicList = input.publicList;
    publicSource = "carrier";
  } else {
    if (input.dhlContractDiscountPct == null) {
      throw new PricingError("No public price from DHL and no DHL contract discount set; cannot rebuild the public price.");
    }
    const contractBp = toBasisPoints(input.dhlContractDiscountPct, "DHL contract discount", false);
    // public = account / (1 - discount), base freight only; surcharges are the same on both sides.
    const publicBase = mulDiv(input.account.baseFreightCents, PCT_SCALE, PCT_SCALE - contractBp);
    publicList = withTotal(publicBase, input.account.surcharges);
    publicSource = "rebuilt_from_account_rate";
    contractPct = input.dhlContractDiscountPct;
  }

  // 2. Client price: discount on base freight only; surcharges and pickup pass through.
  const discountCents = mulDiv(publicList.baseFreightCents, clientBp, PCT_SCALE);
  const clientBase = publicList.baseFreightCents - discountCents;
  const clientSurcharges: Surcharge[] = [
    ...publicList.surcharges,
    ...(pickupFeeCents > 0 ? [{ code: "PICKUP", name: "DHL pickup fee", amountCents: pickupFeeCents }] : []),
  ];
  const client = withTotal(clientBase, clientSurcharges);

  // 3. Partner markup on top of the client price.
  let markupCents = 0;
  if (input.markup) {
    if (input.markup.kind === "flat") {
      assertCents(input.markup.cents, "Markup");
      markupCents = input.markup.cents;
    } else {
      const markupBp = toBasisPoints(input.markup.pct, "Markup", false);
      markupCents = mulDiv(client.totalCents, markupBp, PCT_SCALE);
    }
  }

  // The account rate carries no pickup fee of its own; the fee is passed through, so profit excludes it.
  const profitCents = client.totalCents - pickupFeeCents - input.account.totalCents;

  const result: PriceBreakdown = {
    publicSource,
    dhlContractDiscountPct: contractPct,
    account: input.account,
    publicList,
    clientDiscountPct: input.clientDiscountPct,
    discountCents,
    client,
    pickupFeeCents,
    markupCents,
    customerTotalCents: client.totalCents + markupCents,
    profitCents,
    belowCost: profitCents < 0,
  };

  if (result.client.totalCents < 0 || result.customerTotalCents < 0) {
    throw new PricingError("Computed price is negative.");
  }
  return result;
}

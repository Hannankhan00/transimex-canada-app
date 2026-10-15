import type { Cents, RatePrice, Surcharge } from "./types";

/** Converts a decimal amount from a carrier ("12.34") to integer cents. */
export function toCents(amount: number | string): Cents {
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid money amount: ${String(amount)}`);
  }
  return Math.round(value * 100);
}

/** Integer cents to a decimal number for carrier payloads (never for display). */
export function fromCents(cents: Cents): number {
  if (!Number.isInteger(cents)) {
    throw new Error(`Cents must be an integer, got ${cents}`);
  }
  return cents / 100;
}

export function formatCad(cents: Cents, locale: "en" | "fr" = "en"): string {
  return new Intl.NumberFormat(locale === "fr" ? "fr-CA" : "en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(fromCents(cents));
}

export function buildRatePrice(baseFreightCents: Cents, surcharges: Surcharge[]): RatePrice {
  const surchargeTotal = surcharges.reduce((sum, s) => sum + s.amountCents, 0);
  return {
    baseFreightCents,
    surcharges,
    totalCents: baseFreightCents + surchargeTotal,
  };
}

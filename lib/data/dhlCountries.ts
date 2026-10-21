import { COUNTRIES } from "@/lib/data/countries";

/**
 * Countries and territories with no DHL Express service at all: uninhabited or research territories and North Korea.
 * Everything else comes from the world-countries package. DHL still decides lane by lane: a pair it cannot serve
 * comes back from the rate call as "not serviced" and the client is told.
 */
const NOT_SERVED = new Set(["AQ", "BV", "HM", "TF", "GS", "UM", "KP"]);

/** Every country a shipment can start from or go to, for the Express country dropdowns. */
export const DHL_COUNTRIES = COUNTRIES.filter((c) => !NOT_SERVED.has(c.code));

const CODES: ReadonlySet<string> = new Set(DHL_COUNTRIES.map((c) => c.code));

export function isDhlCountry(code: string): boolean {
  return CODES.has(code.toUpperCase());
}

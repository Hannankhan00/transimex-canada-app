/**
 * Express ships from Canada to Africa. ISO 3166-1 alpha-2 codes of African
 * countries and territories. DHL decides which of these it actually serves; an
 * unserviced destination comes back from the carrier as "not serviced".
 */
export const AFRICAN_COUNTRY_CODES: ReadonlySet<string> = new Set([
  "DZ", "AO", "BJ", "BW", "BF", "BI", "CV", "CM", "CF", "TD", "KM", "CG", "CD", "CI", "DJ", "EG", "GQ", "ER", "SZ", "ET",
  "GA", "GM", "GH", "GN", "GW", "KE", "LS", "LR", "LY", "MG", "MW", "ML", "MR", "MU", "YT", "MA", "MZ", "NA", "NE", "NG",
  "RE", "RW", "SH", "ST", "SN", "SC", "SL", "SO", "ZA", "SS", "SD", "TZ", "TG", "TN", "UG", "EH", "ZM", "ZW",
]);

export function isAfricanCountry(code: string): boolean {
  return AFRICAN_COUNTRY_CODES.has(code.toUpperCase());
}

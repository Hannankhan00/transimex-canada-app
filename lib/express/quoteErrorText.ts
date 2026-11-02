/** Maps a quote error code from the server to the client's own-language sentence. Unknown codes use the fallback. */
export function quoteErrorText(code: string | undefined, b: Record<string, string>, fallback: string): string {
  switch (code) {
    case "not_serviced":
      return b.errNotServiced;
    case "bad_postal_code":
      return b.errBadPostal;
    case "bad_city":
      return b.errBadCity;
    case "parcel_limits":
      return b.errParcelLimits;
    case "date_unavailable":
      return b.errDate;
    case "customs_info":
      return b.errCustoms;
    case "quote_rejected":
      return b.errRejected;
    case "carrier_unavailable":
      return b.errCarrierDown;
    case "rate_limited":
      return b.errRateLimited;
    default:
      return fallback;
  }
}

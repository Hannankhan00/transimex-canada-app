/**
 * Turns what DHL answered into a reason a client can understand. DHL's own text (for example
 * "996: The requested product(s) not available for the requested postal location") is for logs and staff only;
 * a client gets one of these plain kinds, which the screens show in their language.
 *
 * DHL's guidance (2026-10-31): an unavailable product or service on a lane is a normal, expected answer, not a
 * fault, so it is explained as "DHL does not offer this here" rather than "something went wrong".
 */
import type { CarrierError } from "@/lib/shipping/core/errors";

export type CarrierProblem =
  /** DHL has no Express service for this route, date or kind of shipment. */
  | "route_unavailable"
  | "bad_postal_code"
  | "bad_city"
  /** The parcel is heavier or larger than DHL accepts. */
  | "parcel_limits"
  | "date_unavailable"
  /** Declared value, customs or HS code details DHL refused. */
  | "customs_info"
  /** DHL is busy or slow: trying again shortly is the right advice. */
  | "try_again"
  /** Our own setup with DHL (credentials, account rights). Not the client's doing and not fixable by them. */
  | "our_setup"
  /** DHL refused the request and nothing in its answer says why. */
  | "rejected";

const has = (text: string, re: RegExp) => re.test(text);

/** Classifies a DHL error from its HTTP status, our error code and DHL's raw answer. */
export function classifyCarrierError(error: Pick<CarrierError, "code" | "status" | "detail" | "message">): CarrierProblem {
  const text = `${error.detail ?? ""} ${error.message ?? ""}`.toLowerCase();

  if (error.code === "timeout" || error.code === "unavailable" || error.code === "rate_limited") return "try_again";
  if (error.code === "auth" || error.code === "config") return "our_setup";

  // Our account's rights at DHL: import not enabled (8009), service not authorised (8032), no billing address (202401).
  if (has(text, /\b(8009|8032|202401)\b|not imp(ort)? enabled|not authori[sz]ed|billing address/)) return "our_setup";

  // "996 ... not available for the requested pickup date": the day itself is the problem (a weekend or holiday).
  if (has(text, /requested (pickup|ship\w*) date|pickup date/)) return "date_unavailable";

  // The lane, date or product is not offered: 996, 1001, 410137, 7008 and their wording.
  if (error.code === "not_serviced" || has(text, /\b(996|1001|410135|410137)\b|not available for the requested|product\(s\) not available|filtered out|no (products?|services?) (found|available)|not serviced|cannot be delivered|does not serve/)) {
    return "route_unavailable";
  }

  if (has(text, /postal ?code|post ?code|zip/)) return "bad_postal_code";
  if (has(text, /\bcity\b|city ?name/)) return "bad_city";
  if (has(text, /planned ?shipping ?date|ship(ping)? date|holiday|in the past/)) return "date_unavailable";
  if (has(text, /weight|dimension|\blength\b|\bwidth\b|\bheight\b|too (heavy|large|big)|exceeds?|maximum (size|weight)/)) return "parcel_limits";
  if (has(text, /declared ?value|customs|hs ?code|commodity|tariff|invoice/)) return "customs_info";

  return error.code === "rejected" ? "rejected" : "try_again";
}

/** Which QuoteError code each problem becomes, and the HTTP status the quote route answers with. */
export const QUOTE_PROBLEM: Record<CarrierProblem, { code: string; status: number; message: string }> = {
  route_unavailable: { code: "not_serviced", status: 422, message: "DHL Express does not offer this service between these places on this date." },
  bad_postal_code: { code: "bad_postal_code", status: 422, message: "DHL does not recognise a postal code. Please check the sender and recipient postal codes." },
  bad_city: { code: "bad_city", status: 422, message: "DHL does not recognise a city. Please check the sender and recipient cities." },
  parcel_limits: { code: "parcel_limits", status: 422, message: "DHL cannot take a parcel of this weight or size on this route." },
  date_unavailable: { code: "date_unavailable", status: 422, message: "DHL cannot ship on this date. Please choose another date." },
  customs_info: { code: "customs_info", status: 422, message: "DHL refused the declared value or customs details. Please check them." },
  try_again: { code: "carrier_unavailable", status: 503, message: "DHL is not answering right now. Please try again in a few minutes." },
  our_setup: { code: "carrier_unavailable", status: 503, message: "We cannot get a price for this shipment right now. Our team has been alerted. Please try again later." },
  rejected: { code: "quote_rejected", status: 422, message: "DHL could not price this shipment with these details. Please check the addresses and parcel." },
};

/**
 * What to tell a client whose PAID booking could not get its DHL label. The booking is safe and staff are on it, so the
 * message says what happened to their money and what happens next, and never shows DHL's own words.
 */
export type LabelIssueKind = "pickup" | "address" | "customs" | "other";

export function classifyLabelIssue(lastError: string | undefined, pickupRequested: boolean): LabelIssueKind {
  const text = (lastError ?? "").toLowerCase();
  if (has(text, /\b202401\b|pickup|billing address/) || (pickupRequested && has(text, /\bpick/))) return "pickup";
  if (has(text, /postal ?code|city|address|consignee|recipient/)) return "address";
  if (has(text, /declared ?value|customs|hs ?code|commodity|invoice|description/)) return "customs";
  return "other";
}

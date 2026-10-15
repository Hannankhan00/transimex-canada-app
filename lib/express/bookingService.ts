import { randomBytes } from "node:crypto";
import type { BookingInput } from "./shipmentSchemas";
import type { IExpressQuote } from "@/models/ExpressQuote";

export interface BookingIssue {
  path: string;
  message: string;
}

const normalizePostal = (value: string) => value.toUpperCase().replace(/[\s-]/g, "");

/** Total customs value of the items, in cents. */
export function itemsTotalCents(items: BookingInput["items"]): number {
  return items.reduce((sum, i) => sum + i.quantity * i.unitValueCents, 0);
}

/**
 * Checks a booking against the saved quote it is priced from. The price was
 * calculated for one route, parcel set and declared value; the booking must
 * describe the same shipment, otherwise the customer would pay for a different one.
 */
export function checkBookingAgainstQuote(
  input: BookingInput,
  quote: Pick<IExpressQuote, "request" | "expiresAt">,
  now: Date = new Date()
): BookingIssue[] {
  const issues: BookingIssue[] = [];
  const q = quote.request;

  if (new Date(quote.expiresAt).getTime() <= now.getTime()) {
    issues.push({ path: "quoteId", message: "This quote has expired. Please get a new price." });
  }

  if (input.recipient.countryCode !== q.destination.countryCode.toUpperCase()) {
    issues.push({ path: "recipient.countryCode", message: "The destination country must match the quote." });
  }
  if (normalizePostal(input.recipient.postalCode) !== normalizePostal(q.destination.postalCode)) {
    issues.push({ path: "recipient.postalCode", message: "The destination postal code must match the quote." });
  }
  if (normalizePostal(input.shipper.postalCode) !== normalizePostal(q.origin.postalCode)) {
    issues.push({ path: "shipper.postalCode", message: "The pickup postal code must match the quote." });
  }

  const total = itemsTotalCents(input.items);
  if (total !== q.declaredValueCents) {
    issues.push({ path: "items", message: "The customs item values must add up to the declared value used for the quote." });
  }

  const parcelWeight = q.parcels.reduce((sum, p) => sum + p.weightKg, 0);
  const itemWeight = input.items.reduce((sum, i) => sum + i.netWeightKg * i.quantity, 0);
  if (itemWeight > parcelWeight + 0.001) {
    issues.push({ path: "items", message: "The items weigh more than the parcels in the quote." });
  }

  return issues;
}

export function defaultContentDescription(items: BookingInput["items"]): string {
  const unique = Array.from(new Set(items.map((i) => i.description)));
  return unique.join(", ").slice(0, 200);
}

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L

/** Human-readable reference such as EX-261015-K7QZ4. */
export function generateReference(now: Date = new Date()): string {
  const yy = String(now.getUTCFullYear()).slice(2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const bytes = randomBytes(5);
  const suffix = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
  return `EX-${yy}${mm}${dd}-${suffix}`;
}

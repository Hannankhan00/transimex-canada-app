import { CarrierCode } from "./schema";

/**
 * Owner-prefix (first 4 characters of a container number) -> carrier.
 * Not exhaustive — carriers occasionally use additional owner codes (e.g. via
 * acquired lines) that aren't listed here. This is a FALLBACK only; the
 * explicit carrier captured at booking time always wins when present (see
 * DOCs/container tracking.docx §5.1 — this matters most for edge cases on
 * the Matadi/Kinshasa river-port leg).
 */
const PREFIX_TO_CARRIER: Record<string, CarrierCode> = {
  MAEU: "MAERSK",
  MAEI: "MAERSK",
  MSCU: "MSC",
  MEDU: "MSC",
  CMAU: "CMA_CGM",
  CGMU: "CMA_CGM",
};

export type CarrierDetectionResult =
  | { carrier: CarrierCode; source: "explicit" | "prefix" }
  | { carrier: null; source: "unknown" };

/**
 * Resolves which carrier a container belongs to. The explicit carrier
 * (captured at booking time and stored on the shipment/container record) is
 * always preferred; the owner-prefix lookup is only a fallback for containers
 * with no explicit carrier on file yet.
 */
export function detectCarrier(
  containerNumber: string,
  explicitCarrier?: CarrierCode | null
): CarrierDetectionResult {
  if (explicitCarrier) {
    return { carrier: explicitCarrier, source: "explicit" };
  }

  const prefix = containerNumber.trim().toUpperCase().slice(0, 4);
  const carrier = PREFIX_TO_CARRIER[prefix];
  if (carrier) {
    return { carrier, source: "prefix" };
  }
  return { carrier: null, source: "unknown" };
}

/** ISO 6346 owner prefix for a container number, uppercased (no validity check beyond length/shape). */
export function ownerPrefix(containerNumber: string): string {
  return containerNumber.trim().toUpperCase().slice(0, 4);
}

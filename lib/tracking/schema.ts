/**
 * Carrier-agnostic internal tracking schema, modeled on the DCSA Track & Trace
 * standard (the standard Maersk's own API already speaks — see DOCs/container
 * tracking.docx). Every part of the app (DB, API responses, UI) reads/writes
 * ONLY this shape. A carrier's raw response never reaches the DB or UI directly
 * — each adapter in `lib/tracking/adapters/` is responsible for mapping its
 * carrier's real field names into this shape before anything else sees it.
 */

export type CarrierCode = "MAERSK" | "CMA_CGM" | "MSC";

export const CARRIER_CODES: CarrierCode[] = ["MAERSK", "CMA_CGM", "MSC"];

export const CARRIER_LABELS: Record<CarrierCode, string> = {
  MAERSK: "Maersk",
  CMA_CGM: "CMA CGM",
  MSC: "MSC",
};

/** ISO 6346 container size/type code, e.g. "22G1" (20ft general purpose), "42G1" (40ft). */
export type ContainerSizeType = string;

/** The DCSA milestones this system tracks, booking through delivery. */
export type TrackingEventType =
  | "BOOKING"
  | "GATE_IN"
  | "LOADED"
  | "VESSEL_DEPARTURE"
  | "TRANSSHIPMENT"
  | "DISCHARGE"
  | "GATE_OUT"
  | "DELIVERED";

export const TRACKING_EVENT_ORDER: TrackingEventType[] = [
  "BOOKING",
  "GATE_IN",
  "LOADED",
  "VESSEL_DEPARTURE",
  "TRANSSHIPMENT",
  "DISCHARGE",
  "GATE_OUT",
  "DELIVERED",
];

/** DCSA event classifier: planned, estimated, or actual. */
export type EventClassifier = "PLN" | "EST" | "ACT";

export interface TrackingLocation {
  unLocationCode: string; // UN/LOCODE, e.g. "CAMTR", "CIABJ", "CDMAT"
  portName: string;
  facility?: string;
}

export interface TrackingEvent {
  eventType: TrackingEventType;
  eventClassifierCode: EventClassifier;
  /** The single timestamp this row represents (ISO 8601 UTC) — actual if known, else estimated. */
  eventDateTime: string;
  /** Kept separately when the carrier reports both an estimate and an actual for the same milestone. */
  estimatedDateTime?: string;
  actualDateTime?: string;
  location: TrackingLocation;
  vesselName?: string;
  voyageNumber?: string;
  description?: string;
}

export type PortCallRole = "ORIGIN" | "TRANSSHIPMENT" | "DESTINATION";

export interface PortCall {
  sequence: number;
  role: PortCallRole;
  unLocationCode: string;
  portName: string;
  facility?: string;
  vesselName?: string;
  voyageNumber?: string;
}

export type ContainerTrackingStatus = "PENDING" | "IN_TRANSIT" | "DELIVERED";

/** One raw carrier payload, kept as-is for debugging — never read by the UI. */
export interface RawCarrierResponse {
  carrier: CarrierCode;
  fetchedAt: string;
  payload: unknown;
}

/** The canonical internal record — what the DB stores and the API/UI read. */
export interface ContainerTracking {
  containerNumber: string;
  containerSizeType?: ContainerSizeType;
  containerSizeLabel?: string;
  blNumber?: string;
  bookingNumber?: string;
  carrier: CarrierCode;
  /** Whether the carrier was resolved from an explicit field on the shipment, or guessed from the container prefix. */
  carrierDetectionSource: "explicit" | "prefix";
  vesselName?: string;
  imoNumber?: string;
  voyageNumber?: string;
  originPort?: TrackingLocation;
  destinationPort?: TrackingLocation;
  portRotation: PortCall[];
  events: TrackingEvent[];
  status: ContainerTrackingStatus;
  lastSyncedAt: string | null;
  raw: RawCarrierResponse[];
}

/** What an adapter hands back — normalized tracking data plus the untouched raw payload for debugging. */
export interface AdapterFetchResult {
  tracking: Omit<ContainerTracking, "carrierDetectionSource" | "lastSyncedAt" | "raw">;
  rawPayload: unknown;
}

/** Derives status from the normalized events — the single source of truth used by sync + UI. */
export function deriveStatus(events: TrackingEvent[]): ContainerTrackingStatus {
  if (events.some((e) => e.eventType === "DELIVERED" && e.eventClassifierCode === "ACT")) {
    return "DELIVERED";
  }
  if (events.some((e) => e.eventClassifierCode === "ACT")) {
    return "IN_TRANSIT";
  }
  return "PENDING";
}

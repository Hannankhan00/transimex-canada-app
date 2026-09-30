import {
  AdapterFetchResult,
  EventClassifier,
  PortCall,
  ReferenceFetchResult,
  TRACKING_EVENT_ORDER,
  TrackingEvent,
  TrackingEventType,
  TrackingLocation,
} from "../schema";
import { getCarrierConfig, getCmaCgmAuthConfig, CarrierConfig } from "../config";
import { acquireRateLimit } from "../rateLimiter";
import { CmaCgmEvent, CmaCgmRawPayload, CmaCgmTransportCall } from "./payloads";
import { AdapterNotConfiguredError, CarrierAdapter, InvalidPayloadError } from "./types";

// CMA CGM Track & Trace speaks DCSA T&T 2.2.0 (OpenAPI "operation.trackandtrace.v1").
// Its response is a flat list of TRANSPORT (ARRI/DEPA per vessel call) and
// EQUIPMENT (GTOT/GTIN/LOAD/DISC/STRP/... per container) events. DCSA codes
// alone don't say *where in the journey* an event happened — a LOAD can be at
// the port of loading or at a transshipment port — so each event is first
// placed on a journey side (below), then mapped to our internal milestone.

const API_PATH = "/operation/trackandtrace/v1";
const PAGE_LIMIT = 100;
const MAX_PAGES = 10;

/** Where on the journey an event sits: before POL, at POL, at a transshipment port, at POD, or after POD. */
type Side = "EXPORT" | "POL" | "PTS" | "POD" | "IMPORT";

const LOCATION_TYPE_TO_SIDE: Record<string, Side> = {
  DEPOT: "EXPORT",
  COL: "EXPORT",
  ABP_EXP: "EXPORT",
  POL: "POL",
  PTS: "PTS",
  POD: "POD",
  ABP_IMP: "IMPORT",
  DEL: "IMPORT",
};

const CLASSIFIER_RANK: Record<EventClassifier, number> = { ACT: 3, EST: 2, PLN: 1 };

interface MappedEvent {
  eventType: TrackingEventType;
  /** Milestones sharing a dedupe key collapse into one timeline row (e.g. ARRI + DISC at POD). */
  subKey?: string;
  /** Tie-breaker within a key when classifiers match — the more specific source wins. */
  priority: number;
  description: string;
}

function locationCode(e: CmaCgmEvent): string {
  return (
    e.transportCall?.UNLocationCode ||
    e.eventLocation?.UNLocationCode ||
    e.transportCall?.location?.UNLocationCode ||
    ""
  ).toUpperCase();
}

function toLocation(e: CmaCgmEvent): TrackingLocation {
  const tc = e.transportCall;
  const code = locationCode(e);
  return {
    unLocationCode: code,
    portName:
      e.eventLocation?.locationName ||
      tc?.location?.locationName ||
      e.eventLocation?.address?.city ||
      tc?.location?.address?.city ||
      code,
    facility: tc?.otherFacility || tc?.facilityCode || undefined,
  };
}

function isVesselCall(e: CmaCgmEvent): boolean {
  return !e.transportCall || e.transportCall.modeOfTransport === "VESSEL";
}

function voyageOf(tc?: CmaCgmTransportCall): string | undefined {
  return tc?.exportVoyageNumber || tc?.carrierVoyageNumber || tc?.importVoyageNumber || undefined;
}

function eventTime(e: CmaCgmEvent): string {
  return e.eventDateTime || e.eventCreatedDateTime;
}

/** ISO 8601 with any offset -> ISO 8601 UTC, matching the internal schema. */
function toUtc(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toISOString();
}

function byTime(a: CmaCgmEvent, b: CmaCgmEvent): number {
  return new Date(eventTime(a)).getTime() - new Date(eventTime(b)).getTime();
}

/**
 * POL/POD UN/LOCODEs. CMA CGM tags most events with carrierSpecificData.shipmentLocationType;
 * when it doesn't, fall back to the first vessel load/departure and the last vessel discharge/arrival.
 */
function derivePorts(events: CmaCgmEvent[]): { pol: string; pod: string } {
  const tagged = (type: string) =>
    events.find((e) => e.carrierSpecificData?.shipmentLocationType?.toUpperCase() === type && locationCode(e));

  const vesselMoves = events.filter((e) => isVesselCall(e) && locationCode(e)).sort(byTime);
  const departures = vesselMoves.filter(
    (e) => e.equipmentEventTypeCode === "LOAD" || e.transportEventTypeCode === "DEPA"
  );
  const arrivals = vesselMoves.filter(
    (e) => e.equipmentEventTypeCode === "DISC" || e.transportEventTypeCode === "ARRI"
  );

  const polEvent = tagged("POL") ?? departures[0];
  const podEvent = tagged("POD") ?? arrivals[arrivals.length - 1];
  return { pol: polEvent ? locationCode(polEvent) : "", pod: podEvent ? locationCode(podEvent) : "" };
}

function sideOf(e: CmaCgmEvent, pol: string, pod: string): Side | null {
  const tagged = LOCATION_TYPE_TO_SIDE[e.carrierSpecificData?.shipmentLocationType?.toUpperCase() ?? ""];
  if (tagged) return tagged;

  const code = locationCode(e);
  if (code && code === pol) return "POL";
  if (code && code === pod) return "POD";

  const phase = e.carrierSpecificData?.transportationPhase?.toLowerCase();
  if (phase === "export") return "EXPORT";
  if (phase === "transshipment") return "PTS";
  if (phase === "import") return "IMPORT";

  if (code && pol && pod && e.transportCall?.modeOfTransport === "VESSEL") return "PTS";
  return null;
}

function mapEvent(e: CmaCgmEvent, side: Side | null): MappedEvent | null {
  const exportSide = side === "EXPORT" || side === "POL";
  const importSide = side === "POD" || side === "IMPORT";
  const laden = e.emptyIndicatorCode !== "EMPTY";

  if (e.eventType === "SHIPMENT") {
    // Not emitted by CMA CGM yet (per the spec) — handled for when it is.
    if (e.documentTypeCode === "BKG" && e.shipmentEventTypeCode === "CONF") {
      return { eventType: "BOOKING", priority: 2, description: "Booking confirmed" };
    }
    return null;
  }

  if (e.eventType === "TRANSPORT") {
    if (!isVesselCall(e)) return null;
    if (e.transportEventTypeCode === "DEPA") {
      if (side === "POL") return { eventType: "VESSEL_DEPARTURE", priority: 1, description: "Vessel departed" };
      if (side === "PTS")
        return { eventType: "TRANSSHIPMENT", subKey: "DEP", priority: 1, description: "Departed transshipment port" };
    }
    if (e.transportEventTypeCode === "ARRI") {
      if (side === "PTS")
        return { eventType: "TRANSSHIPMENT", subKey: "ARR", priority: 1, description: "Arrived at transshipment port" };
      if (side === "POD") return { eventType: "DISCHARGE", priority: 1, description: "Vessel arrived" };
    }
    return null;
  }

  switch (e.equipmentEventTypeCode) {
    case "GTOT":
      if (!laden && exportSide)
        return { eventType: "BOOKING", priority: 1, description: "Empty container released to shipper" };
      if (laden && importSide) return { eventType: "GATE_OUT", priority: 1, description: "Gated out (full)" };
      return null;
    case "GTIN":
      if (laden && exportSide) return { eventType: "GATE_IN", priority: 1, description: "Gated in (full)" };
      if (!laden && importSide)
        return { eventType: "DELIVERED", priority: 1, description: "Empty container returned" };
      return null;
    case "LOAD":
      if (!isVesselCall(e)) return null;
      if (side === "POL") return { eventType: "LOADED", priority: 1, description: "Loaded on vessel" };
      if (side === "PTS")
        return { eventType: "TRANSSHIPMENT", subKey: "DEP", priority: 2, description: "Loaded at transshipment port" };
      return null;
    case "DISC":
      if (!isVesselCall(e)) return null;
      if (side === "PTS")
        return {
          eventType: "TRANSSHIPMENT",
          subKey: "ARR",
          priority: 2,
          description: "Discharged at transshipment port",
        };
      if (side === "POD") return { eventType: "DISCHARGE", priority: 2, description: "Discharged from vessel" };
      return null;
    case "STRP":
      if (importSide) return { eventType: "DELIVERED", priority: 2, description: "Container stripped" };
      return null;
    case "DROP":
      if (laden && importSide) return { eventType: "DELIVERED", priority: 2, description: "Delivered to consignee" };
      return null;
    default:
      return null;
  }
}

/** Is candidate a better representative of a milestone than current? ACT > EST > PLN, then priority, then newest. */
function outranks(candidate: CmaCgmEvent, cm: MappedEvent, current: CmaCgmEvent, cur: MappedEvent): boolean {
  const cr = CLASSIFIER_RANK[candidate.eventClassifierCode] ?? 0;
  const ur = CLASSIFIER_RANK[current.eventClassifierCode] ?? 0;
  if (cr !== ur) return cr > ur;
  if (cm.priority !== cur.priority) return cm.priority > cur.priority;
  return new Date(candidate.eventCreatedDateTime).getTime() > new Date(current.eventCreatedDateTime).getTime();
}

function docReference(events: CmaCgmEvent[], type: "BKG" | "TRD"): string | undefined {
  for (const e of events) {
    // Spec enum is "BKG (Booking)" / "TRD (Transport Document)"; accept the bare code too.
    const ref = e.documentReferences?.find((r) => r.documentReferenceType?.toUpperCase().startsWith(type));
    // The public connection sends a hashed value (64 hex chars) instead of the real reference — skip it.
    if (ref?.documentReferenceValue && !/^[0-9a-f]{32,}$/i.test(ref.documentReferenceValue)) {
      return ref.documentReferenceValue;
    }
  }
  return undefined;
}

function normalize(raw: CmaCgmRawPayload, requestedReference?: string): AdapterFetchResult["tracking"] {
  if (!Array.isArray(raw)) {
    throw new InvalidPayloadError("CMA_CGM", "events");
  }
  const rawEvents = raw.filter((e) => e && typeof e === "object" && e.eventType && eventTime(e));

  const containerNumber =
    rawEvents.find((e) => e.equipmentReference)?.equipmentReference || requestedReference || "";
  if (!containerNumber) {
    throw new InvalidPayloadError("CMA_CGM", "equipmentReference");
  }

  const { pol, pod } = derivePorts(rawEvents);

  // Collapse every raw event into one row per milestone (+ location), keeping the
  // best-ranked one and remembering the latest estimate alongside an actual.
  const best = new Map<string, { raw: CmaCgmEvent; mapped: MappedEvent; estimate?: CmaCgmEvent }>();
  const placed: { raw: CmaCgmEvent; mapped: MappedEvent; side: Side | null }[] = [];

  for (const e of rawEvents) {
    const side = sideOf(e, pol, pod);
    const mapped = mapEvent(e, side);
    if (!mapped) continue;
    placed.push({ raw: e, mapped, side });

    const key =
      mapped.eventType === "BOOKING" || mapped.eventType === "DELIVERED"
        ? mapped.eventType
        : `${mapped.eventType}|${mapped.subKey ?? ""}|${locationCode(e)}`;
    const entry = best.get(key);
    const isEstimate = e.eventClassifierCode !== "ACT";
    const estimate =
      isEstimate && (!entry?.estimate || new Date(e.eventCreatedDateTime) > new Date(entry.estimate.eventCreatedDateTime))
        ? e
        : entry?.estimate;

    if (!entry || outranks(e, mapped, entry.raw, entry.mapped)) {
      best.set(key, { raw: e, mapped, estimate });
    } else {
      entry.estimate = estimate;
    }
  }

  const events: TrackingEvent[] = [...best.values()]
    .map(({ raw: e, mapped, estimate }): TrackingEvent => {
      const classifier = e.eventClassifierCode as EventClassifier;
      const dateTime = toUtc(eventTime(e));
      return {
        eventType: mapped.eventType,
        eventClassifierCode: classifier,
        eventDateTime: dateTime,
        ...(classifier === "ACT"
          ? { actualDateTime: dateTime, estimatedDateTime: estimate ? toUtc(eventTime(estimate)) : undefined }
          : { estimatedDateTime: dateTime }),
        location: toLocation(e),
        vesselName: e.transportCall?.vessel?.vesselName,
        voyageNumber: voyageOf(e.transportCall),
        description: e.carrierSpecificData?.internalEventLabel || mapped.description,
      };
    })
    .sort((a, b) => {
      const diff = new Date(a.eventDateTime).getTime() - new Date(b.eventDateTime).getTime();
      return diff || TRACKING_EVENT_ORDER.indexOf(a.eventType) - TRACKING_EVENT_ORDER.indexOf(b.eventType);
    });

  // Port rotation: POL, each transshipment port in the order it was reached, POD.
  const vesselAt = (side: Side, code: string, prefer: "DEP" | "ARR") => {
    const calls = placed
      .filter((p) => p.side === side && locationCode(p.raw) === code && p.raw.transportCall?.vessel)
      .sort((a, b) => byTime(a.raw, b.raw));
    const preferred = calls.filter((p) =>
      prefer === "DEP"
        ? p.raw.equipmentEventTypeCode === "LOAD" || p.raw.transportEventTypeCode === "DEPA"
        : p.raw.equipmentEventTypeCode === "DISC" || p.raw.transportEventTypeCode === "ARRI"
    );
    return (preferred[0] ?? calls[0])?.raw.transportCall;
  };
  const locationFor = (code: string) => {
    const e = placed.find((p) => locationCode(p.raw) === code)?.raw ?? rawEvents.find((r) => locationCode(r) === code);
    return e ? toLocation(e) : { unLocationCode: code, portName: code };
  };

  const polCall = pol ? vesselAt("POL", pol, "DEP") : undefined;
  const podCall = pod ? vesselAt("POD", pod, "ARR") : undefined;
  const originPort = pol ? locationFor(pol) : undefined;
  const destinationPort = pod ? locationFor(pod) : undefined;

  const transshipmentCodes = [
    ...new Set(
      placed
        .filter((p) => p.side === "PTS")
        .sort((a, b) => byTime(a.raw, b.raw))
        .map((p) => locationCode(p.raw))
        .filter((c) => c && c !== pol && c !== pod)
    ),
  ];

  const portRotation: PortCall[] = [];
  if (originPort) {
    portRotation.push({
      sequence: 1,
      role: "ORIGIN",
      ...originPort,
      vesselName: polCall?.vessel?.vesselName,
      voyageNumber: voyageOf(polCall),
    });
  }
  for (const code of transshipmentCodes) {
    const tc = vesselAt("PTS", code, "DEP");
    portRotation.push({
      sequence: portRotation.length + 1,
      role: "TRANSSHIPMENT",
      ...locationFor(code),
      vesselName: tc?.vessel?.vesselName,
      voyageNumber: voyageOf(tc),
    });
  }
  if (destinationPort) {
    portRotation.push({
      sequence: portRotation.length + 1,
      role: "DESTINATION",
      ...destinationPort,
      vesselName: podCall?.vessel?.vesselName,
      voyageNumber: voyageOf(podCall),
    });
  }

  const mainCall = polCall ?? rawEvents.find((e) => e.transportCall?.vessel)?.transportCall;

  return {
    containerNumber,
    containerSizeType: rawEvents.find((e) => e.ISOEquipmentCode)?.ISOEquipmentCode,
    blNumber: docReference(rawEvents, "TRD"),
    bookingNumber: docReference(rawEvents, "BKG"),
    carrier: "CMA_CGM",
    vesselName: mainCall?.vessel?.vesselName,
    imoNumber: mainCall?.vessel?.vesselIMONumber,
    voyageNumber: voyageOf(mainCall),
    originPort,
    destinationPort,
    portRotation,
    events,
    status: "PENDING", // recomputed by the pipeline via deriveStatus()
  };
}

// ---- Auth ----

let cachedToken: { value: string; expiresAt: number; clientId: string } | null = null;

/** OAuth2 client-credentials token for the private connection, cached until ~1 min before expiry. */
async function getAccessToken(config: CarrierConfig): Promise<string> {
  if (cachedToken && cachedToken.clientId === config.apiKey && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }
  const { tokenUrl, scope } = getCmaCgmAuthConfig();
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: config.apiKey,
      client_secret: config.apiSecret,
      scope,
    }),
  });
  if (!res.ok) {
    throw new Error(`CMA CGM OAuth token request failed: ${res.status} ${res.statusText}`);
  }
  const body = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!body.access_token) {
    throw new Error("CMA CGM OAuth token response had no access_token.");
  }
  cachedToken = {
    value: body.access_token,
    expiresAt: Date.now() + Math.max((body.expires_in ?? 300) - 60, 30) * 1000,
    clientId: config.apiKey,
  };
  return cachedToken.value;
}

/** Private connection (OAuth2) when a client secret is configured, otherwise the public `keyId` API key. */
async function authHeaders(config: CarrierConfig): Promise<Record<string, string>> {
  if (config.apiSecret) {
    return { Authorization: `Bearer ${await getAccessToken(config)}` };
  }
  return { keyId: config.apiKey };
}

function eventsUrl(baseUrl: string, trackingReference: string): URL {
  const base = baseUrl.replace(/\/+$/, "");
  const root = base.endsWith(API_PATH) ? base : `${base}${API_PATH}`;
  return new URL(`${root}/events/${encodeURIComponent(trackingReference)}`);
}

export const cmaCgmAdapter: CarrierAdapter = {
  carrier: "CMA_CGM",

  // CMA CGM has no push channel — polling only — but the interface requires this.
  // Accepts the same event array the GET /events endpoint returns.
  parseWebhookPayload(payload: unknown): AdapterFetchResult {
    const raw = payload as CmaCgmRawPayload;
    return { tracking: normalize(raw), rawPayload: raw };
  },

  async fetchTracking(containerNumber: string): Promise<AdapterFetchResult> {
    const raw = await fetchEvents(containerNumber);
    return { tracking: normalize(raw, containerNumber), rawPayload: raw };
  },

  // The same endpoint accepts a booking or B/L reference. One call returns the
  // vessel moves for the whole booking plus the events of every container on it.
  async fetchByReference(reference: string): Promise<ReferenceFetchResult> {
    const raw = await fetchEvents(reference);
    if (raw.length === 0) {
      throw new Error(`CMA CGM returned no events for "${reference}". Check the booking or B/L reference.`);
    }
    return splitByContainer(raw, reference);
  },
};

/** Booking-level summary over every event, then one normalized result per container on the booking. */
export function splitByContainer(raw: CmaCgmRawPayload, reference: string): ReferenceFetchResult {
  const booking = { ...normalize(raw, reference), containerNumber: reference };
  booking.containerSizeType = undefined;

  const containerNumbers = [
    ...new Set(raw.map((e) => e.equipmentReference?.trim().toUpperCase()).filter((c): c is string => !!c)),
  ];
  const containers = containerNumbers.map((containerNumber) => {
    // Vessel moves carry no equipment reference and apply to every container on the booking.
    const own = raw.filter(
      (e) => !e.equipmentReference || e.equipmentReference.trim().toUpperCase() === containerNumber
    );
    return { tracking: normalize(own, containerNumber), rawPayload: own };
  });

  return { booking, containers, rawPayload: raw };
}

/** GET /events/{trackingReference} — cursor-paginated via the Next-Page header. */
async function fetchEvents(trackingReference: string): Promise<CmaCgmRawPayload> {
  const config = getCarrierConfig("CMA_CGM");

  if (!config.baseUrl || !config.apiKey) {
    throw new AdapterNotConfiguredError("CMA_CGM");
  }

  const { behalfOf } = getCmaCgmAuthConfig();
  const url = eventsUrl(config.baseUrl, trackingReference);
  url.searchParams.set("limit", String(PAGE_LIMIT));
  if (behalfOf) url.searchParams.set("behalfOf", behalfOf);

  const raw: CmaCgmRawPayload = [];
  let nextUrl: URL | null = url;
  for (let page = 0; nextUrl && page < MAX_PAGES; page++) {
    await acquireRateLimit("CMA_CGM");
    const res: Response = await fetch(nextUrl, {
      headers: { ...(await authHeaders(config)), Accept: "application/json" },
    });

    if (res.status === 401 && config.apiSecret) cachedToken = null;
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        `CMA CGM Track & Trace request failed: ${res.status} ${res.statusText}${detail ? ` — ${detail.slice(0, 300)}` : ""}`
      );
    }
    if (res.status === 204) break;

    const body = (await res.json()) as unknown;
    if (!Array.isArray(body)) throw new InvalidPayloadError("CMA_CGM", "events");
    raw.push(...(body as CmaCgmRawPayload));

    const next = res.headers.get("Next-Page");
    const current = res.headers.get("Current-Page");
    if (!next || next === current || body.length === 0) break;
    if (/^https?:\/\//i.test(next)) {
      nextUrl = new URL(next);
    } else {
      nextUrl = new URL(url);
      nextUrl.searchParams.set("cursor", next);
    }
  }

  return raw;
}

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
import { getCarrierConfig, getMaerskAuthConfig, CarrierConfig } from "../config";
import { acquireRateLimit } from "../rateLimiter";
import {
  MaerskDcsaEvent,
  MaerskLegacyPayload,
  MaerskRawPayload,
  MaerskTransportCall,
} from "./payloads";
import { AdapterNotConfiguredError, CarrierAdapter, InvalidPayloadError } from "./types";

// Maersk Track & Trace Plus / DCSA v2.2 OpenAPI specification ("dcsa_tnt_private" & "ocean_track_trace_public").
// Returns DCSA standard events (EQUIPMENT, TRANSPORT, SHIPMENT) queryable by:
// - equipmentReference (container number)
// - carrierBookingReference (booking number)
// - transportDocumentReference (B/L number)

const PAGE_LIMIT = 100;
const MAX_PAGES = 10;
const ISO_CONTAINER_RE = /^[A-Z]{4}\d{7}$/;

const CLASSIFIER_RANK: Record<EventClassifier, number> = { ACT: 3, EST: 2, PLN: 1 };

type Side = "EXPORT" | "POL" | "PTS" | "POD" | "IMPORT";

interface MappedEvent {
  eventType: TrackingEventType;
  subKey?: string;
  priority: number;
  description: string;
}

// DCSA event code to milestone mapping for legacy and standard payloads
const LEGACY_CODE_TO_TYPE: Record<string, TrackingEventType> = {
  BOOK: "BOOKING",
  GTIN: "GATE_IN",
  LOAD: "LOADED",
  DEPA: "VESSEL_DEPARTURE",
  ARRI: "TRANSSHIPMENT",
  DISC: "DISCHARGE",
  GTOT: "GATE_OUT",
  DLVD: "DELIVERED",
};

let cachedToken: { value: string; expiresAt: number; clientId: string } | null = null;

/** OAuth2 client credentials flow against Maersk Authorization Server. */
async function getAccessToken(config: CarrierConfig): Promise<string> {
  if (cachedToken && cachedToken.clientId === config.apiKey && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }

  const { tokenUrl } = getMaerskAuthConfig();
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Cache-Control": "no-cache",
      "Consumer-Key": config.apiKey,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: config.apiKey,
      client_secret: config.apiSecret,
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    throw new Error(
      `Maersk OAuth token request failed: ${res.status} ${res.statusText}${
        errorBody ? ` — ${errorBody.slice(0, 300)}` : ""
      }`
    );
  }

  const body = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!body.access_token) {
    throw new Error("Maersk OAuth token response had no access_token.");
  }

  // Cache token; expire 2 minutes early for safety
  cachedToken = {
    value: body.access_token,
    expiresAt: Date.now() + Math.max((body.expires_in ?? 7200) - 120, 30) * 1000,
    clientId: config.apiKey,
  };
  return cachedToken.value;
}

/** Prepares request headers: Consumer-Key is mandatory on all calls; Bearer token when secret is configured. */
async function authHeaders(config: CarrierConfig): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Consumer-Key": config.apiKey,
  };
  if (config.apiSecret) {
    const token = await getAccessToken(config);
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

function locationCode(e: MaerskDcsaEvent): string {
  return (
    e.transportCall?.UNLocationCode ||
    e.eventLocation?.UNLocationCode ||
    e.transportCall?.location?.UNLocationCode ||
    ""
  ).toUpperCase();
}

function toLocation(e: MaerskDcsaEvent): TrackingLocation {
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

function isVesselCall(e: MaerskDcsaEvent): boolean {
  return !e.transportCall || !e.transportCall.modeOfTransport || e.transportCall.modeOfTransport === "VESSEL";
}

function voyageOf(tc?: MaerskTransportCall): string | undefined {
  return tc?.exportVoyageNumber || tc?.carrierVoyageNumber || tc?.importVoyageNumber || undefined;
}

function eventTime(e: MaerskDcsaEvent): string {
  return e.eventDateTime || e.eventCreatedDateTime || "";
}

function toUtc(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toISOString();
}

function byTime(a: MaerskDcsaEvent, b: MaerskDcsaEvent): number {
  return new Date(eventTime(a)).getTime() - new Date(eventTime(b)).getTime();
}

function derivePorts(events: MaerskDcsaEvent[]): { pol: string; pod: string } {
  const vesselMoves = events.filter((e) => isVesselCall(e) && locationCode(e)).sort(byTime);
  const departures = vesselMoves.filter(
    (e) => e.equipmentEventTypeCode === "LOAD" || e.transportEventTypeCode === "DEPA"
  );
  const arrivals = vesselMoves.filter(
    (e) => e.equipmentEventTypeCode === "DISC" || e.transportEventTypeCode === "ARRI"
  );

  const polEvent = departures[0];
  const podEvent = arrivals[arrivals.length - 1];
  return { pol: polEvent ? locationCode(polEvent) : "", pod: podEvent ? locationCode(podEvent) : "" };
}

function sideOf(e: MaerskDcsaEvent, pol: string, pod: string): Side | null {
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

function mapEvent(e: MaerskDcsaEvent, side: Side | null): MappedEvent | null {
  const exportSide = side === "EXPORT" || side === "POL";
  const importSide = side === "POD" || side === "IMPORT";
  const laden = e.emptyIndicatorCode !== "EMPTY";

  if (e.eventType === "SHIPMENT") {
    const code = e.shipmentEventTypeCode?.toUpperCase();
    if (code === "BOOK" || code === "RECE" || code === "CONF" || code === "ISSU") {
      return { eventType: "BOOKING", priority: 1, description: "Booking confirmed" };
    }
  }

  if (e.eventType === "EQUIPMENT") {
    switch (e.equipmentEventTypeCode) {
      case "GTOT":
        if (exportSide && !laden) {
          return { eventType: "BOOKING", priority: 1, description: "Empty container released from depot" };
        }
        if (importSide && laden) {
          return { eventType: "GATE_OUT", priority: 8, description: "Gated out of terminal" };
        }
        break;
      case "GTIN":
        if (exportSide && laden) {
          return { eventType: "GATE_IN", priority: 2, description: "Gated in at port of origin" };
        }
        if (importSide && !laden) {
          return { eventType: "DELIVERED", priority: 9, description: "Empty container returned to depot" };
        }
        break;
      case "LOAD":
        if (side === "POL") {
          return { eventType: "LOADED", priority: 3, description: "Loaded onto vessel" };
        }
        if (side === "PTS") {
          return {
            eventType: "TRANSSHIPMENT",
            subKey: "PTS_OUT",
            priority: 6,
            description: "Loaded for onward connection",
          };
        }
        break;
      case "DISC":
        if (side === "PTS") {
          return {
            eventType: "TRANSSHIPMENT",
            subKey: "PTS_IN",
            priority: 5,
            description: "Discharged at transshipment port",
          };
        }
        if (side === "POD") {
          return {
            eventType: "DISCHARGE",
            subKey: "POD_DISC",
            priority: 7,
            description: "Discharged from vessel at destination port",
          };
        }
        break;
      case "STRP":
      case "DROP":
        if (importSide) {
          return { eventType: "DELIVERED", priority: 9, description: "Cargo delivered to consignee" };
        }
        break;
      case "PICK":
      case "STUF":
        if (exportSide) {
          return { eventType: "BOOKING", priority: 1, description: "Container stuffed" };
        }
        break;
    }
  }

  if (e.eventType === "TRANSPORT") {
    switch (e.transportEventTypeCode) {
      case "DEPA":
        if (side === "POL") {
          return { eventType: "VESSEL_DEPARTURE", priority: 4, description: "Vessel departed origin port" };
        }
        if (side === "PTS") {
          return {
            eventType: "TRANSSHIPMENT",
            subKey: "PTS_OUT",
            priority: 6,
            description: "Vessel departed transshipment port",
          };
        }
        break;
      case "ARRI":
        if (side === "PTS") {
          return {
            eventType: "TRANSSHIPMENT",
            subKey: "PTS_IN",
            priority: 5,
            description: "Vessel arrived at transshipment port",
          };
        }
        if (side === "POD") {
          return {
            eventType: "DISCHARGE",
            subKey: "POD_DISC",
            priority: 7,
            description: "Vessel arrived at destination port",
          };
        }
        break;
    }
  }

  // Fallback direct match for common event type codes
  const directCode = e.shipmentEventTypeCode || e.equipmentEventTypeCode || e.transportEventTypeCode;
  if (directCode && LEGACY_CODE_TO_TYPE[directCode]) {
    const et = LEGACY_CODE_TO_TYPE[directCode];
    return { eventType: et, priority: 5, description: `${et} recorded` };
  }

  return null;
}

function normalizeDcsaEvents(rawEvents: MaerskDcsaEvent[], fallbackReference?: string): AdapterFetchResult["tracking"] {
  const eventsWithTime = rawEvents.filter((e) => !!eventTime(e)).sort(byTime);
  const { pol, pod } = derivePorts(eventsWithTime);

  const bestByMilestone = new Map<
    string,
    { event: TrackingEvent; rank: number; priority: number; raw: MaerskDcsaEvent }
  >();

  for (const e of eventsWithTime) {
    const side = sideOf(e, pol, pod);
    const mapped = mapEvent(e, side);
    if (!mapped) continue;

    const loc = locationCode(e);
    const key = mapped.subKey ? `${mapped.eventType}:${mapped.subKey}:${loc}` : `${mapped.eventType}:${loc}`;

    const classifier = (e.eventClassifierCode as EventClassifier) || "ACT";
    const rank = CLASSIFIER_RANK[classifier] ?? 1;
    const existing = bestByMilestone.get(key);

    const tc = e.transportCall;
    const vessel = tc?.vessel;

    if (!existing || rank > existing.rank || (rank === existing.rank && mapped.priority > existing.priority)) {
      const isActual = classifier === "ACT";
      const isoUtc = toUtc(eventTime(e));
      const evt: TrackingEvent = {
        eventType: mapped.eventType,
        eventClassifierCode: classifier,
        eventDateTime: isoUtc,
        actualDateTime: isActual ? isoUtc : undefined,
        estimatedDateTime: !isActual ? isoUtc : undefined,
        location: toLocation(e),
        vesselName: vessel?.vesselName,
        voyageNumber: voyageOf(tc),
        description: mapped.description,
      };

      if (existing?.event.estimatedDateTime && !evt.estimatedDateTime) {
        evt.estimatedDateTime = existing.event.estimatedDateTime;
      }
      bestByMilestone.set(key, { event: evt, rank, priority: mapped.priority, raw: e });
    } else if (existing && (classifier === "EST" || classifier === "PLN")) {
      const candidateTime = toUtc(eventTime(e));
      if (!existing.event.estimatedDateTime || new Date(candidateTime) > new Date(existing.event.estimatedDateTime)) {
        existing.event.estimatedDateTime = candidateTime;
      }
    }
  }

  const events = Array.from(bestByMilestone.values())
    .map((v) => v.event)
    .sort((a, b) => {
      const orderA = TRACKING_EVENT_ORDER.indexOf(a.eventType);
      const orderB = TRACKING_EVENT_ORDER.indexOf(b.eventType);
      if (orderA !== orderB) return orderA - orderB;
      return new Date(a.eventDateTime).getTime() - new Date(b.eventDateTime).getTime();
    });

  // Extract container metadata
  const eqEvent = rawEvents.find((e) => e.equipmentReference);
  const containerNumber = (
    eqEvent?.equipmentReference ||
    (fallbackReference && ISO_CONTAINER_RE.test(fallbackReference.toUpperCase()) ? fallbackReference : "")
  ).toUpperCase();
  const containerSizeType = eqEvent?.ISOEquipmentCode;

  // Extract booking and B/L references
  const docRefs = rawEvents.flatMap((e) => e.documentReferences || []);
  const bookingRef =
    docRefs.find((d) => d.documentReferenceType === "BKG" || d.documentReferenceType === "CBR")
      ?.documentReferenceValue ||
    rawEvents.find((e) => e.carrierBookingReference)?.carrierBookingReference ||
    (fallbackReference && !ISO_CONTAINER_RE.test(fallbackReference) ? fallbackReference : undefined);

  const blRef = docRefs.find(
    (d) => d.documentReferenceType === "TRD" || d.documentReferenceType === "BOL"
  )?.documentReferenceValue;

  // Extract vessel information
  const vesselMoves = eventsWithTime.filter((e) => isVesselCall(e) && e.transportCall?.vessel);
  const polVesselMove = vesselMoves.find((e) => locationCode(e) === pol) || vesselMoves[0];
  const primaryVessel = polVesselMove?.transportCall?.vessel;

  // Extract port rotation
  const portCallsByLoc = new Map<string, PortCall>();
  let sequence = 1;

  for (const e of eventsWithTime) {
    if (!isVesselCall(e)) continue;
    const loc = locationCode(e);
    if (!loc || portCallsByLoc.has(loc)) continue;

    const role: PortCall["role"] = loc === pol ? "ORIGIN" : loc === pod ? "DESTINATION" : "TRANSSHIPMENT";
    const locInfo = toLocation(e);
    const tc = e.transportCall;

    portCallsByLoc.set(loc, {
      sequence: sequence++,
      role,
      unLocationCode: loc,
      portName: locInfo.portName,
      facility: locInfo.facility,
      vesselName: tc?.vessel?.vesselName || primaryVessel?.vesselName,
      voyageNumber: voyageOf(tc),
    });
  }

  const portRotation = Array.from(portCallsByLoc.values()).sort((a, b) => {
    const roleOrder = { ORIGIN: 1, TRANSSHIPMENT: 2, DESTINATION: 3 };
    return roleOrder[a.role] - roleOrder[b.role];
  });

  const originCall = portRotation.find((p) => p.role === "ORIGIN");
  const destCall = portRotation.find((p) => p.role === "DESTINATION");

  return {
    containerNumber,
    containerSizeType,
    blNumber: blRef,
    bookingNumber: bookingRef,
    carrier: "MAERSK",
    vesselName: primaryVessel?.vesselName,
    imoNumber: primaryVessel?.vesselIMONumber ? String(primaryVessel.vesselIMONumber) : undefined,
    voyageNumber: voyageOf(polVesselMove?.transportCall),
    originPort: originCall
      ? { unLocationCode: originCall.unLocationCode, portName: originCall.portName, facility: originCall.facility }
      : pol
      ? { unLocationCode: pol, portName: pol }
      : undefined,
    destinationPort: destCall
      ? { unLocationCode: destCall.unLocationCode, portName: destCall.portName, facility: destCall.facility }
      : pod
      ? { unLocationCode: pod, portName: pod }
      : undefined,
    portRotation,
    events,
    status: "PENDING",
  };
}

function normalizeLegacyPayload(raw: MaerskLegacyPayload): AdapterFetchResult["tracking"] {
  const events: TrackingEvent[] = raw.events
    .map((e: any): TrackingEvent | null => {
      const code = e.shipmentEventTypeCode || e.equipmentEventTypeCode || e.transportEventTypeCode;
      const eventType = LEGACY_CODE_TO_TYPE[code];
      if (!eventType) return null;
      const classifier = e.eventClassifierCode as EventClassifier;
      return {
        eventType,
        eventClassifierCode: classifier,
        eventDateTime: e.eventDateTime,
        [classifier === "ACT" ? "actualDateTime" : "estimatedDateTime"]: e.eventDateTime,
        location: {
          unLocationCode: e.UNLocationCode,
          portName: e.locationName,
          facility: e.facilityName,
        },
        vesselName: e.vesselName,
        voyageNumber: e.carrierVoyageNumber,
      } as TrackingEvent;
    })
    .filter((e): e is TrackingEvent => e !== null);

  const origin = raw.transportPlan.find((p) => p.portCallRole === "ORIGIN");
  const destination = raw.transportPlan.find((p) => p.portCallRole === "DESTINATION");

  return {
    containerNumber: raw.container.equipmentReference,
    containerSizeType: raw.container.ISOEquipmentCode,
    containerSizeLabel: raw.container.equipmentSizeLabel,
    blNumber: raw.shipment.billOfLadingNumber,
    bookingNumber: raw.shipment.carrierBookingReference,
    carrier: "MAERSK",
    vesselName: raw.vessel.vesselName,
    imoNumber: raw.vessel.vesselIMONumber,
    voyageNumber: raw.transportPlan[0]?.carrierVoyageNumber,
    originPort: origin
      ? { unLocationCode: origin.UNLocationCode, portName: origin.locationName, facility: origin.facilityName }
      : undefined,
    destinationPort: destination
      ? {
          unLocationCode: destination.UNLocationCode,
          portName: destination.locationName,
          facility: destination.facilityName,
        }
      : undefined,
    portRotation: raw.transportPlan.map((p) => ({
      sequence: p.sequenceNumber,
      role: p.portCallRole as "ORIGIN" | "TRANSSHIPMENT" | "DESTINATION",
      unLocationCode: p.UNLocationCode,
      portName: p.locationName,
      facility: p.facilityName,
      vesselName: p.vesselName,
      voyageNumber: p.carrierVoyageNumber,
    })),
    events,
    status: "PENDING",
  };
}

export function normalize(raw: MaerskRawPayload, fallbackReference?: string): AdapterFetchResult["tracking"] {
  if (!raw) {
    throw new InvalidPayloadError("MAERSK", "events");
  }

  // Legacy structured payload (used by tests / fixtures)
  if ("container" in raw && "transportPlan" in raw && Array.isArray(raw.events)) {
    return normalizeLegacyPayload(raw as MaerskLegacyPayload);
  }

  // DCSA live response: either raw array of events or { events: [...] }
  if (Array.isArray(raw)) {
    return normalizeDcsaEvents(raw as MaerskDcsaEvent[], fallbackReference);
  }

  if (typeof raw === "object" && "events" in raw && Array.isArray((raw as any).events)) {
    return normalizeDcsaEvents((raw as any).events, fallbackReference);
  }

  throw new InvalidPayloadError("MAERSK", "events");
}

export function splitByContainer(raw: MaerskDcsaEvent[], reference: string): ReferenceFetchResult {
  const booking = { ...normalize(raw, reference), containerNumber: reference };
  booking.containerSizeType = undefined;

  const refNorm = reference.trim().toUpperCase();
  const containerNumbers = [
    ...new Set(
      raw
        .map((e) => e.equipmentReference?.trim().toUpperCase())
        .filter((c): c is string => !!c && c !== refNorm && ISO_CONTAINER_RE.test(c))
    ),
  ];

  const containers = containerNumbers.map((containerNumber) => {
    const own = raw.filter(
      (e) => !e.equipmentReference || e.equipmentReference.trim().toUpperCase() === containerNumber
    );
    return { tracking: normalize(own, containerNumber), rawPayload: own };
  });

  return { booking, containers, rawPayload: raw };
}

/** Construct endpoint URL respecting baseURL prefixes. */
function buildEventsUrl(baseUrl: string, paramKey: string, paramValue: string): URL {
  const base = baseUrl.replace(/\/+$/, "");
  let path = "/track-and-trace-private/events";
  if (base.endsWith("/track-and-trace-private") || base.endsWith("/track-and-trace")) {
    path = "/events";
  } else if (base.endsWith("/events") || base.endsWith("/public-events")) {
    path = "";
  }
  const url = new URL(`${base}${path}`);
  url.searchParams.set(paramKey, paramValue);
  url.searchParams.set("limit", String(PAGE_LIMIT));
  return url;
}

/** Fetch events with pagination and authentication. */
async function fetchEvents(paramKey: string, paramValue: string): Promise<MaerskDcsaEvent[]> {
  const config = getCarrierConfig("MAERSK");

  if (!config.baseUrl || !config.apiKey) {
    throw new AdapterNotConfiguredError("MAERSK");
  }

  const url = buildEventsUrl(config.baseUrl, paramKey, paramValue);
  const raw: MaerskDcsaEvent[] = [];
  let nextUrl: URL | null = url;

  for (let page = 0; nextUrl && page < MAX_PAGES; page++) {
    await acquireRateLimit("MAERSK");
    const headers = await authHeaders(config);

    let res: Response = await fetch(nextUrl, {
      headers: { ...headers, Accept: "application/json" },
    });

    // If 401 and we have secret configured, token may be expired; try once with new token
    if (res.status === 401 && config.apiSecret) {
      cachedToken = null;
      const refreshedHeaders = await authHeaders(config);
      res = await fetch(nextUrl, {
        headers: { ...refreshedHeaders, Accept: "application/json" },
      });
    }

    if (!res.ok) {
      // If 404 on private endpoint, fallback to public endpoint if available
      if (res.status === 404 && nextUrl.pathname.includes("/track-and-trace-private/events")) {
        const publicUrl = new URL(nextUrl.toString().replace("/track-and-trace-private/events", "/track-and-trace/public-events"));
        const pubRes: Response = await fetch(publicUrl, { headers: { "Consumer-Key": config.apiKey, Accept: "application/json" } });
        if (pubRes.ok) {
          const pubBody = (await pubRes.json()) as any;
          const items = Array.isArray(pubBody) ? pubBody : pubBody?.events;
          if (Array.isArray(items)) return items;
        }
      }

      const detail = await res.text().catch(() => "");
      throw new Error(
        `Maersk Track & Trace request failed: ${res.status} ${res.statusText}${
          detail ? ` — ${detail.slice(0, 300)}` : ""
        }`
      );
    }

    if (res.status === 204) break;

    const body = (await res.json()) as unknown;
    const pageEvents = Array.isArray(body)
      ? (body as MaerskDcsaEvent[])
      : Array.isArray((body as any)?.events)
      ? ((body as any).events as MaerskDcsaEvent[])
      : null;

    if (!pageEvents) throw new InvalidPayloadError("MAERSK", "events");
    raw.push(...pageEvents);

    const nextCursor: string | null = res.headers.get("Next-Page");
    const current = res.headers.get("Current-Page");
    if (!nextCursor || nextCursor === current || pageEvents.length === 0) break;

    if (/^https?:\/\//i.test(nextCursor)) {
      nextUrl = new URL(nextCursor);
    } else {
      nextUrl = new URL(url);
      nextUrl.searchParams.set("cursor", nextCursor);
    }
  }

  return raw;
}

export const maerskAdapter: CarrierAdapter = {
  carrier: "MAERSK",

  parseWebhookPayload(payload: unknown): AdapterFetchResult {
    const raw = payload as MaerskRawPayload;
    return { tracking: normalize(raw), rawPayload: raw };
  },

  async fetchTracking(containerNumber: string): Promise<AdapterFetchResult> {
    const raw = await fetchEvents("equipmentReference", containerNumber);
    return { tracking: normalize(raw, containerNumber), rawPayload: raw };
  },

  async fetchByReference(reference: string): Promise<ReferenceFetchResult> {
    let raw = await fetchEvents("carrierBookingReference", reference);
    if (raw.length === 0) {
      raw = await fetchEvents("transportDocumentReference", reference);
    }
    if (raw.length === 0) {
      throw new Error(`Maersk returned no events for "${reference}". Check the booking or B/L reference.`);
    }
    return splitByContainer(raw, reference);
  },

  splitByContainer(raw: any, reference: string): ReferenceFetchResult {
    const events = Array.isArray(raw) ? raw : (raw as any)?.events || [];
    return splitByContainer(events, reference);
  },
};

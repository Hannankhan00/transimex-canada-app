import { AdapterFetchResult, EventClassifier, TrackingEvent, TrackingEventType } from "../schema";
import { getCarrierConfig } from "../config";
import { acquireRateLimit } from "../rateLimiter";
import { buildMscFixture, MscRawPayload } from "./fixtures/msc.fixture";
import { AdapterNotConfiguredError, CarrierAdapter, InvalidPayloadError } from "./types";

// MSC's own milestone codes -> our internal milestone. Confirm against the
// real schema during UAT (see INTEGRATION.md) — this is a representative map.
const MILESTONE_CODE_TO_TYPE: Record<string, TrackingEventType> = {
  BKCF: "BOOKING",
  GTIN: "GATE_IN",
  LOAD: "LOADED",
  VDEP: "VESSEL_DEPARTURE",
  TRSI: "TRANSSHIPMENT",
  TRSO: "TRANSSHIPMENT",
  DISC: "DISCHARGE",
  GTOT: "GATE_OUT",
  DLVR: "DELIVERED",
};

function normalize(raw: MscRawPayload): AdapterFetchResult["tracking"] {
  if (!raw || !Array.isArray(raw.milestones) || !raw.routing?.pol || !raw.routing?.pod || !raw.vessel) {
    throw new InvalidPayloadError("MSC", "milestones");
  }

  // MSC's milestones only carry a location name, not a code — resolve it
  // against the known port rotation (routing.pol/pod/transshipments).
  const portsByName: Record<string, string> = {
    [raw.routing.pol.name]: raw.routing.pol.unLocode,
    [raw.routing.pod.name]: raw.routing.pod.unLocode,
    ...Object.fromEntries((raw.routing.transshipments || []).map((p) => [p.name, p.unLocode])),
  };

  const events: TrackingEvent[] = raw.milestones
    .map((m): TrackingEvent | null => {
      const eventType = MILESTONE_CODE_TO_TYPE[m.milestoneCode];
      if (!eventType) return null;
      const classifier: EventClassifier = m.status === "COMPLETED" ? "ACT" : "EST";
      return {
        eventType,
        eventClassifierCode: classifier,
        eventDateTime: m.eventDateTimeUtc,
        [classifier === "ACT" ? "actualDateTime" : "estimatedDateTime"]: m.eventDateTimeUtc,
        location: { unLocationCode: portsByName[m.location] || "", portName: m.location },
        vesselName: m.vesselName,
        voyageNumber: m.voyageNumber,
        description: m.milestoneName,
      } as TrackingEvent;
    })
    .filter((e): e is TrackingEvent => e !== null);

  const transshipments = (raw.routing.transshipments || []).map((p, i) => ({
    sequence: i + 2,
    role: "TRANSSHIPMENT" as const,
    unLocationCode: p.unLocode,
    portName: p.name,
  }));

  return {
    containerNumber: raw.equipmentNumber,
    containerSizeType: raw.equipmentIsoCode,
    blNumber: raw.billOfLading,
    bookingNumber: raw.bookingReference,
    carrier: "MSC",
    vesselName: raw.vessel.name,
    imoNumber: raw.vessel.imo,
    voyageNumber: raw.voyage,
    originPort: { unLocationCode: raw.routing.pol.unLocode, portName: raw.routing.pol.name },
    destinationPort: { unLocationCode: raw.routing.pod.unLocode, portName: raw.routing.pod.name },
    portRotation: [
      { sequence: 1, role: "ORIGIN", unLocationCode: raw.routing.pol.unLocode, portName: raw.routing.pol.name },
      ...transshipments,
      {
        sequence: transshipments.length + 2,
        role: "DESTINATION",
        unLocationCode: raw.routing.pod.unLocode,
        portName: raw.routing.pod.name,
      },
    ],
    events,
    status: "PENDING",
  };
}

export const mscAdapter: CarrierAdapter = {
  carrier: "MSC",

  parseWebhookPayload(payload: unknown): AdapterFetchResult {
    const raw = payload as MscRawPayload;
    return { tracking: normalize(raw), rawPayload: raw };
  },

  async fetchTracking(containerNumber: string): Promise<AdapterFetchResult> {
    const config = getCarrierConfig("MSC");

    if (config.useMock) {
      const raw = buildMscFixture(containerNumber);
      return { tracking: normalize(raw), rawPayload: raw };
    }

    if (!config.baseUrl || !config.apiKey) {
      throw new AdapterNotConfiguredError("MSC");
    }

    // MSC's cap is fixed at 100k/day + 4/s (see DOCs/container tracking.docx
    // §3.3) — this is the only carrier where the limiter is guaranteed to
    // matter in practice once live.
    await acquireRateLimit("MSC");

    // Track & Trace (Basic integration package) — confirm the exact path
    // during UAT once the Data Sharing Agreement is signed (see INTEGRATION.md).
    const url = `${config.baseUrl}/track-and-trace/v1/equipment/${encodeURIComponent(containerNumber)}`;
    const res = await fetch(url, {
      headers: {
        "x-api-key": config.apiKey,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`MSC Track & Trace request failed: ${res.status} ${res.statusText}`);
    }

    const raw = (await res.json()) as MscRawPayload;
    return { tracking: normalize(raw), rawPayload: raw };
  },
};

import { AdapterFetchResult, EventClassifier, TrackingEvent, TrackingEventType } from "../schema";
import { getCarrierConfig } from "../config";
import { acquireRateLimit } from "../rateLimiter";
import { buildCmaCgmFixture, CmaCgmRawPayload } from "./fixtures/cmacgm.fixture";
import { AdapterNotConfiguredError, CarrierAdapter, InvalidPayloadError } from "./types";

// CMA CGM's own status labels -> our internal milestone. Not DCSA-standardized
// (per DOCs/container tracking.docx §3.2) so this mapping is CMA CGM-specific
// and needs re-verification once partner-tier docs are available.
const STATUS_TO_TYPE: Record<string, TrackingEventType> = {
  "Booking Confirmed": "BOOKING",
  "Gate In at Origin": "GATE_IN",
  "Loaded on Vessel": "LOADED",
  "Vessel Departed": "VESSEL_DEPARTURE",
  "Transshipment Arrival": "TRANSSHIPMENT",
  "Transshipment Departure": "TRANSSHIPMENT",
  "Discharged at Destination": "DISCHARGE",
  "Gate Out from Terminal": "GATE_OUT",
  Delivered: "DELIVERED",
};

/** "Montreal, CA" -> "Montreal". CMA CGM doesn't return a UN/LOCODE in this tier, so we derive a stand-in from the city name. */
function locationCodeFromLabel(label: string): string {
  return label.split(",")[0].trim().slice(0, 5).toUpperCase();
}

function normalize(raw: CmaCgmRawPayload): AdapterFetchResult["tracking"] {
  if (!raw || !Array.isArray(raw.trackingEvents) || !raw.portOfLoading || !raw.portOfDischarge) {
    throw new InvalidPayloadError("CMA_CGM", "trackingEvents");
  }

  const events: TrackingEvent[] = raw.trackingEvents
    .map((e): TrackingEvent | null => {
      const eventType = STATUS_TO_TYPE[e.status];
      if (!eventType) return null;
      const classifier: EventClassifier = e.isEstimate ? "EST" : "ACT";
      return {
        eventType,
        eventClassifierCode: classifier,
        eventDateTime: e.eventDate,
        [classifier === "ACT" ? "actualDateTime" : "estimatedDateTime"]: e.eventDate,
        location: {
          unLocationCode: locationCodeFromLabel(e.location),
          portName: e.location.split(",")[0].trim(),
        },
        vesselName: e.vessel,
        voyageNumber: e.voyage,
        description: e.status,
      } as TrackingEvent;
    })
    .filter((e): e is TrackingEvent => e !== null);

  const transshipments = (raw.transshipmentPorts || []).map((p, i) => ({
    sequence: i + 2,
    role: "TRANSSHIPMENT" as const,
    unLocationCode: p.code,
    portName: p.name,
  }));

  return {
    containerNumber: raw.containerNumber,
    containerSizeType: raw.containerType,
    blNumber: raw.blNumber,
    bookingNumber: raw.bookingNumber,
    carrier: "CMA_CGM",
    vesselName: raw.vesselName,
    voyageNumber: raw.voyageNumber,
    originPort: { unLocationCode: raw.portOfLoading.code, portName: raw.portOfLoading.name },
    destinationPort: { unLocationCode: raw.portOfDischarge.code, portName: raw.portOfDischarge.name },
    portRotation: [
      { sequence: 1, role: "ORIGIN", unLocationCode: raw.portOfLoading.code, portName: raw.portOfLoading.name },
      ...transshipments,
      {
        sequence: transshipments.length + 2,
        role: "DESTINATION",
        unLocationCode: raw.portOfDischarge.code,
        portName: raw.portOfDischarge.name,
      },
    ],
    events,
    status: "PENDING",
  };
}

export const cmaCgmAdapter: CarrierAdapter = {
  carrier: "CMA_CGM",

  parseWebhookPayload(payload: unknown): AdapterFetchResult {
    const raw = payload as CmaCgmRawPayload;
    return { tracking: normalize(raw), rawPayload: raw };
  },

  async fetchTracking(containerNumber: string): Promise<AdapterFetchResult> {
    const config = getCarrierConfig("CMA_CGM");

    if (config.useMock) {
      const raw = buildCmaCgmFixture(containerNumber);
      return { tracking: normalize(raw), rawPayload: raw };
    }

    if (!config.baseUrl || !config.apiKey) {
      throw new AdapterNotConfiguredError("CMA_CGM");
    }

    await acquireRateLimit("CMA_CGM");

    // Two-tier Track & Trace API — confirm the exact path/tier headers with
    // the account team once escalated to partner tier (see INTEGRATION.md).
    const url = `${config.baseUrl}/track-and-trace/v1/containers/${encodeURIComponent(containerNumber)}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`CMA CGM Track & Trace request failed: ${res.status} ${res.statusText}`);
    }

    const raw = (await res.json()) as CmaCgmRawPayload;
    return { tracking: normalize(raw), rawPayload: raw };
  },
};

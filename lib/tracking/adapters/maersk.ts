import { AdapterFetchResult, EventClassifier, TrackingEvent, TrackingEventType } from "../schema";
import { getCarrierConfig } from "../config";
import { acquireRateLimit } from "../rateLimiter";
import { buildMaerskFixture, MaerskRawPayload } from "./fixtures/maersk.fixture";
import { AdapterNotConfiguredError, CarrierAdapter, InvalidPayloadError } from "./types";

// DCSA equipment/transport/shipment event type codes -> our internal milestone.
// Maersk's Track & Trace Plus API reports DCSA v2.2 codes directly (per
// DOCs/container tracking.docx §3.1), so this map is the whole normalization.
const EVENT_CODE_TO_TYPE: Record<string, TrackingEventType> = {
  BOOK: "BOOKING",
  GTIN: "GATE_IN",
  LOAD: "LOADED",
  DEPA: "VESSEL_DEPARTURE",
  ARRI: "TRANSSHIPMENT",
  DISC: "DISCHARGE",
  GTOT: "GATE_OUT",
  DLVD: "DELIVERED",
};

function normalize(raw: MaerskRawPayload): AdapterFetchResult["tracking"] {
  if (
    !raw ||
    !Array.isArray(raw.events) ||
    !raw.container ||
    !raw.shipment ||
    !raw.vessel ||
    !Array.isArray(raw.transportPlan)
  ) {
    throw new InvalidPayloadError("MAERSK", "events");
  }

  const events: TrackingEvent[] = raw.events
    .map((e: any): TrackingEvent | null => {
      const code = e.shipmentEventTypeCode || e.equipmentEventTypeCode || e.transportEventTypeCode;
      const eventType = EVENT_CODE_TO_TYPE[code];
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
    status: "PENDING", // recomputed by the pipeline via deriveStatus()
  };
}

export const maerskAdapter: CarrierAdapter = {
  carrier: "MAERSK",

  parseWebhookPayload(payload: unknown): AdapterFetchResult {
    const raw = payload as MaerskRawPayload;
    return { tracking: normalize(raw), rawPayload: raw };
  },

  async fetchTracking(containerNumber: string): Promise<AdapterFetchResult> {
    const config = getCarrierConfig("MAERSK");

    if (config.useMock) {
      const raw = buildMaerskFixture(containerNumber);
      return { tracking: normalize(raw), rawPayload: raw };
    }

    if (!config.baseUrl || !config.apiKey) {
      throw new AdapterNotConfiguredError("MAERSK");
    }

    await acquireRateLimit("MAERSK");

    // Track & Trace Plus / DCSA v2.2 events endpoint shape — confirm the exact
    // path against the sandbox reference once registered (see INTEGRATION.md).
    const url = `${config.baseUrl}/track-and-trace-private/api/v2/events?equipmentReference=${encodeURIComponent(
      containerNumber
    )}`;
    const res = await fetch(url, {
      headers: {
        "Consumer-Key": config.apiKey,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`Maersk Track & Trace request failed: ${res.status} ${res.statusText}`);
    }

    const raw = (await res.json()) as MaerskRawPayload;
    return { tracking: normalize(raw), rawPayload: raw };
  },
};

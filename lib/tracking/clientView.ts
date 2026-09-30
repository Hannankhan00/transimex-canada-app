import { ContainerTracking, PortCall, TrackingEvent, TrackingLocation } from "./schema";

/**
 * What a client may see of ocean tracking. Transimex is the client's carrier of
 * record, so the ocean line (CMA CGM, Maersk, MSC), its booking / B/L
 * references and its raw responses never leave the admin side. Every
 * client-facing route builds its tracking payload through these functions.
 */

export interface ClientContainerView {
  containerNumber: string;
  containerSizeType?: string;
  containerSizeLabel?: string;
  vesselName?: string;
  imoNumber?: string;
  voyageNumber?: string;
  originPort?: TrackingLocation;
  destinationPort?: TrackingLocation;
  portRotation: PortCall[];
  events: TrackingEvent[];
  status: ContainerTracking["status"];
  lastSyncedAt: string | null;
}

export interface ClientVesselView {
  vesselName?: string;
  imoNumber?: string;
  voyageNumber?: string;
  originPort?: TrackingLocation;
  destinationPort?: TrackingLocation;
  /** Each port on the route with the vessel that carries the cargo from it. */
  legs: {
    role: PortCall["role"];
    portName?: string;
    unLocationCode?: string;
    vesselName?: string;
    imoNumber?: string;
    voyageNumber?: string;
  }[];
  events: TrackingEvent[];
  status: ContainerTracking["status"];
  /** Arrival at the destination port: estimated until the carrier reports it as actual. */
  arrival?: { dateTime: string; actual: boolean };
  lastSyncedAt: string | null;
}

// Event descriptions come from our own mapping, but strip any carrier name defensively.
const CARRIER_NAME_RE = /\b(CMA\s*CGM|Maersk|MSC)\b\s*/gi;
const scrub = (text?: string) => text?.replace(CARRIER_NAME_RE, "").trim() || undefined;

function cleanEvents(events: any[] = []): TrackingEvent[] {
  return events.map((e) => ({
    eventType: e.eventType,
    eventClassifierCode: e.eventClassifierCode,
    eventDateTime: e.eventDateTime,
    estimatedDateTime: e.estimatedDateTime || undefined,
    actualDateTime: e.actualDateTime || undefined,
    location: {
      unLocationCode: e.location?.unLocationCode || "",
      portName: e.location?.portName || "",
      facility: e.location?.facility || undefined,
    },
    vesselName: e.vesselName || undefined,
    voyageNumber: e.voyageNumber || undefined,
    description: scrub(e.description),
  }));
}

function cleanLocation(loc: any): TrackingLocation | undefined {
  if (!loc?.portName && !loc?.unLocationCode) return undefined;
  return { unLocationCode: loc.unLocationCode || "", portName: loc.portName || "", facility: loc.facility || undefined };
}

function cleanRotation(rotation: any[] = []): PortCall[] {
  return rotation.map((p) => ({
    sequence: p.sequence,
    role: p.role,
    unLocationCode: p.unLocationCode || "",
    portName: p.portName || "",
    facility: p.facility || undefined,
    vesselName: p.vesselName || undefined,
    imoNumber: p.imoNumber || undefined,
    voyageNumber: p.voyageNumber || undefined,
  }));
}

export function toClientContainerView(t: ContainerTracking | null): ClientContainerView | null {
  if (!t) return null;
  return {
    containerNumber: t.containerNumber,
    containerSizeType: t.containerSizeType || undefined,
    containerSizeLabel: t.containerSizeLabel || undefined,
    vesselName: t.vesselName || undefined,
    imoNumber: t.imoNumber || undefined,
    voyageNumber: t.voyageNumber || undefined,
    originPort: cleanLocation(t.originPort),
    destinationPort: cleanLocation(t.destinationPort),
    portRotation: cleanRotation(t.portRotation),
    events: cleanEvents(t.events),
    status: t.status,
    lastSyncedAt: t.lastSyncedAt,
  };
}

/** Built from the shipment's tracked booking; null until a booking with vessel data is on file. */
export function toClientVesselView(booking: any): ClientVesselView | null {
  if (!booking || (!booking.vesselName && !(booking.portRotation || []).length)) return null;

  const events = cleanEvents(booking.events);
  const destination = cleanLocation(booking.destinationPort);
  const arrivalEvent = [...events]
    .reverse()
    .find(
      (e) =>
        e.eventType === "DISCHARGE" &&
        (!destination?.unLocationCode || e.location.unLocationCode === destination.unLocationCode)
    );

  return {
    vesselName: booking.vesselName || undefined,
    imoNumber: booking.imoNumber || undefined,
    voyageNumber: booking.voyageNumber || undefined,
    originPort: cleanLocation(booking.originPort),
    destinationPort: destination,
    legs: cleanRotation(booking.portRotation).map(({ role, portName, unLocationCode, vesselName, imoNumber, voyageNumber }) => ({
      role,
      portName,
      unLocationCode,
      vesselName,
      // Bookings synced before per-leg IMOs were stored only have the main vessel's.
      imoNumber: imoNumber || (vesselName && vesselName === booking.vesselName ? booking.imoNumber : undefined),
      voyageNumber,
    })),
    events,
    status: booking.status || "PENDING",
    arrival: arrivalEvent
      ? { dateTime: arrivalEvent.eventDateTime, actual: arrivalEvent.eventClassifierCode === "ACT" }
      : undefined,
    lastSyncedAt: booking.lastSyncedAt || null,
  };
}

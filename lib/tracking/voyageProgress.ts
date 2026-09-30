/**
 * Turns a client vessel view (ports on the route + the carrier's events) into
 * where the cargo is right now: which ports are done, which leg is under way,
 * and the date to show against each port. Pure, so the card stays simple.
 */

export interface VoyageEvent {
  eventType: string;
  eventClassifierCode: "PLN" | "EST" | "ACT";
  eventDateTime: string;
  location: { unLocationCode: string; portName: string };
}

export interface VoyageLeg {
  role: "ORIGIN" | "TRANSSHIPMENT" | "DESTINATION";
  portName?: string;
  unLocationCode?: string;
  vesselName?: string;
  imoNumber?: string;
  voyageNumber?: string;
}

export type VoyagePhase = "AWAITING_DEPARTURE" | "AT_SEA" | "AT_PORT" | "ARRIVED";

export interface PortMoment {
  /** "departure" for the port of loading, "arrival" for every other port. */
  kind: "departure" | "arrival";
  dateTime: string;
  actual: boolean;
}

export interface VoyagePort {
  leg: VoyageLeg;
  arrived: boolean;
  departed: boolean;
  moment?: PortMoment;
  /** Departure from a transshipment port, once known. */
  departure?: PortMoment;
}

export interface VoyageProgress {
  phase: VoyagePhase;
  ports: VoyagePort[];
  /** Index of the port the cargo last reached (-1 before departure). */
  lastReached: number;
  /** Leg under way (from ports[i] to ports[i + 1]), or -1 when not sailing. */
  sailingLeg: number;
  /** The vessel to feature: on board now, next, or the one it arrived on. */
  featuredVessel?: VoyageLeg;
}

const byTime = (a: VoyageEvent, b: VoyageEvent) =>
  new Date(a.eventDateTime).getTime() - new Date(b.eventDateTime).getTime();

const toMoment = (e: VoyageEvent | undefined, kind: PortMoment["kind"]): PortMoment | undefined =>
  e ? { kind, dateTime: e.eventDateTime, actual: e.eventClassifierCode === "ACT" } : undefined;

export function computeVoyageProgress(legs: VoyageLeg[], events: VoyageEvent[]): VoyageProgress {
  const last = legs.length - 1;

  const ports: VoyagePort[] = legs.map((leg, i) => {
    const here = events.filter((e) => leg.unLocationCode && e.location.unLocationCode === leg.unLocationCode).sort(byTime);

    if (i === 0) {
      const dep = here.find((e) => e.eventType === "VESSEL_DEPARTURE") ?? here[here.length - 1];
      const moment = toMoment(dep, "departure");
      return { leg, arrived: here.some((e) => e.eventClassifierCode === "ACT"), departed: !!moment?.actual, moment };
    }

    const arrivalEvent =
      here.find((e) => e.eventType === "TRANSSHIPMENT" || e.eventType === "DISCHARGE") ?? here[0];
    const departureEvent = i < last && here.length > 1 ? here[here.length - 1] : undefined;
    const departure = toMoment(departureEvent, "departure");
    return {
      leg,
      arrived: here.some((e) => e.eventClassifierCode === "ACT"),
      departed: !!departure?.actual,
      moment: toMoment(arrivalEvent, "arrival"),
      departure,
    };
  });

  let lastReached = -1;
  ports.forEach((p, i) => {
    if (p.arrived || p.departed) lastReached = i;
  });
  // The port of loading only counts as "reached" once the vessel has left it.
  if (lastReached === 0 && !ports[0].departed) lastReached = -1;

  let phase: VoyagePhase;
  let sailingLeg = -1;
  let featuredVessel: VoyageLeg | undefined;

  if (last >= 0 && ports[last].arrived) {
    phase = "ARRIVED";
    lastReached = last;
    featuredVessel = legs[last].vesselName ? legs[last] : legs[last - 1];
  } else if (lastReached === -1) {
    phase = "AWAITING_DEPARTURE";
    featuredVessel = legs[0];
  } else if (ports[lastReached].departed) {
    phase = "AT_SEA";
    sailingLeg = lastReached;
    featuredVessel = legs[lastReached];
  } else {
    phase = "AT_PORT";
    featuredVessel = legs[lastReached];
  }

  return { phase, ports, lastReached, sailingLeg, featuredVessel };
}

/** Title-cases carrier port names ("MONTREAL, QC" -> "Montreal, QC") while keeping short region codes. */
export function formatPortName(name?: string): string {
  if (!name) return "";
  return name
    .split(",")
    .map((part, i) => {
      const trimmed = part.trim();
      if (i > 0 && trimmed.length <= 3) return trimmed.toUpperCase();
      return trimmed.toLowerCase().replace(/(^|[\s\-/'(])(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase());
    })
    .join(", ");
}

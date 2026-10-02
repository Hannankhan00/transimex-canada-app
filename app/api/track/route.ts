import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import connectDB from "@/lib/mongoose";
import Shipment from "@/models/Shipment";
import TrackedContainer from "@/models/TrackedContainer";
import { toClientContainerView, toClientVesselView } from "@/lib/tracking/clientView";
import { getContainerTracking, syncContainer, linkBookingToShipmentAndSync } from "@/lib/tracking/sync";
import { detectCarrier } from "@/lib/tracking/carrierDetection";
import { computeVoyageProgress } from "@/lib/tracking/voyageProgress";
import { getAdapter } from "@/lib/tracking/adapters";

/**
 * Public tracking endpoint.
 *
 * Callers fall into two tiers:
 * - Anonymous (no key): a minimal, privacy-safe view — status, route cities,
 *   vessel and carrier events. No commodity, equipment, quote reference,
 *   street/postal detail or internal timeline text.
 * - Trusted server-to-server (header `x-api-key` = TRACKING_PUBLIC_API_KEY):
 *   the same view plus equipment, commodity, origin/destination detail, port of
 *   entry and a scrubbed internal timeline. Quote references are never returned.
 */

const PUBLIC_LIMIT_PER_MINUTE = 30; // per IP
const TRUSTED_LIMIT_PER_MINUTE = 600; // per API key
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_ENTRIES = 5000;

// Cached carrier data newer than this is served from the database; older data triggers a live carrier call.
const CACHE_MAX_AGE_MS = 5 * 60 * 60 * 1000; // 5 hours

// Container numbers, TMX tracking IDs and carrier booking / B/L references only.
const QUERY_PATTERN = /^[A-Z0-9][A-Z0-9\-_ ]{2,34}$/;

// In-memory sliding window (per server instance).
const rateLimitMap = new Map<string, { count: number; expiresAt: number }>();

/** Returns 0 when the request may proceed, otherwise the seconds until the window resets. */
function checkRateLimit(bucket: string, max: number): number {
  const now = Date.now();
  if (rateLimitMap.size > RATE_LIMIT_MAX_ENTRIES) {
    rateLimitMap.forEach((v, k) => {
      if (now > v.expiresAt) rateLimitMap.delete(k);
    });
  }
  const record = rateLimitMap.get(bucket);
  if (!record || now > record.expiresAt) {
    rateLimitMap.set(bucket, { count: 1, expiresAt: now + RATE_LIMIT_WINDOW_MS });
    return 0;
  }
  if (record.count >= max) {
    return Math.max(1, Math.ceil((record.expiresAt - now) / 1000));
  }
  record.count += 1;
  return 0;
}

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

/** True only when TRACKING_PUBLIC_API_KEY is configured and the request presents it. */
function hasValidApiKey(req: Request): boolean {
  const expected = process.env.TRACKING_PUBLIC_API_KEY;
  const provided = req.headers.get("x-api-key");
  if (!expected || !provided) return false;
  return timingSafeEqual(sha256(provided), sha256(expected));
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isStale(lastSyncedAt: unknown): boolean {
  if (!lastSyncedAt) return true;
  const t = new Date(lastSyncedAt as string).getTime();
  return !Number.isFinite(t) || Date.now() - t > CACHE_MAX_AGE_MS;
}

/** Returns the cached container doc, refreshing it from the carrier first if it is stale. Falls back to the cache if the carrier call fails. */
async function getFreshContainer(containerNumber: string, cached: any | null): Promise<any | null> {
  if (cached && !isStale(cached.lastSyncedAt)) return cached;
  if (cached?.status === "DELIVERED") return cached;
  try {
    return await syncContainer(containerNumber, cached?.carrier ?? null);
  } catch {
    return cached; // carrier unavailable, rate-limited or unknown: show what we have
  }
}

/** Only real ISO dates are returned; placeholders such as "3-5 Business Days" or "Pending Dispatch" are dropped. */
function validIsoDate(value: unknown): string | undefined {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(value)) return undefined;
  return Number.isNaN(new Date(value).getTime()) ? undefined : value;
}

const QUOTE_REF_RE = /\bQT-[A-Z0-9-]+\b/gi;
const scrubQuoteRefs = (text: string) =>
  text
    .replace(/\s*Dispatched from Quote\s*/gi, " ")
    .replace(QUOTE_REF_RE, "")
    .replace(/\s{2,}/g, " ")
    .trim();

/**
 * The admin-set shipment status lags the carrier (it defaults to "Pending Dispatch"),
 * so when the carrier already reports movement the shipment is shown as In Transit.
 */
function effectiveStatus(status: string, vessel: any, containers: any[]): string {
  const moving = vessel?.status === "IN_TRANSIT" || containers.some((c) => c?.status === "IN_TRANSIT");
  return status === "Pending Dispatch" && moving ? "In Transit" : status;
}

function calculateProgress(status: string, timeline: any[] = []): number {
  if (status === "Delivered") return 100;
  if (status === "Cancelled") return 0;
  if (status === "Out for Delivery") return 85;
  if (status === "In Transit") return 55;
  if (status === "Customs Hold") return 35;
  if (status === "Pending Dispatch") return 15;

  const total = timeline.length;
  if (total > 0) {
    const completed = timeline.filter((t) => t.completed).length;
    return Math.round((completed / total) * 100);
  }
  return 10;
}

/** Overall progress: the admin status sets the floor; real carrier movement raises it while the cargo is on the water. */
function computeProgress(status: string, timeline: any[], voyage: ReturnType<typeof computeVoyageProgress> | null, legCount: number): number {
  const base = calculateProgress(status, timeline);
  if (!voyage || (status !== "In Transit" && status !== "Pending Dispatch")) return base;

  let oceanProgress: number;
  switch (voyage.phase) {
    case "ARRIVED":
      oceanProgress = 90;
      break;
    case "AWAITING_DEPARTURE":
      oceanProgress = 20;
      break;
    default: {
      const span = Math.max(legCount - 1, 1);
      const reached = voyage.phase === "AT_SEA" ? voyage.lastReached + 0.5 : voyage.lastReached;
      oceanProgress = 30 + Math.round((55 * Math.max(reached, 0)) / span);
    }
  }
  return Math.max(base, Math.min(oceanProgress, 90));
}

/** Terminal/facility codes (e.g. "MGTRAC") are internal-looking and meaningless to the public; drop them everywhere. */
function stripFacility<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripFacility) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k !== "facility") out[k] = stripFacility(v);
    }
    return out as T;
  }
  return value;
}

/**
 * The vessel's events and each container's events are the same carrier events, and
 * `legs` and `portRotation` describe the same rotation — send each only once.
 */
function dedupeTracking(vessel: any, containers: any[]) {
  const containersHaveEvents = containers.some((c) => c?.events?.length);
  const outVessel = vessel
    ? { ...vessel, ...(containersHaveEvents ? { events: undefined } : {}) }
    : null;
  const outContainers = containers.map((c) =>
    vessel?.legs?.length ? { ...c, portRotation: undefined } : c
  );
  return { vessel: outVessel, containers: outContainers };
}

function matchedOn(shipment: any, query: string): string {
  const eq = (v: unknown) => typeof v === "string" && v.toUpperCase() === query;
  if (eq(shipment.trackingNumber)) return "TRACKING_NUMBER";
  if (eq(shipment.carrierBooking?.reference)) return "BOOKING_REFERENCE";
  if ((shipment.containers || []).some((c: any) => eq(c.containerNumber))) return "CONTAINER_NUMBER";
  return "LINKED_RECORD";
}

async function buildShipmentResponse(shipment: any, query: string, trusted: boolean, matched?: string) {
  // Refresh the carrier booking if its cached data is older than 5 hours (also refreshes its containers)
  const booking = shipment.carrierBooking;
  if (booking?.reference && booking.status !== "DELIVERED" && isStale(booking.lastSyncedAt)) {
    try {
      await linkBookingToShipmentAndSync(String(shipment._id), booking.carrier, booking.reference);
      shipment = (await Shipment.findById(shipment._id).lean<any>()) ?? shipment;
    } catch {
      // Carrier unavailable: keep serving the cached booking
    }
  }

  // Container views, refreshing any container whose cache is older than 5 hours
  const containerNumbers: string[] = (shipment.containers || []).map((c: any) => c.containerNumber);
  const containerViews = (
    await Promise.all(
      containerNumbers.map(async (num: string) => {
        const cached = await getContainerTracking(num);
        return toClientContainerView(await getFreshContainer(num, cached));
      })
    )
  ).filter(Boolean) as any[];

  const rawVessel = toClientVesselView(shipment.carrierBooking);
  const voyage = rawVessel ? computeVoyageProgress(rawVessel.legs, rawVessel.events) : null;

  const status = effectiveStatus(shipment.status, rawVessel, containerViews);
  // The floor comes from the admin status (not the carrier-adjusted one), so a shipment still "Pending Dispatch"
  // that is only loaded at origin does not jump to the mid-transit default.
  const progress = computeProgress(shipment.status, shipment.timeline, voyage, rawVessel?.legs.length ?? 0);
  const eta = rawVessel?.arrival?.dateTime || validIsoDate(shipment.eta);
  const lastUpdated = shipment.updatedAt || shipment.createdAt;
  const { vessel, containers } = dedupeTracking(rawVessel, containerViews);

  const publicShipment: Record<string, unknown> = {
    trackingNumber: shipment.trackingNumber,
    status,
    progress,
    transportMode: shipment.cargo?.transportMode || "Ocean Freight",
    origin: { city: shipment.route?.origin || "" },
    destination: { city: shipment.route?.destination || "" },
    eta,
    customsStatus: shipment.customsStatus || "Pending",
    vessel,
    containers,
  };

  if (trusted) {
    publicShipment.equipment = shipment.cargo?.equipment || undefined;
    publicShipment.commodity = shipment.cargo?.commodity || undefined;
    publicShipment.origin = { city: shipment.route?.origin || "", detail: shipment.route?.originDetail || "" };
    publicShipment.destination = {
      city: shipment.route?.destination || "",
      detail: shipment.route?.destinationDetail || "",
    };
    publicShipment.portOfEntry = shipment.portOfEntry || undefined;
    publicShipment.timeline = (shipment.timeline || []).map((t: any) => ({
      title: t.title,
      location: t.location,
      timestamp: validIsoDate(t.timestamp) ?? null,
      statusText: scrubQuoteRefs(t.statusText || ""),
      completed: Boolean(t.completed),
    }));
  }

  return NextResponse.json({
    success: true,
    resultType: "SHIPMENT",
    matchedReference: query,
    matchedOn: matched ?? matchedOn(shipment, query),
    lastUpdated,
    shipment: stripFacility(publicShipment),
  });
}

async function handleTrackRequest(rawQuery: string, trusted: boolean) {
  const query = rawQuery.trim().toUpperCase();
  if (!QUERY_PATTERN.test(query)) {
    return NextResponse.json(
      { error: "Please enter a valid tracking number, container number, or carrier reference." },
      { status: 400 }
    );
  }

  await connectDB();

  // 1. A Transimex shipment matched by tracking number, carrier booking reference or container number.
  //    Quote references are deliberately not searchable here.
  const exact = new RegExp(`^${escapeRegex(query)}$`, "i");
  const shipment = await Shipment.findOne({
    $or: [{ trackingNumber: exact }, { "carrierBooking.reference": exact }, { "containers.containerNumber": exact }],
  }).lean<any>();

  if (shipment) {
    return buildShipmentResponse(shipment, query, trusted);
  }

  // 2. The TrackedContainer cache.
  let containerDoc = await TrackedContainer.findOne({
    $or: [
      { containerNumber: query },
      { blNumber: query },
      { bookingNumber: query },
      { bookingReference: query },
    ],
  }).lean<any>();

  // Linked to a shipment: respond with the full shipment view.
  if (containerDoc?.shipmentId) {
    const linkedShipment = await Shipment.findById(containerDoc.shipmentId).lean<any>();
    if (linkedShipment) {
      return buildShipmentResponse(linkedShipment, query, trusted, "LINKED_RECORD");
    }
  }

  if (containerDoc) {
    containerDoc = await getFreshContainer(containerDoc.containerNumber, containerDoc);
    const container = toClientContainerView(containerDoc);
    return NextResponse.json({
      success: true,
      resultType: "CONTAINER",
      matchedReference: query,
      matchedOn: "CONTAINER_CACHE",
      lastUpdated: containerDoc.lastSyncedAt || containerDoc.updatedAt,
      container: stripFacility(container),
    });
  }

  // 3. Not in our database: live carrier lookup when the number matches a known carrier format.
  const detection = detectCarrier(query);
  let liveTracking: any = null;

  if (detection.carrier) {
    try {
      const adapter = getAdapter(detection.carrier);
      const result = await adapter.fetchTracking(query);
      if (result?.tracking) {
        liveTracking = await syncContainer(query, detection.carrier);
      }
    } catch {
      // Live carrier fetch failed or rate-limited; fall through to the reference lookup
    }
  }

  if (liveTracking) {
    return NextResponse.json({
      success: true,
      resultType: "CONTAINER",
      matchedReference: query,
      matchedOn: "CARRIER_LOOKUP",
      lastUpdated: liveTracking.lastSyncedAt || new Date().toISOString(),
      container: stripFacility(toClientContainerView(liveTracking)),
    });
  }

  // Booking / B/L reference lookup (CMA CGM).
  if (/^[A-Z0-9-]{6,35}$/.test(query)) {
    try {
      const cmaAdapter = getAdapter("CMA_CGM");
      if (cmaAdapter.fetchByReference) {
        const refResult = await cmaAdapter.fetchByReference(query);
        if (refResult?.booking) {
          const { vessel, containers } = dedupeTracking(
            toClientVesselView(refResult.booking),
            (refResult.containers || []).map((c) => toClientContainerView(c.tracking as any)).filter(Boolean) as any[]
          );
          return NextResponse.json({
            success: true,
            resultType: "BOOKING_REFERENCE",
            matchedReference: query,
            matchedOn: "BOOKING_REFERENCE",
            lastUpdated: new Date().toISOString(),
            vessel: stripFacility(vessel),
            containers: stripFacility(containers),
          });
        }
      }
    } catch {
      // Not a valid CMA CGM reference or carrier API offline
    }
  }

  // 4. Not found anywhere.
  return NextResponse.json(
    {
      error: `No shipment, container, or carrier record found for "${rawQuery}". Please verify your reference number and try again.`,
      suggestion: "Enter a Transimex tracking ID (e.g. TMX-2026-XXXX), container number (e.g. CMAU1234567), or vendor booking reference.",
    },
    { status: 404 }
  );
}

async function handle(req: Request, rawQuery: string) {
  try {
    const trusted = hasValidApiKey(req);

    let retryAfter: number;
    if (trusted) {
      retryAfter = checkRateLimit(`key:${sha256(req.headers.get("x-api-key") || "").toString("hex")}`, TRUSTED_LIMIT_PER_MINUTE);
    } else {
      const forwarded = req.headers.get("x-forwarded-for");
      const ip = forwarded ? forwarded.split(",")[0].trim() : req.headers.get("x-real-ip") || "unknown";
      retryAfter = checkRateLimit(`ip:${ip}`, PUBLIC_LIMIT_PER_MINUTE);
    }
    if (retryAfter > 0) {
      return NextResponse.json(
        { error: "Too many tracking requests. Please wait a moment and try again.", retryAfterSeconds: retryAfter },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    const res = await handleTrackRequest(rawQuery, trusted);
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (err) {
    console.error("Public tracking error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred while tracking your shipment. Please try again later." },
      { status: 500 }
    );
  }
}

// GET /api/track?q=... (also accepts ?query=, ?number=, ?reference=, ?id=)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query =
    searchParams.get("q") ||
    searchParams.get("query") ||
    searchParams.get("number") ||
    searchParams.get("reference") ||
    searchParams.get("id") ||
    "";
  return handle(req, query);
}

// POST /api/track with JSON { "query": "..." }
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const query = String(body.query || body.number || body.reference || body.q || "");
  return handle(req, query);
}

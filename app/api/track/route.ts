import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Shipment from "@/models/Shipment";
import TrackedContainer from "@/models/TrackedContainer";
import { toClientContainerView, toClientVesselView } from "@/lib/tracking/clientView";
import { getContainerTracking, syncContainer, mongoTrackingStore } from "@/lib/tracking/sync";
import { detectCarrier } from "@/lib/tracking/carrierDetection";
import { computeVoyageProgress } from "@/lib/tracking/voyageProgress";
import { getAdapter } from "@/lib/tracking/adapters";
import { CarrierCode } from "@/lib/tracking/schema";

// Rate limiting map (in-memory sliding window for public tracking)
const rateLimitMap = new Map<string, { count: number; expiresAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30; // 30 requests per minute per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record || now > record.expiresAt) {
    rateLimitMap.set(ip, { count: 1, expiresAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }
  record.count += 1;
  return false;
}

// Progress calculation helper based on shipment status and timeline
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

/**
 * Public handler for tracking queries.
 * Accepts shipment ID (e.g. TMX-2026-00847), container number (e.g. CMAU1234567),
 * quote reference (e.g. QT-2026-00124), or vendor booking/BL reference (e.g. CAN1028600).
 */
async function handleTrackRequest(rawQuery: string, ip: string) {
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many tracking requests. Please wait a moment and try again." },
      { status: 429 }
    );
  }

  const query = rawQuery.trim().toUpperCase();
  if (!query || query.length < 3) {
    return NextResponse.json(
      { error: "Please enter a valid tracking number, container number, or carrier reference." },
      { status: 400 }
    );
  }

  await connectDB();

  // 1. First, search for a matching Transimex shipment
  const shipment = await Shipment.findOne({
    $or: [
      { trackingNumber: new RegExp(`^${query}$`, "i") },
      { quoteId: new RegExp(`^${query}$`, "i") },
      { "carrierBooking.reference": new RegExp(`^${query}$`, "i") },
      { "containers.containerNumber": new RegExp(`^${query}$`, "i") },
    ],
  }).lean<any>();

  if (shipment) {
    // Collect container views
    const containerNumbers: string[] = (shipment.containers || []).map((c: any) => c.containerNumber);
    const containerTrackingList = await Promise.all(
      containerNumbers.map(async (num: string) => {
        const doc = await getContainerTracking(num);
        return toClientContainerView(doc);
      })
    );

    // Build client vessel view if ocean carrier booking exists
    const vessel = toClientVesselView(shipment.carrierBooking);
    const voyageProgress = vessel ? computeVoyageProgress(vessel.legs, vessel.events) : null;

    const baseProgress = calculateProgress(shipment.status, shipment.timeline);
    const overallProgress =
      voyageProgress && shipment.status === "In Transit"
        ? Math.max(baseProgress, voyageProgress.phase === "ARRIVED" ? 90 : 50)
        : baseProgress;

    return NextResponse.json({
      success: true,
      resultType: "SHIPMENT",
      shipment: {
        trackingNumber: shipment.trackingNumber,
        quoteId: shipment.quoteId || undefined,
        status: shipment.status,
        progress: overallProgress,
        transportMode: shipment.cargo?.transportMode || "Ocean Freight",
        equipment: shipment.cargo?.equipment || "",
        commodity: shipment.cargo?.commodity || "",
        origin: {
          city: shipment.route?.origin || "",
          detail: shipment.route?.originDetail || "",
        },
        destination: {
          city: shipment.route?.destination || "",
          detail: shipment.route?.destinationDetail || "",
        },
        eta: shipment.eta || vessel?.arrival?.dateTime || undefined,
        portOfEntry: shipment.portOfEntry || undefined,
        customsStatus: shipment.customsStatus || "Pending",
        timeline: (shipment.timeline || []).map((t: any) => ({
          title: t.title,
          location: t.location,
          timestamp: t.timestamp,
          statusText: t.statusText,
          completed: Boolean(t.completed),
        })),
        vessel: vessel || null,
        containers: containerTrackingList.filter(Boolean),
        lastUpdated: shipment.updatedAt || shipment.createdAt,
      },
    });
  }

  // 2. Second, check TrackedContainer collection directly
  let containerDoc = await TrackedContainer.findOne({
    $or: [
      { containerNumber: query },
      { blNumber: query },
      { bookingNumber: query },
      { bookingReference: query },
    ],
  }).lean<any>();

  // If container found and linked to a shipment, re-fetch that shipment for full context
  if (containerDoc?.shipmentId) {
    const linkedShipment = await Shipment.findById(containerDoc.shipmentId).lean<any>();
    if (linkedShipment) {
      return handleTrackRequest(linkedShipment.trackingNumber, ip);
    }
  }

  // If container found standalone in cache
  if (containerDoc) {
    const clientContainer = toClientContainerView(containerDoc);
    return NextResponse.json({
      success: true,
      resultType: "CONTAINER",
      container: clientContainer,
      lastUpdated: containerDoc.lastSyncedAt || containerDoc.updatedAt,
    });
  }

  // 3. Fallback: Carrier on-demand live lookup if it matches known carrier format
  // Detect if query looks like a container number (e.g. CMAU, CGMU, MAEU, MSCU...)
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
      // Live carrier fetch failed or rate-limited; proceed to check reference lookup
    }
  }

  // If not resolved by container number, attempt carrier reference lookup (e.g. CMA CGM booking/BL)
  if (!liveTracking && /^[A-Z0-9-]{6,35}$/.test(query)) {
    // Try CMA CGM reference lookup (as configured)
    try {
      const cmaAdapter = getAdapter("CMA_CGM");
      if (cmaAdapter.fetchByReference) {
        const refResult = await cmaAdapter.fetchByReference(query);
        if (refResult?.booking) {
          const clientBooking = toClientVesselView(refResult.booking);
          const clientContainers = (refResult.containers || []).map((c) =>
            toClientContainerView(c.tracking as any)
          );
          return NextResponse.json({
            success: true,
            resultType: "BOOKING_REFERENCE",
            reference: query,
            vessel: clientBooking,
            containers: clientContainers,
            lastUpdated: new Date().toISOString(),
          });
        }
      }
    } catch {
      // Not a valid CMA CGM reference or carrier API offline
    }
  }

  if (liveTracking) {
    return NextResponse.json({
      success: true,
      resultType: "CONTAINER",
      container: toClientContainerView(liveTracking),
      lastUpdated: liveTracking.lastSyncedAt || new Date().toISOString(),
    });
  }

  // 4. Not found anywhere
  return NextResponse.json(
    {
      error: `No shipment, container, or carrier record found for "${rawQuery}". Please verify your reference number and try again.`,
      suggestion: "Enter a Transimex tracking ID (e.g. TMX-2026-XXXX), container number (e.g. CMAU1234567), or vendor booking reference.",
    },
    { status: 404 }
  );
}

// GET /api/track?q=... or ?number=... or ?id=...
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query =
      searchParams.get("q") ||
      searchParams.get("query") ||
      searchParams.get("number") ||
      searchParams.get("reference") ||
      searchParams.get("id") ||
      "";

    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";

    return await handleTrackRequest(query, ip);
  } catch (err: any) {
    console.error("Public tracking error:", err);
    return NextResponse.json(
      { error: err.message || "An unexpected error occurred while tracking your shipment." },
      { status: 500 }
    );
  }
}

// POST /api/track with JSON { "query": "..." }
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const query = String(body.query || body.number || body.reference || body.q || "");

    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";

    return await handleTrackRequest(query, ip);
  } catch (err: any) {
    console.error("Public tracking error:", err);
    return NextResponse.json(
      { error: err.message || "An unexpected error occurred while tracking your shipment." },
      { status: 500 }
    );
  }
}

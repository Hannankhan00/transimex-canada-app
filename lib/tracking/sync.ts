import connectDB from "@/lib/mongoose";
import TrackedContainer from "@/models/TrackedContainer";
import Shipment from "@/models/Shipment";
import { BookingTracking, CarrierCode, ContainerTracking } from "./schema";
import {
  syncContainerTracking,
  syncReferenceTracking,
  applyWebhookPayload,
  getCachedTracking,
  TrackingStore,
} from "./pipeline";

function docToTracking(doc: any): ContainerTracking {
  return {
    containerNumber: doc.containerNumber,
    containerSizeType: doc.containerSizeType,
    containerSizeLabel: doc.containerSizeLabel,
    blNumber: doc.blNumber,
    bookingNumber: doc.bookingNumber,
    carrier: doc.carrier,
    carrierDetectionSource: doc.carrierDetectionSource,
    vesselName: doc.vesselName,
    imoNumber: doc.imoNumber,
    voyageNumber: doc.voyageNumber,
    originPort: doc.originPort,
    destinationPort: doc.destinationPort,
    portRotation: doc.portRotation || [],
    events: doc.events || [],
    status: doc.status,
    lastSyncedAt: doc.lastSyncedAt,
    raw: doc.raw || [],
  };
}

/** The production cache: reads/writes the TrackedContainer collection in Mongo. */
class MongoTrackingStore implements TrackingStore {
  async get(containerNumber: string): Promise<ContainerTracking | null> {
    await connectDB();
    const doc = await TrackedContainer.findOne({ containerNumber: containerNumber.trim().toUpperCase() }).lean<any>();
    return doc ? docToTracking(doc) : null;
  }

  async set(containerNumber: string, tracking: ContainerTracking): Promise<void> {
    await connectDB();
    await TrackedContainer.findOneAndUpdate(
      { containerNumber: containerNumber.trim().toUpperCase() },
      { $set: { ...tracking, containerNumber: containerNumber.trim().toUpperCase() } },
      { upsert: true, new: true }
    );
  }
}

export const mongoTrackingStore = new MongoTrackingStore();

/** Reads the cache only — no adapter call. What every API route/UI should use. */
export async function getContainerTracking(containerNumber: string): Promise<ContainerTracking | null> {
  return getCachedTracking(containerNumber, { store: mongoTrackingStore });
}

/** Runs the full pipeline for one container and writes the result into the cache. */
export async function syncContainer(
  containerNumber: string,
  explicitCarrier?: CarrierCode | null
): Promise<ContainerTracking> {
  return syncContainerTracking(containerNumber, explicitCarrier, { store: mongoTrackingStore });
}

/**
 * Links a container number (entered by an admin on a shipment) to a
 * TrackedContainer record and runs its first sync immediately, so the
 * milestone timeline is populated as soon as it's added — this is the
 * primary entry point into tracking (see requirement 4: explicit carrier
 * captured at booking/entry time is preferred over the prefix guess).
 */
export async function linkContainerToShipmentAndSync(
  containerNumber: string,
  shipmentId: string,
  explicitCarrier?: CarrierCode | null
): Promise<ContainerTracking> {
  const tracking = await syncContainer(containerNumber, explicitCarrier);
  await connectDB();
  await TrackedContainer.updateOne(
    { containerNumber: containerNumber.trim().toUpperCase() },
    { $set: { shipmentId } }
  );
  return tracking;
}

const ISO_CONTAINER_RE = /^[A-Z]{4}\d{7}$/;
const isIsoContainer = (num: unknown) => typeof num === "string" && ISO_CONTAINER_RE.test(num.trim().toUpperCase());

/** Saves the reference (with the lookup error) on a shipment so it can be retried later. */
async function saveBookingFailure(shipmentId: string, carrier: CarrierCode, ref: string, err: any): Promise<void> {
  const previous = (await Shipment.findById(shipmentId).lean<any>())?.carrierBooking;
  const sameBooking = previous && previous.reference === ref && previous.carrier === carrier;
  await Shipment.updateOne(
    { _id: shipmentId },
    {
      $set: {
        carrierBooking: {
          ...(sameBooking ? previous : { portRotation: [], events: [], status: "PENDING", containerNumbers: [], lastSyncedAt: null }),
          carrier,
          reference: ref,
          lastError: err?.message || String(err),
        },
      },
    }
  );
}

/** Links the booking's cached containers to a shipment, and never keeps the booking reference itself as a container. */
async function linkTrackedContainers(shipmentId: string, ref: string, booking: BookingTracking): Promise<void> {
  if (booking.containerNumbers.length > 0) {
    await TrackedContainer.updateMany(
      { containerNumber: { $in: booking.containerNumbers } },
      { $set: { shipmentId, bookingReference: ref } }
    );
  }
  await TrackedContainer.deleteMany({ containerNumber: ref });
}

/** Saves the fetched booking on one shipment and adds its genuine ISO containers. Returns the containers newly added. */
async function applyBookingToShipment(
  shipmentId: string,
  carrier: CarrierCode,
  ref: string,
  booking: BookingTracking
): Promise<string[]> {
  const shipment = await Shipment.findById(shipmentId);
  if (!shipment) throw new Error("Shipment not found");

  // Keep only genuine ISO containers on the shipment, dropping the booking reference if it was stored as a container
  const validExisting = (shipment.containers || []).filter(
    (c: any) => isIsoContainer(c?.containerNumber) && c.containerNumber.trim().toUpperCase() !== ref
  );
  const onShipment = new Set(validExisting.map((c: any) => c.containerNumber.trim().toUpperCase()));
  const validBookingContainers = (booking.containerNumbers || []).filter(
    (c: string) => isIsoContainer(c) && c.trim().toUpperCase() !== ref
  );
  const containersAdded = validBookingContainers.filter((c: string) => !onShipment.has(c));

  shipment.containers = [
    ...validExisting,
    ...containersAdded.map((containerNumber: string) => ({ containerNumber, carrier })),
  ];
  shipment.carrierBooking = booking as any;
  await shipment.save();

  return containersAdded;
}

/**
 * Tracks a carrier booking or B/L reference for a shipment: one carrier call,
 * then the booking (vessel, voyage, route, events) is saved on the shipment and
 * every container the carrier has assigned is cached, linked to the shipment and
 * added to its container list. On failure the reference is still saved, with
 * the error, so it can be retried.
 */
export async function linkBookingToShipmentAndSync(
  shipmentId: string,
  carrier: CarrierCode,
  reference: string
): Promise<{ booking: BookingTracking; containersAdded: string[] }> {
  await connectDB();
  const ref = reference.trim().toUpperCase();

  let result;
  try {
    result = await syncReferenceTracking(ref, carrier, { store: mongoTrackingStore });
  } catch (err: any) {
    await saveBookingFailure(shipmentId, carrier, ref, err);
    throw err;
  }

  const { booking } = result;
  await linkTrackedContainers(shipmentId, ref, booking);
  const containersAdded = await applyBookingToShipment(shipmentId, carrier, ref, booking);
  return { booking, containersAdded };
}

export interface BulkShipmentResult {
  shipmentId: string;
  status: "updated" | "unchanged" | "failed";
  containersAdded: string[];
  error?: string;
}

/**
 * Same as linkBookingToShipmentAndSync for many shipments sharing one booking:
 * the carrier is called once and the result is applied to every shipment. If the
 * lookup fails the reference is still saved on each shipment, with the error.
 */
export async function linkBookingToShipmentsBulk(
  shipmentIds: string[],
  carrier: CarrierCode,
  reference: string
): Promise<{ booking: BookingTracking | null; lookupError?: string; results: BulkShipmentResult[] }> {
  await connectDB();
  const ref = reference.trim().toUpperCase();

  let result;
  try {
    result = await syncReferenceTracking(ref, carrier, { store: mongoTrackingStore });
  } catch (err: any) {
    const results: BulkShipmentResult[] = [];
    for (const shipmentId of shipmentIds) {
      try {
        await saveBookingFailure(shipmentId, carrier, ref, err);
        results.push({ shipmentId, status: "updated", containersAdded: [] });
      } catch (saveErr: any) {
        results.push({ shipmentId, status: "failed", containersAdded: [], error: saveErr.message || String(saveErr) });
      }
    }
    return { booking: null, lookupError: err.message || String(err), results };
  }

  const { booking } = result;
  // A cached container records a single shipment; the first one stands in for the group.
  if (shipmentIds.length > 0) await linkTrackedContainers(shipmentIds[0], ref, booking);

  const results: BulkShipmentResult[] = [];
  for (const shipmentId of shipmentIds) {
    try {
      const containersAdded = await applyBookingToShipment(shipmentId, carrier, ref, booking);
      results.push({ shipmentId, status: "updated", containersAdded });
    } catch (err: any) {
      results.push({ shipmentId, status: "failed", containersAdded: [], error: err.message || String(err) });
    }
  }
  return { booking, results };
}

/**
 * Adds one container number to many shipments with a single carrier sync — for
 * carriers without a booking lookup (MSC), or when the box number is already known.
 */
export async function linkContainerToShipmentsBulk(
  shipmentIds: string[],
  containerNumber: string,
  explicitCarrier?: CarrierCode | null
): Promise<{ tracking: ContainerTracking | null; syncError?: string; results: BulkShipmentResult[] }> {
  await connectDB();
  const number = containerNumber.trim().toUpperCase();

  let tracking: ContainerTracking | null = null;
  let syncError: string | undefined;
  try {
    tracking = await syncContainer(number, explicitCarrier);
  } catch (err: any) {
    // The container is still added to the shipments; the sync can be retried per container.
    syncError = err.message || String(err);
  }

  const results: BulkShipmentResult[] = [];
  for (const shipmentId of shipmentIds) {
    try {
      const shipment = await Shipment.findById(shipmentId);
      if (!shipment) throw new Error("Shipment not found");
      if ((shipment.containers || []).some((c: any) => c.containerNumber === number)) {
        results.push({ shipmentId, status: "unchanged", containersAdded: [] });
        continue;
      }
      shipment.containers = [
        ...(shipment.containers || []),
        { containerNumber: number, carrier: explicitCarrier || undefined },
      ];
      await shipment.save();
      results.push({ shipmentId, status: "updated", containersAdded: [number] });
    } catch (err: any) {
      results.push({ shipmentId, status: "failed", containersAdded: [], error: err.message || String(err) });
    }
  }

  if (tracking && shipmentIds.length > 0) {
    await TrackedContainer.updateOne({ containerNumber: number }, { $set: { shipmentId: shipmentIds[0] } });
  }
  return { tracking, syncError, results };
}

/** Applies a carrier's pushed webhook payload straight to the cache — see the webhook receiver stub. */
export async function applyWebhookUpdate(carrier: CarrierCode, payload: unknown): Promise<ContainerTracking> {
  return applyWebhookPayload(carrier, payload, { store: mongoTrackingStore });
}

export interface SyncAllResult {
  attempted: number;
  succeeded: number;
  skippedDelivered: number;
  failed: Array<{ containerNumber: string; error: string }>;
  bookings: { attempted: number; succeeded: number; failed: Array<{ reference: string; error: string }> };
}

/**
 * The scheduled job's entry point (requirement 5): refreshes every tracked
 * container that isn't delivered yet, skipping the rest — the rate limiter
 * inside each adapter's live path keeps this within each carrier's cap.
 */
export async function syncAllInTransit(): Promise<SyncAllResult> {
  await connectDB();
  const [inTransit, skippedDelivered, bookedShipments] = await Promise.all([
    TrackedContainer.find({ status: { $ne: "DELIVERED" } }).lean<any[]>(),
    TrackedContainer.countDocuments({ status: "DELIVERED" }),
    Shipment.find(
      { "carrierBooking.reference": { $exists: true, $ne: "" }, "carrierBooking.status": { $ne: "DELIVERED" } },
      { _id: 1, carrierBooking: 1 }
    ).lean<any[]>(),
  ]);

  const result: SyncAllResult = {
    attempted: 0,
    succeeded: 0,
    skippedDelivered,
    failed: [],
    bookings: { attempted: 0, succeeded: 0, failed: [] },
  };

  // One call per booking refreshes every container on it, so those containers
  // are skipped below — this keeps within tight quotas (CMA CGM: 20 calls/hour).
  // Shipments sharing a booking reference are grouped so the carrier is called once for all of them.
  const refreshedByBooking = new Set<string>();
  const groups = new Map<string, { carrier: CarrierCode; reference: string; shipmentIds: string[] }>();
  for (const s of bookedShipments) {
    const { carrier, reference } = s.carrierBooking;
    const key = `${carrier}|${reference}`;
    const group = groups.get(key) ?? { carrier, reference, shipmentIds: [] as string[] };
    group.shipmentIds.push(String(s._id));
    groups.set(key, group);
  }
  for (const { carrier, reference, shipmentIds } of groups.values()) {
    result.bookings.attempted += 1;
    try {
      const { booking, lookupError } = await linkBookingToShipmentsBulk(shipmentIds, carrier, reference);
      if (lookupError || !booking) throw new Error(lookupError || "Booking lookup failed");
      booking.containerNumbers.forEach((c) => refreshedByBooking.add(c));
      result.bookings.succeeded += 1;
    } catch (err: any) {
      result.bookings.failed.push({ reference, error: err.message || String(err) });
    }
  }

  for (const doc of inTransit) {
    if (refreshedByBooking.has(doc.containerNumber)) continue;
    result.attempted += 1;
    try {
      await syncContainer(doc.containerNumber, doc.carrier as CarrierCode);
      result.succeeded += 1;
    } catch (err: any) {
      result.failed.push({ containerNumber: doc.containerNumber, error: err.message || String(err) });
    }
  }

  return result;
}

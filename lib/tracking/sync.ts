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
            lastError: err.message || String(err),
          },
        },
      }
    );
    throw err;
  }

  const { booking, containers } = result;
  if (containers.length > 0) {
    await TrackedContainer.updateMany(
      { containerNumber: { $in: booking.containerNumbers } },
      { $set: { shipmentId, bookingReference: ref } }
    );
  }

  const shipment = await Shipment.findById(shipmentId);
  if (!shipment) throw new Error("Shipment not found");
  const onShipment = new Set((shipment.containers || []).map((c: any) => c.containerNumber));
  const containersAdded = booking.containerNumbers.filter((c) => !onShipment.has(c));
  shipment.containers = [
    ...(shipment.containers || []),
    ...containersAdded.map((containerNumber) => ({ containerNumber, carrier })),
  ];
  shipment.carrierBooking = booking as any;
  await shipment.save();

  return { booking, containersAdded };
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
  const refreshedByBooking = new Set<string>();
  for (const s of bookedShipments) {
    const { carrier, reference } = s.carrierBooking;
    result.bookings.attempted += 1;
    try {
      const { booking } = await linkBookingToShipmentAndSync(String(s._id), carrier, reference);
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

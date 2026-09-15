import connectDB from "@/lib/mongoose";
import TrackedContainer from "@/models/TrackedContainer";
import { CarrierCode, ContainerTracking } from "./schema";
import { syncContainerTracking, applyWebhookPayload, getCachedTracking, TrackingStore } from "./pipeline";

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

/** Applies a carrier's pushed webhook payload straight to the cache — see the webhook receiver stub. */
export async function applyWebhookUpdate(carrier: CarrierCode, payload: unknown): Promise<ContainerTracking> {
  return applyWebhookPayload(carrier, payload, { store: mongoTrackingStore });
}

export interface SyncAllResult {
  attempted: number;
  succeeded: number;
  skippedDelivered: number;
  failed: Array<{ containerNumber: string; error: string }>;
}

/**
 * The scheduled job's entry point (requirement 5): refreshes every tracked
 * container that isn't delivered yet, skipping the rest — the rate limiter
 * inside each adapter's live path keeps this within each carrier's cap.
 */
export async function syncAllInTransit(): Promise<SyncAllResult> {
  await connectDB();
  const [inTransit, skippedDelivered] = await Promise.all([
    TrackedContainer.find({ status: { $ne: "DELIVERED" } }).lean<any[]>(),
    TrackedContainer.countDocuments({ status: "DELIVERED" }),
  ]);

  const result: SyncAllResult = { attempted: 0, succeeded: 0, skippedDelivered, failed: [] };

  for (const doc of inTransit) {
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

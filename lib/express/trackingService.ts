import connectDB from "@/lib/mongoose";
import ExpressShipment, { type ExpressTrackingStatus, type IExpressShipment, type IExpressTrackingEvent } from "@/models/ExpressShipment";
import { getCarrierAdapter } from "@/lib/shipping/registry";
import { CarrierError } from "@/lib/shipping/core/errors";
import type { TrackingResult } from "@/lib/shipping/core/types";
import { notifyShipmentEvent } from "./shipmentNotify";
import type { ExpressShipmentEmailKind } from "@/lib/expressEmail";

/** A parcel is not checked again sooner than this, however often the job runs. */
export const MIN_CHECK_INTERVAL_MINUTES = 10;
/** Parcels checked per job run, least recently checked first. */
export const BATCH_SIZE = 100;

const FINAL: ExpressTrackingStatus[] = ["delivered", "returned"];
export const isFinalTracking = (status?: string) => FINAL.includes(status as ExpressTrackingStatus);

export interface TrackingState {
  status: ExpressTrackingStatus;
  events: IExpressTrackingEvent[];
  deliveredAt?: Date;
}

export interface TrackingPlan {
  state: TrackingState;
  /** True when the status or the event list differs from what was stored. */
  changed: boolean;
  /** Message kinds this check makes due (not yet de-duplicated against what was already sent). */
  due: ExpressShipmentEmailKind[];
}

const eventKey = (e: { at: Date | string; description: string }) => `${new Date(e.at).getTime()}|${e.description}`;

/**
 * Merges a carrier result into the stored tracking. Pure, so it is unit tested.
 *  - events are merged by time + text and kept newest first
 *  - the status is the newest event's status, except that a delivered or
 *    returned parcel never goes backwards
 *  - a message is due for the final status, and for every milestone passed on
 *    the way (a job that missed a day still says "in transit" before "delivered")
 */
export function planTrackingUpdate(current: Pick<TrackingState, "status" | "events" | "deliveredAt"> | undefined, result: TrackingResult): TrackingPlan {
  const stored = current?.events ?? [];
  const seen = new Set(stored.map(eventKey));
  const merged = [...stored];
  for (const e of result.events) {
    const event: IExpressTrackingEvent = { at: new Date(e.timestamp), status: e.status, description: e.description.slice(0, 300), ...(e.location ? { location: e.location.slice(0, 120) } : {}) };
    if (Number.isNaN(event.at.getTime()) || seen.has(eventKey(event))) continue;
    seen.add(eventKey(event));
    merged.push(event);
  }
  merged.sort((a, b) => b.at.getTime() - a.at.getTime());

  const previous = current?.status ?? "unknown";
  const latest = merged[0]?.status ?? result.status ?? "unknown";
  const status = isFinalTracking(previous) ? previous : latest;
  const deliveredEvent = merged.find((e) => e.status === "delivered");
  const deliveredAt = current?.deliveredAt ?? (status === "delivered" ? deliveredEvent?.at ?? new Date() : undefined);

  const reached = new Set<ExpressTrackingStatus>(merged.map((e) => e.status));
  reached.add(status);
  const due: ExpressShipmentEmailKind[] = [];
  if (reached.has("in_transit") || reached.has("out_for_delivery") || reached.has("delivered")) due.push("in_transit");
  if (reached.has("out_for_delivery") || reached.has("delivered")) due.push("out_for_delivery");
  if (status === "delivered") due.push("delivered");
  if (status === "exception") due.push("delivery_exception");
  if (status === "returned") due.push("returned");

  const changed = status !== previous || merged.length !== stored.length;
  return { state: { status, events: merged, ...(deliveredAt ? { deliveredAt } : {}) }, changed, due };
}

export type CheckOutcome = "updated" | "unchanged" | "not_scanned" | "failed" | "skipped";

/**
 * Asks the carrier about one parcel and stores the result. Never throws: the
 * outcome says what happened. `force` ignores the minimum check interval
 * (used by the staff Refresh button).
 */
export async function checkShipmentTracking(shipmentId: string, options: { force?: boolean; now?: Date } = {}): Promise<{ outcome: CheckOutcome; message?: string }> {
  const now = options.now ?? new Date();
  try {
    await connectDB();
    const sh = await ExpressShipment.findById(shipmentId).lean<IExpressShipment>();
    if (!sh || sh.status !== "label_ready" || !sh.trackingNumber) return { outcome: "skipped" };
    if (isFinalTracking(sh.tracking?.status)) return { outcome: "skipped" };

    const last = sh.tracking?.lastCheckedAt?.getTime() ?? 0;
    if (!options.force && now.getTime() - last < MIN_CHECK_INTERVAL_MINUTES * 60_000) return { outcome: "skipped" };

    let result: TrackingResult;
    try {
      const bookedAt = sh.statusHistory?.find((h) => h.status === "label_ready")?.at ?? sh.createdAt;
      result = await getCarrierAdapter("dhl").track(sh.trackingNumber, { bookedAt: new Date(bookedAt).toISOString() });
    } catch (error) {
      // DHL has nothing for a parcel it has not scanned yet. That is normal, not a failure.
      if (error instanceof CarrierError && error.code === "not_found") {
        await ExpressShipment.updateOne({ _id: sh._id }, { $set: { "tracking.lastCheckedAt": now, "tracking.failures": 0 }, $unset: { "tracking.lastError": "" } });
        return { outcome: "not_scanned" };
      }
      const message = error instanceof CarrierError ? error.detail || error.message : error instanceof Error ? error.message : String(error);
      await ExpressShipment.updateOne({ _id: sh._id }, { $set: { "tracking.lastCheckedAt": now, "tracking.lastError": message.slice(0, 300) }, $inc: { "tracking.failures": 1 } });
      console.warn("[Express] Tracking check failed for", sh.reference, message);
      return { outcome: "failed", message };
    }

    const plan = planTrackingUpdate(sh.tracking, result);
    const set: Record<string, unknown> = {
      "tracking.status": plan.state.status,
      "tracking.events": plan.state.events,
      "tracking.lastCheckedAt": now,
      "tracking.failures": 0,
    };
    if (plan.changed) set["tracking.lastChangedAt"] = now;
    if (plan.state.deliveredAt) set["tracking.deliveredAt"] = plan.state.deliveredAt;
    await ExpressShipment.updateOne({ _id: sh._id }, { $set: set, $unset: { "tracking.lastError": "" } });

    // The atomic addToSet is the lock: whichever overlapping run claims a kind sends it, the other skips.
    for (const kind of plan.due) {
      const claimed = await ExpressShipment.updateOne({ _id: sh._id, "tracking.notified": { $ne: kind } }, { $addToSet: { "tracking.notified": kind } });
      if (claimed.modifiedCount === 1) await notifyShipmentEvent(String(sh._id), kind);
    }
    return { outcome: plan.changed ? "updated" : "unchanged" };
  } catch (error) {
    console.error("[Express] Tracking check error:", error);
    return { outcome: "failed", message: error instanceof Error ? error.message : String(error) };
  }
}

export interface TrackingRunSummary {
  checked: number;
  updated: number;
  unchanged: number;
  notScanned: number;
  failed: number;
  skipped: number;
}

/** The scheduled job: checks every label_ready parcel that is not yet delivered, least recently checked first. */
export async function syncExpressTracking(now: Date = new Date()): Promise<TrackingRunSummary> {
  await connectDB();
  const cutoff = new Date(now.getTime() - MIN_CHECK_INTERVAL_MINUTES * 60_000);
  const due = await ExpressShipment.find({
    status: "label_ready",
    trackingNumber: { $exists: true, $ne: "" },
    "tracking.status": { $nin: FINAL },
    $or: [{ "tracking.lastCheckedAt": { $exists: false } }, { "tracking.lastCheckedAt": { $lt: cutoff } }],
  })
    .sort({ "tracking.lastCheckedAt": 1 })
    .limit(BATCH_SIZE)
    .select("_id")
    .lean();

  const summary: TrackingRunSummary = { checked: 0, updated: 0, unchanged: 0, notScanned: 0, failed: 0, skipped: 0 };
  for (const d of due) {
    const { outcome } = await checkShipmentTracking(String(d._id), { now });
    summary.checked++;
    if (outcome === "updated") summary.updated++;
    else if (outcome === "unchanged") summary.unchanged++;
    else if (outcome === "not_scanned") summary.notScanned++;
    else if (outcome === "failed") summary.failed++;
    else summary.skipped++;
  }
  return summary;
}

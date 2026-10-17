import connectDB from "@/lib/mongoose";
import ExpressShipment, { type IExpressShipment } from "@/models/ExpressShipment";
import type { CarrierAdapter } from "@/lib/shipping/core/adapter";
import { CarrierError } from "@/lib/shipping/core/errors";
import type { ShipmentRequest } from "@/lib/shipping/core/types";
import { getCarrierAdapter } from "@/lib/shipping/registry";
import { labelKey, r2LabelStore, type LabelStore } from "./labelStore";
import { notifyShipmentEvent } from "./shipmentNotify";
import { contentTypeOf, productCodeFor } from "./contentType";

export interface FulfilDeps {
  adapter?: CarrierAdapter;
  store?: LabelStore;
  now?: () => Date;
}

/**
 *  ok       - DHL booked it and the label is stored: the booking is label_ready
 *  failed   - nothing was booked, or the label could not be stored; staff can retry or upload by hand
 *  unknown  - DHL may or may not have booked it (timeout); NEVER retried automatically
 *  skipped  - another request already handled or is handling this booking
 */
export type FulfilOutcome = "ok" | "failed" | "unknown" | "skipped";

const today = (now: Date) => now.toISOString().slice(0, 10);

/** The carrier request for a paid booking. The ship date can never be in the past by the time it is paid. */
export function buildShipmentRequest(sh: Pick<IExpressShipment, "reference" | "shipper" | "recipient" | "parcels" | "items" | "declaredValueCents" | "contentDescription" | "plannedShipDate" | "dutiesPayer" | "pickupRequested"> & { contentType?: "documents" | "goods" }, now: Date): ShipmentRequest {
  const contentType = contentTypeOf(sh.contentType);
  return {
    reference: sh.reference,
    contentType,
    serviceCode: productCodeFor(contentType),
    shipper: sh.shipper,
    recipient: sh.recipient,
    parcels: sh.parcels,
    items: sh.items,
    declaredValueCents: sh.declaredValueCents,
    contentDescription: sh.contentDescription,
    plannedShipDate: sh.plannedShipDate < today(now) ? today(now) : sh.plannedShipDate,
    dutiesPayer: sh.dutiesPayer,
    pickupRequested: sh.pickupRequested,
  };
}

async function putWithRetry(store: LabelStore, key: string, pdf: Buffer, attempts = 3): Promise<void> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      await store.put(key, pdf);
      return;
    } catch (error) {
      last = error;
      await new Promise((r) => setTimeout(r, 200 * (i + 1)));
    }
  }
  throw last;
}

/**
 * Books the paid shipment with DHL and stores the label, exactly once. Safe to
 * call twice (a duplicate webhook, a staff retry): the atomic claim lets only
 * one caller through, and the DHL reference is stable.
 */
export async function fulfilShipment(shipmentId: string, deps: FulfilDeps = {}): Promise<FulfilOutcome> {
  await connectDB();
  const now = deps.now ?? (() => new Date());
  const store = deps.store ?? r2LabelStore;

  // Claim: only a paid booking whose label work is not started, or failed, can proceed.
  const claimed = await ExpressShipment.findOneAndUpdate(
    {
      _id: shipmentId,
      status: "paid",
      $or: [{ "fulfilment.state": "none" }, { "fulfilment.state": "failed" }, { "fulfilment.state": { $exists: false } }],
    },
    { $set: { "fulfilment.state": "pending", "fulfilment.lastAttemptAt": now() }, $inc: { "fulfilment.attempts": 1 } },
    { returnDocument: "after" }
  ).lean<IExpressShipment>();
  if (!claimed) return "skipped";

  const fail = async (state: "failed" | "unknown", message: string): Promise<FulfilOutcome> => {
    await ExpressShipment.updateOne({ _id: shipmentId }, { $set: { "fulfilment.state": state, "fulfilment.lastError": message.slice(0, 500) } });
    console.error(`[Express] Label creation ${state} for ${claimed.reference}: ${message}`);
    return state;
  };

  // DHL already booked this parcel on an earlier attempt but the label was lost: booking again would create a second parcel.
  if (claimed.trackingNumber && !claimed.label) {
    return fail("failed", `DHL already booked this shipment (tracking ${claimed.trackingNumber}) but the label was not stored. Upload the label by hand; do not book again.`);
  }

  const adapter = deps.adapter ?? getCarrierAdapter("dhl");
  let result;
  try {
    result = await adapter.createShipment(buildShipmentRequest(claimed, now()));
  } catch (error) {
    if (error instanceof CarrierError && error.outcomeUnknown) {
      return fail("unknown", `DHL did not answer clearly (${error.code}). It may have booked the shipment: check with DHL before doing anything else.`);
    }
    const message = error instanceof CarrierError ? `DHL rejected the booking (${error.code}): ${error.detail || error.message}` : error instanceof Error ? error.message : String(error);
    return fail("failed", message);
  }

  // Save the tracking number first, so a storage problem can never lead to a second DHL booking.
  await ExpressShipment.updateOne(
    { _id: shipmentId },
    { $set: { trackingNumber: result.trackingNumber, trackingUrl: result.trackingUrl, ...(result.pickupConfirmation ? { pickupConfirmation: result.pickupConfirmation } : {}) } }
  );

  const pdf = Buffer.from(result.label.contentBase64, "base64");
  const key = labelKey(shipmentId);
  try {
    await putWithRetry(store, key, pdf);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return fail("failed", `DHL booked the shipment (tracking ${result.trackingNumber}) but the label could not be stored: ${message}. Upload the label by hand.`);
  }

  const done = await ExpressShipment.findOneAndUpdate(
    { _id: shipmentId, status: "paid" },
    {
      $set: {
        status: "label_ready",
        label: { key, source: "carrier", uploadedAt: now(), bytes: pdf.length },
        "fulfilment.state": "ok",
      },
      $unset: { "fulfilment.lastError": "" },
      $push: { statusHistory: { status: "label_ready", at: now(), by: "system" } },
    },
    { returnDocument: "after" }
  );
  if (!done) {
    // The booking left "paid" while we worked (it should not: cancel is blocked while pending).
    return fail("failed", "The booking changed while the label was being created. Check it and upload the label by hand if needed.");
  }

  await notifyShipmentEvent(shipmentId, "label_ready");
  return "ok";
}

/** Staff entered the tracking number and uploaded the label by hand (DHL not ready or a failure). */
export async function applyManualLabel(
  shipmentId: string,
  params: { trackingNumber: string; pdf: Buffer; staffId: string },
  deps: Pick<FulfilDeps, "store" | "now"> = {}
): Promise<{ ok: true } | { ok: false; code: "not_found" | "not_paid" | "in_progress" }> {
  await connectDB();
  const now = deps.now ?? (() => new Date());
  const store = deps.store ?? r2LabelStore;

  const sh = await ExpressShipment.findById(shipmentId).select("status fulfilment").lean<IExpressShipment>();
  if (!sh) return { ok: false, code: "not_found" };
  if (sh.status !== "paid") return { ok: false, code: "not_paid" };
  if (sh.fulfilment?.state === "pending") return { ok: false, code: "in_progress" };

  const key = labelKey(shipmentId);
  await putWithRetry(store, key, params.pdf);

  const trackingUrl = `https://www.dhl.com/ca-en/home/tracking.html?tracking-id=${encodeURIComponent(params.trackingNumber)}`;
  const updated = await ExpressShipment.findOneAndUpdate(
    { _id: shipmentId, status: "paid", "fulfilment.state": { $ne: "pending" } },
    {
      $set: {
        status: "label_ready",
        trackingNumber: params.trackingNumber,
        trackingUrl,
        label: { key, source: "manual", uploadedAt: now(), bytes: params.pdf.length },
        "fulfilment.state": "ok",
      },
      $unset: { "fulfilment.lastError": "" },
      $push: { statusHistory: { status: "label_ready", at: now(), by: params.staffId, note: "Label entered by staff" } },
    },
    { returnDocument: "after" }
  );
  if (!updated) return { ok: false, code: "in_progress" };

  await notifyShipmentEvent(shipmentId, "label_ready");
  return { ok: true };
}

import connectDB from "@/lib/mongoose";
import ExpressShipment, { type IExpressShipment } from "@/models/ExpressShipment";
import type { CarrierAdapter } from "@/lib/shipping/core/adapter";
import { CarrierError } from "@/lib/shipping/core/errors";
import { getCarrierAdapter } from "@/lib/shipping/registry";
import { hasActivePickup } from "./pickupState";

export { hasActivePickup };

export type PickupCancelState = "cancelled" | "already_cancelled" | "failed";

/**
 * What DHL says about a pickup we asked to cancel. "none" means there was nothing to cancel.
 * Cancelling a pickup never cancels the shipment or its label: the parcel can still be dropped off.
 */
export interface PickupCancelOutcome {
  state: PickupCancelState | "none";
  /** Staff-only detail when state is "failed". */
  error?: string;
}

/**
 * Asks DHL to cancel the booking's pickup and records the result. Repeating it is safe (DHL answers
 * "already cancelled"). Never throws: a DHL problem comes back as state "failed" so the caller can
 * carry on (a refund must never be blocked by DHL being down).
 */
export async function cancelDhlPickup(
  sh: Pick<IExpressShipment, "_id" | "status" | "pickupConfirmation" | "pickupCancelledAt" | "tracking" | "shipper">,
  actor: { id: string; staff: boolean },
  reason: string,
  adapter?: CarrierAdapter
): Promise<PickupCancelOutcome> {
  if (!sh.pickupConfirmation || sh.pickupCancelledAt) return { state: "none" };

  const requestorName = actor.staff ? "Transimex staff" : sh.shipper?.name || sh.shipper?.company || "Transimex customer";
  try {
    const result = await (adapter ?? getCarrierAdapter("dhl")).cancelPickup({
      confirmationNumber: sh.pickupConfirmation,
      requestorName,
      reason: reason || (actor.staff ? "Cancelled by Transimex" : "Cancelled by customer"),
    });
    const now = new Date();
    await ExpressShipment.updateOne(
      { _id: sh._id },
      {
        $set: { pickupCancelledAt: now, pickupCancelledBy: actor.id },
        $unset: { pickupCancelError: "" },
        $push: { statusHistory: { status: sh.status, at: now, by: actor.id, note: "DHL pickup cancelled" } },
      }
    );
    return { state: result.status };
  } catch (error) {
    const detail =
      error instanceof CarrierError ? `${error.code}${error.detail ? `: ${error.detail}` : ""}`.slice(0, 380) : error instanceof Error ? error.message.slice(0, 380) : String(error).slice(0, 380);
    console.error(`[Express] DHL pickup cancel failed for ${String(sh._id)}:`, detail);
    await ExpressShipment.updateOne({ _id: sh._id }, { $set: { pickupCancelError: detail } }).catch(() => undefined);
    return { state: "failed", error: detail };
  }
}

export type PickupCancelResult =
  | { ok: true; state: "cancelled" | "already_cancelled" }
  | { ok: false; code: "not_found" | "conflict" | "carrier_failed"; status: number; message: string };

const fail = (code: Extract<PickupCancelResult, { ok: false }>["code"], status: number, message: string): PickupCancelResult => ({ ok: false, code, status, message });

/**
 * Cancels only the DHL pickup of a booking, for its owner or for staff. No money moves: the booking, label and
 * payment stay as they are, and the parcel can be dropped off at DHL instead. Staff may also use it on a cancelled
 * booking whose automatic pickup cancel failed.
 */
export async function cancelShipmentPickup(params: {
  shipmentId: string;
  actor: { id: string; staff: boolean };
  reason?: string;
  adapter?: CarrierAdapter;
}): Promise<PickupCancelResult> {
  await connectDB();
  const { actor } = params;
  const sh = await ExpressShipment.findById(params.shipmentId).lean<IExpressShipment>().catch(() => null);
  if (!sh || (!actor.staff && sh.userId !== actor.id)) return fail("not_found", 404, "Shipment not found");

  const allowedStatus = sh.status === "label_ready" || (actor.staff && sh.status === "cancelled");
  if (!allowedStatus) return fail("conflict", 409, "This booking has no DHL pickup to cancel.");
  if (!sh.pickupRequested || !sh.pickupConfirmation) return fail("conflict", 409, "No DHL pickup was booked for this shipment.");
  if (sh.pickupCancelledAt) return { ok: true, state: "already_cancelled" };
  if (!hasActivePickup(sh)) return fail("conflict", 409, "DHL has already collected this parcel.");

  const outcome = await cancelDhlPickup(sh, actor, params.reason ?? "", params.adapter);
  if (outcome.state === "failed") {
    return fail("carrier_failed", 502, actor.staff ? `DHL could not cancel the pickup: ${outcome.error}` : "We could not cancel the pickup with DHL. Please contact us.");
  }
  return { ok: true, state: outcome.state === "already_cancelled" ? "already_cancelled" : "cancelled" };
}

import type { IExpressShipment } from "@/models/ExpressShipment";

/** A parcel DHL has scanned has been collected, so there is no pickup left to cancel. */
const COLLECTED = new Set(["in_transit", "out_for_delivery", "delivered", "exception", "returned"]);

/** True while a booked DHL pickup can still be cancelled. Pure, so DTOs and tests can use it without a database. */
export const hasActivePickup = (sh: Pick<IExpressShipment, "pickupConfirmation" | "pickupCancelledAt" | "tracking">) =>
  Boolean(sh.pickupConfirmation) && !sh.pickupCancelledAt && !COLLECTED.has(sh.tracking?.status ?? "unknown");

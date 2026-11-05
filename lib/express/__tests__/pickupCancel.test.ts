import { describe, expect, it } from "vitest";
import { hasActivePickup } from "../pickupState";

describe("when a DHL pickup can still be cancelled", () => {
  const booked = { pickupConfirmation: "PRG1" };

  it("is cancellable while the parcel is waiting for the courier", () => {
    expect(hasActivePickup({ ...booked })).toBe(true);
    expect(hasActivePickup({ ...booked, tracking: { status: "unknown" } as any })).toBe(true);
    expect(hasActivePickup({ ...booked, tracking: { status: "pre_transit" } as any })).toBe(true);
  });

  it("is not once DHL has collected the parcel", () => {
    for (const status of ["in_transit", "out_for_delivery", "delivered", "exception", "returned"]) {
      expect(hasActivePickup({ ...booked, tracking: { status } as any }), status).toBe(false);
    }
  });

  it("is not when no pickup was booked or it was already cancelled", () => {
    expect(hasActivePickup({})).toBe(false);
    expect(hasActivePickup({ ...booked, pickupCancelledAt: new Date() })).toBe(false);
  });
});

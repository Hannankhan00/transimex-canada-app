import { describe, it, expect } from "vitest";
import { cmaCgmAdapter } from "../adapters";
import { splitByContainer } from "../adapters/cmacgm";
import { InMemoryTrackingStore, ReferenceLookupNotSupportedError, syncReferenceTracking } from "../pipeline";
import { CarrierAdapter } from "../adapters/types";
import { CarrierCode } from "../schema";
import { buildCmaCgmFixture } from "./fixtures/cmacgm.fixture";

// A booking with two containers: each container's equipment events, plus the
// vessel moves (no equipment reference) that apply to the whole booking.
function twoContainerBooking() {
  const a = buildCmaCgmFixture("CMAU1110001");
  const b = buildCmaCgmFixture("CMAU1110002").filter((e) => e.equipmentReference);
  return [...a, ...b];
}

describe("CMA CGM booking lookup", () => {
  it("keeps the vessel on the booking and splits out one result per container", () => {
    const { booking, containers } = splitByContainer(twoContainerBooking(), "CAN1028600");

    expect(booking.containerNumber).toBe("CAN1028600");
    expect(booking.vesselName).toBe("CMA CGM BRAZIL");
    expect(booking.imoNumber).toBe("9454448");
    expect(booking.portRotation.map((p) => p.vesselName)).toContain("CMA CGM DAKAR EXPRESS");

    expect(containers.map((c) => c.tracking.containerNumber)).toEqual(["CMAU1110001", "CMAU1110002"]);
    for (const c of containers) {
      expect(c.tracking.vesselName).toBe("CMA CGM BRAZIL");
      expect(c.tracking.destinationPort?.unLocationCode).toBe("SNDKR");
    }
  });

  it("handles a booking before any container is assigned (vessel moves only)", () => {
    const vesselOnly = buildCmaCgmFixture("CMAU1110003").filter((e) => !e.equipmentReference);
    const { booking, containers } = splitByContainer(vesselOnly, "CAN1028601");

    expect(containers).toHaveLength(0);
    expect(booking.containerNumber).toBe("CAN1028601");
    expect(booking.vesselName).toBeTruthy();
  });

  it("never treats a booking reference or non-ISO string in equipmentReference as a container", () => {
    const rawWithBookingAsEquipment = buildCmaCgmFixture("CMAU1110003").map((e) => ({
      ...e,
      equipmentReference: "CAN1029559",
    }));
    const { booking, containers } = splitByContainer(rawWithBookingAsEquipment, "CAN1029559");

    expect(containers).toHaveLength(0);
    expect(booking.vesselName).toBeTruthy();
  });

  it("caches every container and returns the booking with its vessel", async () => {
    const store = new InMemoryTrackingStore();
    const adapter: CarrierAdapter = {
      ...cmaCgmAdapter,
      fetchByReference: async (ref) => splitByContainer(twoContainerBooking(), ref),
    };

    const { booking, containers } = await syncReferenceTracking("CAN1028600", "CMA_CGM", {
      store,
      getAdapter: () => adapter,
    });

    expect(booking.reference).toBe("CAN1028600");
    expect(booking.vesselName).toBe("CMA CGM BRAZIL");
    expect(booking.containerNumbers).toEqual(["CMAU1110001", "CMAU1110002"]);
    expect(booking.status).toBe("IN_TRANSIT");
    expect(containers).toHaveLength(2);
    expect((await store.get("CMAU1110002"))?.carrierDetectionSource).toBe("explicit");
  });

  it("refuses carriers that have no reference lookup", async () => {
    const noLookup = (carrier: CarrierCode): CarrierAdapter => ({ ...cmaCgmAdapter, carrier, fetchByReference: undefined });
    await expect(
      syncReferenceTracking("123456789", "MAERSK", { store: new InMemoryTrackingStore(), getAdapter: noLookup })
    ).rejects.toThrow(ReferenceLookupNotSupportedError);
  });
});

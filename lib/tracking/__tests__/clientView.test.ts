import { describe, it, expect } from "vitest";
import { splitByContainer } from "../adapters/cmacgm";
import { deriveStatus, ContainerTracking } from "../schema";
import { toClientContainerView, toClientVesselView } from "../clientView";
import { buildCmaCgmFixture } from "./fixtures/cmacgm.fixture";

const REFERENCE = "CAN1028600";

function bookingAndContainer() {
  const { booking, containers } = splitByContainer(buildCmaCgmFixture("CMAU1110001"), REFERENCE);
  const c = containers[0].tracking;
  const container: ContainerTracking = {
    ...c,
    carrierDetectionSource: "explicit",
    status: deriveStatus(c.events),
    lastSyncedAt: "2026-09-30T00:00:00Z",
    raw: [{ carrier: "CMA_CGM", fetchedAt: "2026-09-30T00:00:00Z", payload: { secret: "raw" } }],
  };
  const storedBooking = { ...booking, reference: REFERENCE, status: deriveStatus(booking.events), lastSyncedAt: null };
  return { container, storedBooking };
}

// Everything a client must never see: the carrier, its references, its raw data.
function expectNoCarrierData(view: unknown) {
  const json = JSON.stringify(view);
  expect(json).not.toMatch(/CMA_CGM|"carrier"|carrierDetectionSource|"raw"|bookingNumber|blNumber|"reference"/);
  expect(json).not.toContain(REFERENCE);
  expect(json).not.toContain("MTL0033445"); // booking number inside the carrier data
}

describe("client-facing tracking views", () => {
  it("container view keeps the vessel and route but drops carrier, references and raw data", () => {
    const view = toClientContainerView(bookingAndContainer().container)!;
    expect(view.vesselName).toBe("CMA CGM BRAZIL");
    expect(view.imoNumber).toBe("9454448");
    expect(view.destinationPort?.portName).toBe("Dakar");
    expect(view.events.length).toBeGreaterThan(0);
    expectNoCarrierData(view);
  });

  it("vessel view shows vessel, IMO, route legs and arrival without the booking reference", () => {
    const view = toClientVesselView(bookingAndContainer().storedBooking)!;
    expect(view.vesselName).toBe("CMA CGM BRAZIL");
    expect(view.imoNumber).toBe("9454448");
    expect(view.legs.map((l) => l.portName)).toEqual(["Montreal", "Algeciras", "Dakar"]);
    expect(view.arrival).toEqual({ dateTime: expect.any(String), actual: false });
    expectNoCarrierData(view);
  });

  it("returns null when there is no booking or tracking yet or invalid container number", () => {
    expect(toClientVesselView(undefined)).toBeNull();
    expect(toClientContainerView(null)).toBeNull();
    expect(toClientContainerView({ ...bookingAndContainer().container, containerNumber: "CAN1029559" })).toBeNull();
  });
});

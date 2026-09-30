import { describe, it, expect } from "vitest";
import { splitByContainer } from "../adapters/cmacgm";
import { toClientVesselView } from "../clientView";
import { deriveStatus } from "../schema";
import { computeVoyageProgress, formatPortName, VoyageEvent } from "../voyageProgress";
import { buildCmaCgmFixture } from "./fixtures/cmacgm.fixture";

// Montreal -> Algeciras (transshipment) -> Dakar. The fixture has the cargo
// arrived at Algeciras (actual) with the onward leg still estimated.
function vessel() {
  const { booking } = splitByContainer(buildCmaCgmFixture("CMAU1110001"), "CAN1028600");
  return toClientVesselView({ ...booking, status: deriveStatus(booking.events), lastSyncedAt: null })!;
}

const withClassifier = (events: VoyageEvent[], fn: (e: VoyageEvent) => VoyageEvent["eventClassifierCode"]) =>
  events.map((e) => ({ ...e, eventClassifierCode: fn(e) }));

describe("computeVoyageProgress", () => {
  it("is at the transshipment port, featuring the onward vessel", () => {
    const v = vessel();
    const p = computeVoyageProgress(v.legs, v.events);
    expect(p.phase).toBe("AT_PORT");
    expect(p.lastReached).toBe(1);
    expect(p.featuredVessel?.vesselName).toBe("CMA CGM DAKAR EXPRESS");
    expect(p.ports[0].moment).toMatchObject({ kind: "departure", actual: true });
    expect(p.ports[2].moment).toMatchObject({ kind: "arrival", actual: false });
  });

  it("is at sea on the first leg once departed but before the next arrival", () => {
    const v = vessel();
    const events = withClassifier(v.events, (e) =>
      e.location.unLocationCode === "CAMTR" ? e.eventClassifierCode : "EST"
    );
    const p = computeVoyageProgress(v.legs, events);
    expect(p.phase).toBe("AT_SEA");
    expect(p.sailingLeg).toBe(0);
    expect(p.featuredVessel?.vesselName).toBe("CMA CGM BRAZIL");
    expect(p.featuredVessel?.imoNumber).toBe("9454448");
  });

  it("awaits departure while every event is still estimated", () => {
    const v = vessel();
    const p = computeVoyageProgress(v.legs, withClassifier(v.events, () => "EST"));
    expect(p.phase).toBe("AWAITING_DEPARTURE");
    expect(p.lastReached).toBe(-1);
  });

  it("has arrived once the destination reports an actual event", () => {
    const v = vessel();
    const p = computeVoyageProgress(v.legs, withClassifier(v.events, () => "ACT"));
    expect(p.phase).toBe("ARRIVED");
    expect(p.lastReached).toBe(2);
  });

  it("carries an IMO number for each leg's vessel", () => {
    expect(vessel().legs.map((l) => l.imoNumber)).toEqual(["9454448", "9706906", "9706906"]);
  });
});

describe("formatPortName", () => {
  it("title-cases carrier port names but keeps region codes", () => {
    expect(formatPortName("MONTREAL, QC")).toBe("Montreal, QC");
    expect(formatPortName("TANGER MED")).toBe("Tanger Med");
    expect(formatPortName("DOUALA")).toBe("Douala");
  });
});

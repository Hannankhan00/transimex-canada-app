import { describe, it, expect } from "vitest";
import { maerskAdapter, cmaCgmAdapter, mscAdapter } from "../adapters";
import { deriveStatus } from "../schema";

describe("maerskAdapter (mock mode)", () => {
  it("normalizes the DCSA-style fixture into the internal schema", async () => {
    const { tracking, rawPayload } = await maerskAdapter.fetchTracking("MAEU7654321");

    expect(tracking.containerNumber).toBe("MAEU7654321");
    expect(tracking.carrier).toBe("MAERSK");
    expect(tracking.containerSizeType).toBe("42G1");
    expect(tracking.portRotation.map((p) => p.role)).toEqual(["ORIGIN", "TRANSSHIPMENT", "DESTINATION"]);
    expect(tracking.events.length).toBeGreaterThan(0);
    expect(tracking.events.every((e) => ["PLN", "EST", "ACT"].includes(e.eventClassifierCode))).toBe(true);
    expect(rawPayload).toBeTruthy();

    // In transit: some actual events, no actual DELIVERED.
    expect(deriveStatus(tracking.events)).toBe("IN_TRANSIT");
  });
});

describe("cmaCgmAdapter (mock mode)", () => {
  it("normalizes CMA CGM's status-label events into the internal schema", async () => {
    const { tracking } = await cmaCgmAdapter.fetchTracking("CMAU2233445");

    expect(tracking.containerNumber).toBe("CMAU2233445");
    expect(tracking.carrier).toBe("CMA_CGM");
    expect(tracking.originPort?.portName).toBe("Montreal");
    expect(tracking.destinationPort?.portName).toBe("Dakar");
    const eventTypes = tracking.events.map((e) => e.eventType);
    expect(eventTypes).toContain("BOOKING");
    expect(eventTypes).toContain("TRANSSHIPMENT");
  });
});

describe("mscAdapter (mock mode)", () => {
  it("normalizes MSC's milestone codes and resolves port codes by name", async () => {
    const { tracking } = await mscAdapter.fetchTracking("MSCU9988776");

    expect(tracking.containerNumber).toBe("MSCU9988776");
    expect(tracking.carrier).toBe("MSC");
    expect(tracking.destinationPort?.portName).toBe("Matadi");

    const transshipmentEvent = tracking.events.find((e) => e.eventType === "TRANSSHIPMENT");
    expect(transshipmentEvent?.location.unLocationCode).toBe("BEANR");
  });
});

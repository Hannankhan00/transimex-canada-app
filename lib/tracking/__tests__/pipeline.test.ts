import { describe, it, expect, beforeEach } from "vitest";
import {
  syncContainerTracking,
  applyWebhookPayload,
  getCachedTracking,
  InMemoryTrackingStore,
  UnknownCarrierError,
} from "../pipeline";
import { buildMscFixture } from "../adapters/fixtures/msc.fixture";

/**
 * End-to-end pipeline coverage: detect carrier -> fetch (mock adapter) ->
 * normalize -> cache -> display (read back through the same cache the UI
 * reads). This is the "whole pipeline" check that has to pass before any
 * real carrier credentials exist.
 */
describe("tracking pipeline (mock adapters, in-memory cache)", () => {
  let store: InMemoryTrackingStore;

  beforeEach(() => {
    store = new InMemoryTrackingStore();
  });

  it("detects the carrier from the container prefix, fetches, normalizes, and caches", async () => {
    const tracking = await syncContainerTracking("MAEU1234567", undefined, { store });

    expect(tracking.carrier).toBe("MAERSK");
    expect(tracking.carrierDetectionSource).toBe("prefix");
    expect(tracking.containerNumber).toBe("MAEU1234567");
    expect(tracking.status).toBe("IN_TRANSIT");
    expect(tracking.lastSyncedAt).toBeTruthy();
    expect(tracking.raw).toHaveLength(1);
    expect(tracking.raw[0].carrier).toBe("MAERSK");

    // Display layer: reads only the cache, never touches the adapter again.
    const displayed = await getCachedTracking("MAEU1234567", { store });
    expect(displayed).toEqual(tracking);
  });

  it("prefers an explicit carrier over the prefix guess", async () => {
    // MSCU prefix would normally resolve to MSC — force CMA_CGM explicitly.
    const tracking = await syncContainerTracking("MSCU1234567", "CMA_CGM", { store });
    expect(tracking.carrier).toBe("CMA_CGM");
    expect(tracking.carrierDetectionSource).toBe("explicit");
  });

  it("throws UnknownCarrierError for an unrecognized prefix with no explicit carrier", async () => {
    await expect(syncContainerTracking("ZZZZ1234567", undefined, { store })).rejects.toThrow(UnknownCarrierError);
  });

  it("keeps a bounded history of raw payloads across repeated syncs", async () => {
    for (let i = 0; i < 3; i++) {
      await syncContainerTracking("MAEU1234567", undefined, { store, maxRawHistory: 2 });
    }
    const tracking = await getCachedTracking("MAEU1234567", { store });
    expect(tracking?.raw).toHaveLength(2);
  });

  it("applies a webhook payload straight to the cache without calling fetchTracking", async () => {
    const payload = buildMscFixture("MSCU5566778");
    const tracking = await applyWebhookPayload("MSC", payload, { store });

    expect(tracking.containerNumber).toBe("MSCU5566778");
    expect(tracking.carrier).toBe("MSC");

    const displayed = await getCachedTracking("MSCU5566778", { store });
    expect(displayed?.containerNumber).toBe("MSCU5566778");
  });

  it("end-to-end across all three carriers via their owner prefixes", async () => {
    const maersk = await syncContainerTracking("MAEU1111111", undefined, { store });
    const cmaCgm = await syncContainerTracking("CMAU2222222", undefined, { store });
    const msc = await syncContainerTracking("MSCU3333333", undefined, { store });

    expect([maersk.carrier, cmaCgm.carrier, msc.carrier]).toEqual(["MAERSK", "CMA_CGM", "MSC"]);
    for (const containerNumber of ["MAEU1111111", "CMAU2222222", "MSCU3333333"]) {
      const cached = await getCachedTracking(containerNumber, { store });
      expect(cached?.events.length).toBeGreaterThan(0);
    }
  });
});

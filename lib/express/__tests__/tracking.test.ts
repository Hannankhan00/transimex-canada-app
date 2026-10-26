import { describe, expect, it, vi } from "vitest";

// These tests never touch a database; the real helper refuses to load without a connection string.
vi.mock("@/lib/mongoose", () => ({ default: async () => undefined }));

import { isFinalTracking, planTrackingUpdate } from "../trackingService";
import { attentionReasons, toAdminShipmentDTO, toClientShipmentDTO } from "../shipmentDto";
import { MockDhlAdapter } from "@/lib/shipping/__tests__/support/fakeDhl";
import type { TrackingResult } from "@/lib/shipping/core/types";

const HOUR = 3_600_000;
const result = (events: { h: number; status: TrackingResult["status"]; description: string }[]): TrackingResult => ({
  trackingNumber: "MOCK1",
  status: events[0]?.status ?? "unknown",
  events: events.map((e) => ({ timestamp: new Date(Date.UTC(2026, 9, 1) + e.h * HOUR).toISOString(), status: e.status, description: e.description })),
});

describe("planTrackingUpdate", () => {
  it("starts quietly: pre_transit sends nothing", () => {
    const plan = planTrackingUpdate(undefined, result([{ h: 0, status: "pre_transit", description: "Shipment information received" }]));
    expect(plan.state.status).toBe("pre_transit");
    expect(plan.changed).toBe(true);
    expect(plan.due).toEqual([]);
  });

  it("is idempotent: the same result twice changes nothing", () => {
    const r = result([{ h: 12, status: "in_transit", description: "Picked up" }, { h: 0, status: "pre_transit", description: "Info received" }]);
    const first = planTrackingUpdate(undefined, r);
    const second = planTrackingUpdate(first.state, r);
    expect(second.changed).toBe(false);
    expect(second.state.events).toHaveLength(2);
  });

  it("keeps events newest first and appends only the new ones", () => {
    const a = planTrackingUpdate(undefined, result([{ h: 0, status: "pre_transit", description: "Info received" }]));
    const b = planTrackingUpdate(a.state, result([{ h: 36, status: "in_transit", description: "Departed" }, { h: 0, status: "pre_transit", description: "Info received" }]));
    expect(b.state.events.map((e) => e.description)).toEqual(["Departed", "Info received"]);
    expect(b.changed).toBe(true);
    expect(b.state.status).toBe("in_transit");
  });

  it("a job that missed days still owes every milestone before delivered", () => {
    const plan = planTrackingUpdate(undefined, result([{ h: 108, status: "delivered", description: "Delivered" }, { h: 12, status: "in_transit", description: "Picked up" }]));
    expect(plan.due).toEqual(["in_transit", "out_for_delivery", "delivered"]);
    expect(plan.state.deliveredAt?.toISOString()).toBe(new Date(Date.UTC(2026, 9, 1) + 108 * HOUR).toISOString());
  });

  it("an exception asks for the exception message only", () => {
    const plan = planTrackingUpdate(undefined, result([{ h: 40, status: "exception", description: "Customs hold" }, { h: 12, status: "in_transit", description: "Picked up" }]));
    expect(plan.state.status).toBe("exception");
    expect(plan.due).toEqual(["in_transit", "delivery_exception"]);
  });

  it("delivered and returned never go backwards", () => {
    const done = planTrackingUpdate(undefined, result([{ h: 100, status: "delivered", description: "Delivered" }]));
    const odd = planTrackingUpdate(done.state, result([{ h: 120, status: "in_transit", description: "Late scan" }, { h: 100, status: "delivered", description: "Delivered" }]));
    expect(odd.state.status).toBe("delivered");
    expect(isFinalTracking(odd.state.status)).toBe(true);
    expect(isFinalTracking("exception")).toBe(false);
  });

  it("ignores events with an unreadable time", () => {
    const plan = planTrackingUpdate(undefined, { trackingNumber: "X", status: "in_transit", events: [{ timestamp: "garbage", status: "in_transit", description: "Bad" }] });
    expect(plan.state.events).toHaveLength(0);
  });
});

describe("mock carrier tracking with the bookedAt hint", () => {
  it("ages from the booking time even after a restart", async () => {
    const booked = Date.UTC(2026, 9, 1);
    const adapter = new MockDhlAdapter({ now: () => booked + 100 * HOUR });
    const t = await adapter.track("MOCK0000000001", { bookedAt: new Date(booked).toISOString() });
    expect(t.status).toBe("out_for_delivery");
    expect(t.events[0].status).toBe("out_for_delivery");
  });

  it("an unknown number is not_found", async () => {
    await expect(new MockDhlAdapter().track("ZZ1")).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("tracking in the DTOs", () => {
  const base = {
    _id: "1",
    reference: "EX-1",
    status: "label_ready" as const,
    userId: "u",
    accountId: "a",
    accountType: "b2c" as const,
    trackingNumber: "MOCK1",
    statusHistory: [{ status: "label_ready" as const, at: new Date(Date.now() - 12 * 86_400_000), by: "system" }],
  };

  it("client sees null until DHL has scanned, then the events", () => {
    expect(toClientShipmentDTO(base as any).tracking).toBeNull();
    const dto = toClientShipmentDTO({ ...base, tracking: { status: "in_transit", failures: 0, notified: ["in_transit"], events: [{ at: new Date(), status: "in_transit", description: "Picked up" }] } } as any);
    expect(dto.tracking?.events).toHaveLength(1);
    expect(JSON.stringify(dto)).not.toContain("notified");
  });

  it("staff are told about an exception, repeated failures and a parcel DHL never scanned", () => {
    expect(attentionReasons(base as any)).toEqual(["no_scan"]);
    const scanned = { ...base, tracking: { status: "exception", failures: 5, notified: [], events: [{ at: new Date(), status: "exception", description: "Hold" }] } };
    expect(attentionReasons(scanned as any)).toEqual(["delivery_exception", "tracking_failing"]);
    expect(attentionReasons({ ...scanned, tracking: { ...scanned.tracking, status: "in_transit", failures: 0 } } as any)).toEqual([]);
  });

  it("staff DTO carries the check error, the client DTO does not", () => {
    const doc = { ...base, tracking: { status: "in_transit", failures: 2, lastError: "boom", notified: [], events: [] } };
    expect(toAdminShipmentDTO(doc as any).trackingCheck.lastError).toBe("boom");
    expect(JSON.stringify(toClientShipmentDTO(doc as any))).not.toContain("boom");
  });
});

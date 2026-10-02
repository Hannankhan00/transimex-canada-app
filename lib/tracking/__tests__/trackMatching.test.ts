import { describe, it, expect } from "vitest";

const ISO_CONTAINER_RE = /^[A-Z]{4}\d{7}$/;

function isIsoContainerNumber(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return ISO_CONTAINER_RE.test(value.trim().toUpperCase());
}

function matchedOn(shipment: any, query: string): string {
  const normQuery = query.trim().toUpperCase();
  const eq = (v: unknown) => typeof v === "string" && v.trim().toUpperCase() === normQuery;

  if (eq(shipment.trackingNumber)) return "TRACKING_NUMBER";
  if (eq(shipment.carrierBooking?.reference)) return "BOOKING_REFERENCE";

  const hasMatchingContainer = (shipment.containers || []).some((c: any) => eq(c?.containerNumber));
  if (hasMatchingContainer) {
    return isIsoContainerNumber(normQuery) ? "CONTAINER_NUMBER" : "BOOKING_REFERENCE";
  }

  return isIsoContainerNumber(normQuery) ? "CONTAINER_NUMBER" : "BOOKING_REFERENCE";
}

function filterContainers(containers: any[], bookingRef?: string): string[] {
  const normBookingRef = bookingRef?.trim().toUpperCase();
  return (containers || [])
    .map((c: any) => (typeof c === "string" ? c : c?.containerNumber))
    .map((num: unknown) => (typeof num === "string" ? num.trim().toUpperCase() : ""))
    .filter((num: string): num is string => Boolean(num && isIsoContainerNumber(num) && num !== normBookingRef));
}

describe("Tracking API matchedOn & container filtering", () => {
  it("reports BOOKING_REFERENCE when searched by booking reference", () => {
    const shipment = {
      trackingNumber: "TMX-2026-00042",
      carrierBooking: { reference: "CAN1029559" },
      containers: [],
    };
    expect(matchedOn(shipment, "CAN1029559")).toBe("BOOKING_REFERENCE");
  });

  it("reports BOOKING_REFERENCE even if the booking reference was stored in shipment.containers", () => {
    const shipment = {
      trackingNumber: "TMX-2026-00042",
      carrierBooking: null,
      containers: [{ containerNumber: "CAN1029559" }],
    };
    expect(matchedOn(shipment, "CAN1029559")).toBe("BOOKING_REFERENCE");
  });

  it("reports CONTAINER_NUMBER only when searched by a genuine ISO 6346 container number", () => {
    const shipment = {
      trackingNumber: "TMX-2026-00042",
      carrierBooking: { reference: "CAN1027341" },
      containers: [{ containerNumber: "CMAU1234567" }],
    };
    expect(matchedOn(shipment, "CMAU1234567")).toBe("CONTAINER_NUMBER");
  });

  it("reports TRACKING_NUMBER when searched by Transimex tracking ID", () => {
    const shipment = {
      trackingNumber: "TMX-2026-00042",
      carrierBooking: { reference: "CAN1027341" },
      containers: [{ containerNumber: "CMAU1234567" }],
    };
    expect(matchedOn(shipment, "TMX-2026-00042")).toBe("TRACKING_NUMBER");
  });

  it("filters out booking references and non-ISO strings from container list, returning empty array", () => {
    const containers = [{ containerNumber: "CAN1029559" }];
    const valid = filterContainers(containers, "CAN1029559");
    expect(valid).toEqual([]);
  });

  it("keeps only genuine ISO 6346 containers", () => {
    const containers = [
      { containerNumber: "CAN1027341" }, // booking ref accidentally in containers
      { containerNumber: "CMAU1234567" }, // real container
    ];
    const valid = filterContainers(containers, "CAN1027341");
    expect(valid).toEqual(["CMAU1234567"]);
  });
});

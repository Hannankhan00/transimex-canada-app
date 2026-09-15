import { describe, it, expect } from "vitest";
import { detectCarrier, ownerPrefix } from "../carrierDetection";

describe("detectCarrier", () => {
  it("prefers an explicit carrier over the prefix guess", () => {
    const result = detectCarrier("MSCU1234567", "MAERSK");
    expect(result).toEqual({ carrier: "MAERSK", source: "explicit" });
  });

  it("falls back to the owner prefix when no explicit carrier is given", () => {
    expect(detectCarrier("MAEU1234567")).toEqual({ carrier: "MAERSK", source: "prefix" });
    expect(detectCarrier("MSCU1234567")).toEqual({ carrier: "MSC", source: "prefix" });
    expect(detectCarrier("CMAU1234567")).toEqual({ carrier: "CMA_CGM", source: "prefix" });
    expect(detectCarrier("CGMU1234567")).toEqual({ carrier: "CMA_CGM", source: "prefix" });
  });

  it("is case-insensitive on the prefix", () => {
    expect(detectCarrier("maeu1234567")).toEqual({ carrier: "MAERSK", source: "prefix" });
  });

  it("returns unknown for an unrecognized prefix with no explicit carrier", () => {
    expect(detectCarrier("ZZZZ1234567")).toEqual({ carrier: null, source: "unknown" });
  });

  it("explicit carrier of null/undefined falls through to prefix detection", () => {
    expect(detectCarrier("MAEU1234567", null)).toEqual({ carrier: "MAERSK", source: "prefix" });
    expect(detectCarrier("MAEU1234567", undefined)).toEqual({ carrier: "MAERSK", source: "prefix" });
  });
});

describe("ownerPrefix", () => {
  it("extracts and uppercases the first 4 characters", () => {
    expect(ownerPrefix("maeu1234567")).toBe("MAEU");
  });
});

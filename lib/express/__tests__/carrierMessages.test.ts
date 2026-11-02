import { describe, expect, it } from "vitest";
import { CarrierError, carrierErrorFromStatus } from "@/lib/shipping/core/errors";
import { classifyCarrierError, classifyLabelIssue, QUOTE_PROBLEM } from "../carrierMessages";
import { quoteErrorText } from "../quoteErrorText";
import { QuoteError, priceRequest } from "../quoteService";
import { toClientShipmentDTO } from "../shipmentDto";
import { quoteRequestSchema } from "../quoteSchemas";
import { MockDhlAdapter } from "@/lib/shipping/__tests__/support/fakeDhl";

const fromDhl = (status: number, detail: string) => carrierErrorFromStatus(status, JSON.stringify({ detail }));

describe("explaining DHL's answer to a client", () => {
  it("treats 'product not available' answers as a normal 'DHL does not offer this here'", () => {
    for (const text of ["996: The requested product(s) not available for the requested postal location", "1001: product not available", "410137: filtered out on delivery"]) {
      expect(classifyCarrierError(fromDhl(404, text))).toBe("route_unavailable");
    }
    expect(classifyCarrierError(new CarrierError("not_serviced", "No DHL service for this route."))).toBe("route_unavailable");
  });

  it("points at the postal code, city, parcel, date or customs details when DHL names them", () => {
    expect(classifyCarrierError(fromDhl(400, "Postal code 12345 is invalid for country CA"))).toBe("bad_postal_code");
    expect(classifyCarrierError(fromDhl(400, "destinationCityName is not valid"))).toBe("bad_city");
    expect(classifyCarrierError(fromDhl(400, "Package weight exceeds the maximum allowed"))).toBe("parcel_limits");
    expect(classifyCarrierError(fromDhl(400, "plannedShippingDate must not be in the past"))).toBe("date_unavailable");
    expect(classifyCarrierError(fromDhl(404, "996: The requested product(s) not available for the requested pickup date."))).toBe("date_unavailable");
    expect(classifyCarrierError(fromDhl(400, "declaredValue is required for dutiable shipments"))).toBe("customs_info");
  });

  it("calls a busy or unreachable DHL 'try again', and our own setup problems 'our setup'", () => {
    expect(classifyCarrierError(new CarrierError("timeout", "DHL request timed out."))).toBe("try_again");
    expect(classifyCarrierError(carrierErrorFromStatus(503))).toBe("try_again");
    expect(classifyCarrierError(carrierErrorFromStatus(429))).toBe("try_again");
    expect(classifyCarrierError(carrierErrorFromStatus(401))).toBe("our_setup");
    expect(classifyCarrierError(fromDhl(400, "8009: Account is not IMP enabled"))).toBe("our_setup");
    expect(classifyCarrierError(fromDhl(403, "8032: Not authorized to use this service"))).toBe("our_setup");
  });

  it("says plainly that DHL refused when its answer gives no reason", () => {
    expect(classifyCarrierError(fromDhl(400, "Something unexpected"))).toBe("rejected");
  });

  it("never puts DHL's own words in what the client reads", () => {
    for (const problem of Object.values(QUOTE_PROBLEM)) {
      expect(problem.message).not.toMatch(/\b\d{3,6}:|filtered|sandbox|mydhl/i);
    }
  });

  it("every problem has a sentence in the client's language for its code", () => {
    const b: Record<string, string> = { errNotServiced: "ns", errBadPostal: "bp", errBadCity: "bc", errParcelLimits: "pl", errDate: "d", errCustoms: "c", errRejected: "r", errCarrierDown: "down", errRateLimited: "rl" };
    for (const problem of Object.values(QUOTE_PROBLEM)) {
      expect(quoteErrorText(problem.code, b, "fallback")).not.toBe("fallback");
    }
    expect(quoteErrorText("something_else", b, "fallback")).toBe("fallback");
  });
});

describe("quoting with a DHL refusal", () => {
  const input = quoteRequestSchema.parse({
    origin: { countryCode: "CA", postalCode: "H3B 1A1", city: "Montreal" },
    destination: { countryCode: "CM", postalCode: "00237", city: "Douala" },
    parcels: [{ weightKg: 1, lengthCm: 10, widthCm: 10, heightCm: 10 }],
    declaredValueCents: 5000,
    isCustomsDeclarable: true,
    pickupRequested: false,
  });
  const failing = (error: CarrierError) => {
    const adapter = new MockDhlAdapter();
    adapter.getRates = async () => {
      throw error;
    };
    return priceRequest({ input, adapter, clientDiscountPct: 30, settings: { dhlContractDiscountPct: 75 } }).catch((e) => e);
  };

  it("turns a bad postal code into a specific, fixable message", async () => {
    const err = await failing(fromDhl(400, "Postal code is invalid"));
    expect(err).toBeInstanceOf(QuoteError);
    expect(err).toMatchObject({ code: "bad_postal_code", status: 422 });
  });

  it("says 'not offered' for an unavailable product, not 'temporarily unavailable'", async () => {
    const err = await failing(fromDhl(404, "996: The requested product(s) not available"));
    expect(err).toMatchObject({ code: "not_serviced", status: 422 });
  });

  it("keeps 'try again' for a real outage", async () => {
    const err = await failing(carrierErrorFromStatus(503));
    expect(err).toMatchObject({ code: "carrier_unavailable", status: 503 });
  });
});

describe("telling a client why their paid booking has no label", () => {
  it("reads the failure into a kind a client can understand", () => {
    expect(classifyLabelIssue("202401: No billing address found", true)).toBe("pickup");
    expect(classifyLabelIssue("Postal code is invalid", false)).toBe("address");
    expect(classifyLabelIssue("HS code missing on line item", false)).toBe("customs");
    expect(classifyLabelIssue("Something odd", false)).toBe("other");
    expect(classifyLabelIssue(undefined, false)).toBe("other");
  });

  const paid = (over: Record<string, unknown> = {}) =>
    ({ _id: "s1", status: "paid", payment: { paidAt: new Date(Date.now() - 60 * 60_000) }, fulfilment: { state: "failed", lastError: "202401: No billing address found" }, pickupRequested: true, shipper: {}, recipient: {}, ...over }) as any;

  it("shows the issue on a paid booking whose label failed, never DHL's text", () => {
    const dto = toClientShipmentDTO(paid());
    expect(dto.labelIssue).toBe("pickup");
    expect(JSON.stringify(dto)).not.toContain("202401");
  });

  it("shows nothing while the label is simply being made", () => {
    expect(toClientShipmentDTO(paid({ fulfilment: { state: "pending" } })).labelIssue).toBeNull();
    expect(toClientShipmentDTO(paid({ fulfilment: { state: "none" }, payment: { paidAt: new Date() } })).labelIssue).toBeNull();
  });

  it("flags a paid booking that has had no label for far too long", () => {
    expect(toClientShipmentDTO(paid({ fulfilment: { state: "none" } })).labelIssue).toBe("other");
  });

  it("shows nothing once there is a label or before payment", () => {
    expect(toClientShipmentDTO(paid({ status: "label_ready" })).labelIssue).toBeNull();
    expect(toClientShipmentDTO(paid({ status: "awaiting_payment" })).labelIssue).toBeNull();
  });
});

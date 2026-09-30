import { describe, it, expect, vi, afterEach } from "vitest";
import { maerskAdapter, cmaCgmAdapter, mscAdapter } from "../adapters";
import { deriveStatus } from "../schema";
import { buildCmaCgmFixture } from "./fixtures/cmacgm.fixture";
import { buildMaerskFixture } from "./fixtures/maersk.fixture";
import { buildMscFixture } from "./fixtures/msc.fixture";

describe("maerskAdapter (normalization)", () => {
  it("normalizes the DCSA-style fixture into the internal schema", () => {
    const { tracking, rawPayload } = maerskAdapter.parseWebhookPayload(buildMaerskFixture("MAEU7654321"));

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

describe("cmaCgmAdapter (normalization)", () => {
  it("normalizes CMA CGM's DCSA 2.2 events into the internal schema", async () => {
    const { tracking } = cmaCgmAdapter.parseWebhookPayload(buildCmaCgmFixture("CMAU2233445"));

    expect(tracking.containerNumber).toBe("CMAU2233445");
    expect(tracking.carrier).toBe("CMA_CGM");
    expect(tracking.originPort?.portName).toBe("Montreal");
    expect(tracking.destinationPort?.portName).toBe("Dakar");
    const eventTypes = tracking.events.map((e) => e.eventType);
    expect(eventTypes).toContain("BOOKING");
    expect(eventTypes).toContain("TRANSSHIPMENT");
  });

  it("places DCSA codes on the journey and collapses duplicates per milestone", async () => {
    const { tracking } = cmaCgmAdapter.parseWebhookPayload(buildCmaCgmFixture("CMAU2233445"));

    expect(tracking.portRotation.map((p) => [p.role, p.unLocationCode])).toEqual([
      ["ORIGIN", "CAMTR"],
      ["TRANSSHIPMENT", "ESALG"],
      ["DESTINATION", "SNDKR"],
    ]);
    expect(tracking.portRotation[2].vesselName).toBe("CMA CGM DAKAR EXPRESS");
    expect(tracking.vesselName).toBe("CMA CGM BRAZIL");
    expect(tracking.imoNumber).toBe("9454448");
    expect(tracking.containerSizeType).toBe("45G1");
    expect(tracking.bookingNumber).toBe("MTL0033445");
    expect(tracking.blNumber).toBe("CMAUMTL0033445");

    expect(tracking.events.map((e) => [e.eventType, e.eventClassifierCode])).toEqual([
      ["BOOKING", "ACT"],
      ["GATE_IN", "ACT"],
      ["LOADED", "ACT"],
      ["VESSEL_DEPARTURE", "ACT"],
      ["TRANSSHIPMENT", "ACT"], // ARRI + DISC at ESALG -> one arrival row, DISC wins
      ["TRANSSHIPMENT", "EST"], // LOAD + DEPA at ESALG -> one departure row
      ["DISCHARGE", "EST"], // ARRI + DISC at SNDKR -> one row
      ["GATE_OUT", "EST"],
    ]);
    expect(tracking.events[4].description).toBe("Discharged at transshipment port");
    expect(deriveStatus(tracking.events)).toBe("IN_TRANSIT");
  });

  it("falls back to vessel moves for POL/POD when carrierSpecificData is absent", () => {
    const raw = buildCmaCgmFixture("CMAU1000001").map(({ carrierSpecificData, ...e }) => e);
    const { tracking } = cmaCgmAdapter.parseWebhookPayload(raw);

    expect(tracking.originPort?.unLocationCode).toBe("CAMTR");
    expect(tracking.destinationPort?.unLocationCode).toBe("SNDKR");
    expect(tracking.portRotation.map((p) => p.role)).toEqual(["ORIGIN", "TRANSSHIPMENT", "DESTINATION"]);
    expect(tracking.events.map((e) => e.eventType)).toEqual([
      "BOOKING",
      "GATE_IN",
      "LOADED",
      "VESSEL_DEPARTURE",
      "TRANSSHIPMENT",
      "TRANSSHIPMENT",
      "DISCHARGE",
      "GATE_OUT",
    ]);
  });

  it("marks delivered once an actual empty return is reported", () => {
    const raw = buildCmaCgmFixture("CMAU1000002");
    raw.push({
      eventCreatedDateTime: "2026-09-05T10:00:00Z",
      eventDateTime: "2026-09-05T10:00:00Z",
      eventType: "EQUIPMENT",
      eventClassifierCode: "ACT",
      equipmentEventTypeCode: "GTIN",
      equipmentReference: "CMAU1000002",
      emptyIndicatorCode: "EMPTY",
      eventLocation: { locationName: "Dakar", UNLocationCode: "SNDKR" },
      carrierSpecificData: { transportationPhase: "Import" },
    });
    const { tracking } = cmaCgmAdapter.parseWebhookPayload(raw);
    expect(deriveStatus(tracking.events)).toBe("DELIVERED");
  });
});

describe("cmaCgmAdapter (live mode)", () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
    vi.unstubAllGlobals();
  });

  it("calls GET /operation/trackandtrace/v1/events/{ref} with the keyId header and follows Next-Page", async () => {
    process.env.CMACGM_API_BASE_URL = "https://apis.example.test/";
    process.env.CMACGM_API_KEY = "public-key";
    process.env.CMACGM_API_SECRET = "";

    const all = buildCmaCgmFixture("CMAU5550001");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(all.slice(0, 5)), { status: 206, headers: { "Next-Page": "CURSOR2" } })
      )
      .mockResolvedValueOnce(new Response(JSON.stringify(all.slice(5)), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { tracking } = await cmaCgmAdapter.fetchTracking("CMAU5550001");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [firstUrl, firstInit] = fetchMock.mock.calls[0];
    expect(String(firstUrl)).toBe(
      "https://apis.example.test/operation/trackandtrace/v1/events/CMAU5550001?limit=100"
    );
    expect(firstInit.headers.keyId).toBe("public-key");
    expect(String(fetchMock.mock.calls[1][0])).toContain("cursor=CURSOR2");
    expect(tracking.destinationPort?.unLocationCode).toBe("SNDKR");
  });

  it("uses an OAuth2 client-credentials token when a secret is configured", async () => {
    process.env.CMACGM_API_BASE_URL = "https://apis.example.test";
    process.env.CMACGM_API_KEY = "client-id-oauth-test";
    process.env.CMACGM_API_SECRET = "client-secret";

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "tok", expires_in: 3600 })))
      .mockResolvedValueOnce(new Response(JSON.stringify(buildCmaCgmFixture("CMAU5550002"))));
    vi.stubGlobal("fetch", fetchMock);

    await cmaCgmAdapter.fetchTracking("CMAU5550002");

    const [tokenUrl, tokenInit] = fetchMock.mock.calls[0];
    expect(tokenUrl).toBe("https://auth.cma-cgm.com/as/token.oauth2");
    expect(String(tokenInit.body)).toContain("grant_type=client_credentials");
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe("Bearer tok");
  });
});

describe("mscAdapter (normalization)", () => {
  it("normalizes MSC's milestone codes and resolves port codes by name", async () => {
    const { tracking } = mscAdapter.parseWebhookPayload(buildMscFixture("MSCU9988776"));

    expect(tracking.containerNumber).toBe("MSCU9988776");
    expect(tracking.carrier).toBe("MSC");
    expect(tracking.destinationPort?.portName).toBe("Matadi");

    const transshipmentEvent = tracking.events.find((e) => e.eventType === "TRANSSHIPMENT");
    expect(transshipmentEvent?.location.unLocationCode).toBe("BEANR");
  });
});

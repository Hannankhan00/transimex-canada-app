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

  it("normalizes a live DCSA 2.2 events array from Track & Trace Plus", () => {
    const dcsaEvents = [
      {
        eventType: "SHIPMENT",
        shipmentEventTypeCode: "BOOK",
        eventClassifierCode: "ACT",
        eventDateTime: "2026-08-01T10:00:00Z",
        documentReferences: [
          { documentReferenceType: "BKG", documentReferenceValue: "MAEU998877" },
          { documentReferenceType: "TRD", documentReferenceValue: "BL998877" },
        ],
      },
      {
        eventType: "EQUIPMENT",
        equipmentEventTypeCode: "GTIN",
        eventClassifierCode: "ACT",
        eventDateTime: "2026-08-02T12:00:00Z",
        equipmentReference: "MSKU1234567",
        ISOEquipmentCode: "42G1",
        emptyIndicatorCode: "LADEN",
        eventLocation: { UNLocationCode: "CAMTR", locationName: "Montreal" },
      },
      {
        eventType: "EQUIPMENT",
        equipmentEventTypeCode: "LOAD",
        eventClassifierCode: "ACT",
        eventDateTime: "2026-08-04T08:00:00Z",
        equipmentReference: "MSKU1234567",
        eventLocation: { UNLocationCode: "CAMTR", locationName: "Montreal" },
        transportCall: {
          modeOfTransport: "VESSEL",
          UNLocationCode: "CAMTR",
          exportVoyageNumber: "2601W",
          vessel: { vesselIMONumber: 9123456, vesselName: "MAERSK MC-KINNEY MOLLER" },
        },
      },
      {
        eventType: "TRANSPORT",
        transportEventTypeCode: "DEPA",
        eventClassifierCode: "ACT",
        eventDateTime: "2026-08-04T18:00:00Z",
        transportCall: {
          modeOfTransport: "VESSEL",
          UNLocationCode: "CAMTR",
          exportVoyageNumber: "2601W",
          vessel: { vesselIMONumber: 9123456, vesselName: "MAERSK MC-KINNEY MOLLER" },
        },
      },
      {
        eventType: "EQUIPMENT",
        equipmentEventTypeCode: "DISC",
        eventClassifierCode: "EST",
        eventDateTime: "2026-08-16T14:00:00Z",
        equipmentReference: "MSKU1234567",
        eventLocation: { UNLocationCode: "SNDKR", locationName: "Dakar" },
        transportCall: {
          modeOfTransport: "VESSEL",
          UNLocationCode: "SNDKR",
          vessel: { vesselIMONumber: 9123456, vesselName: "MAERSK MC-KINNEY MOLLER" },
        },
      },
    ];

    const { tracking } = maerskAdapter.parseWebhookPayload(dcsaEvents as any);

    expect(tracking.carrier).toBe("MAERSK");
    expect(tracking.containerNumber).toBe("MSKU1234567");
    expect(tracking.bookingNumber).toBe("MAEU998877");
    expect(tracking.blNumber).toBe("BL998877");
    expect(tracking.vesselName).toBe("MAERSK MC-KINNEY MOLLER");
    expect(tracking.imoNumber).toBe("9123456");
    expect(tracking.originPort?.unLocationCode).toBe("CAMTR");
    expect(tracking.destinationPort?.unLocationCode).toBe("SNDKR");
    expect(tracking.events.map((e) => e.eventType)).toEqual([
      "BOOKING",
      "GATE_IN",
      "LOADED",
      "VESSEL_DEPARTURE",
      "DISCHARGE",
    ]);
    expect(deriveStatus(tracking.events)).toBe("IN_TRANSIT");
  });

  it("splits a multi-container booking correctly", () => {
    const bookingEvents = [
      {
        eventType: "SHIPMENT",
        shipmentEventTypeCode: "BOOK",
        eventClassifierCode: "ACT",
        eventDateTime: "2026-08-01T10:00:00Z",
        carrierBookingReference: "MAEU554433",
      },
      {
        eventType: "EQUIPMENT",
        equipmentEventTypeCode: "GTIN",
        eventClassifierCode: "ACT",
        eventDateTime: "2026-08-02T10:00:00Z",
        equipmentReference: "MSKU1111111",
        eventLocation: { UNLocationCode: "CAMTR", locationName: "Montreal" },
      },
      {
        eventType: "EQUIPMENT",
        equipmentEventTypeCode: "GTIN",
        eventClassifierCode: "ACT",
        eventDateTime: "2026-08-02T11:00:00Z",
        equipmentReference: "MSKU2222222",
        eventLocation: { UNLocationCode: "CAMTR", locationName: "Montreal" },
      },
    ];

    const result = maerskAdapter.splitByContainer
      ? maerskAdapter.splitByContainer(bookingEvents as any, "MAEU554433")
      : null;

    expect(result).toBeTruthy();
    expect(result?.containers.length).toBe(2);
    expect(result?.containers.map((c) => c.tracking.containerNumber).sort()).toEqual([
      "MSKU1111111",
      "MSKU2222222",
    ]);
  });
});

describe("maerskAdapter (live mode)", () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
    vi.unstubAllGlobals();
  });

  it("calls GET /track-and-trace-private/events with Consumer-Key header and follows Next-Page", async () => {
    process.env.MAERSK_API_BASE_URL = "https://api.maersk.test";
    process.env.MAERSK_API_KEY = "maersk-consumer-key";
    process.env.MAERSK_API_SECRET = "";

    const event1 = {
      eventType: "EQUIPMENT",
      equipmentEventTypeCode: "GTIN",
      eventClassifierCode: "ACT",
      eventDateTime: "2026-08-01T10:00:00Z",
      equipmentReference: "MAEU1112223",
      eventLocation: { UNLocationCode: "CAMTR", locationName: "Montreal" },
    };
    const event2 = {
      eventType: "TRANSPORT",
      transportEventTypeCode: "DEPA",
      eventClassifierCode: "ACT",
      eventDateTime: "2026-08-02T10:00:00Z",
      transportCall: { UNLocationCode: "CAMTR" },
    };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify([event1]), { status: 200, headers: { "Next-Page": "CURSOR_PAGE_2" } })
      )
      .mockResolvedValueOnce(new Response(JSON.stringify([event2]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { tracking } = await maerskAdapter.fetchTracking("MAEU1112223");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [firstUrl, firstInit] = fetchMock.mock.calls[0];
    expect(String(firstUrl)).toBe(
      "https://api.maersk.test/track-and-trace-private/events?equipmentReference=MAEU1112223&limit=100"
    );
    expect(firstInit.headers["Consumer-Key"]).toBe("maersk-consumer-key");
    expect(String(fetchMock.mock.calls[1][0])).toContain("cursor=CURSOR_PAGE_2");
    expect(tracking.containerNumber).toBe("MAEU1112223");
  });

  it("uses OAuth2 client-credentials token when MAERSK_API_SECRET is configured", async () => {
    process.env.MAERSK_API_BASE_URL = "https://api.maersk.test";
    process.env.MAERSK_API_KEY = "maersk-oauth-client";
    process.env.MAERSK_API_SECRET = "maersk-oauth-secret";

    const event = {
      eventType: "EQUIPMENT",
      equipmentEventTypeCode: "GTIN",
      eventClassifierCode: "ACT",
      eventDateTime: "2026-08-01T10:00:00Z",
      equipmentReference: "MAEU9998887",
      eventLocation: { UNLocationCode: "CAMTR", locationName: "Montreal" },
    };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "maersk-jwt-token", expires_in: 3600 })))
      .mockResolvedValueOnce(new Response(JSON.stringify([event])));
    vi.stubGlobal("fetch", fetchMock);

    const { tracking } = await maerskAdapter.fetchTracking("MAEU9998887");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [tokenUrl, tokenInit] = fetchMock.mock.calls[0];
    expect(tokenUrl).toBe("https://api.maersk.com/customer-identity/oauth/v2/access_token");
    expect(String(tokenInit.body)).toContain("grant_type=client_credentials");
    expect(String(tokenInit.body)).toContain("client_id=maersk-oauth-client");
    expect(tokenInit.headers["Consumer-Key"]).toBe("maersk-oauth-client");

    const [, apiInit] = fetchMock.mock.calls[1];
    expect(apiInit.headers.Authorization).toBe("Bearer maersk-jwt-token");
    expect(apiInit.headers["Consumer-Key"]).toBe("maersk-oauth-client");
    expect(tracking.containerNumber).toBe("MAEU9998887");
  });

  it("fetches by booking reference via fetchByReference", async () => {
    process.env.MAERSK_API_BASE_URL = "https://api.maersk.test";
    process.env.MAERSK_API_KEY = "maersk-key";
    process.env.MAERSK_API_SECRET = "";

    const bookingEvents = [
      {
        eventType: "SHIPMENT",
        shipmentEventTypeCode: "BOOK",
        eventClassifierCode: "ACT",
        eventDateTime: "2026-08-01T10:00:00Z",
        carrierBookingReference: "BK-MAEU-777",
      },
      {
        eventType: "EQUIPMENT",
        equipmentEventTypeCode: "GTIN",
        eventClassifierCode: "ACT",
        eventDateTime: "2026-08-02T10:00:00Z",
        equipmentReference: "MSKU7771111",
        eventLocation: { UNLocationCode: "CAMTR", locationName: "Montreal" },
      },
    ];

    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(bookingEvents)));
    vi.stubGlobal("fetch", fetchMock);

    const result = await maerskAdapter.fetchByReference!("BK-MAEU-777");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain("carrierBookingReference=BK-MAEU-777");
    expect(result.booking.containerNumber).toBe("BK-MAEU-777");
    expect(result.containers.length).toBe(1);
    expect(result.containers[0].tracking.containerNumber).toBe("MSKU7771111");
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

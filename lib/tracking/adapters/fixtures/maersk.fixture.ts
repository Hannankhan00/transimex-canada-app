/**
 * Realistic sample payload shaped like Maersk's Track & Trace Plus API, which
 * (per DOCs/container tracking.docx §3.1) already speaks DCSA Track & Trace
 * v2.2 event codes — so this fixture doubles as a preview of what the live
 * response will look like once credentials arrive. Field names/paths are
 * representative, not a verified copy of Maersk's live schema; confirm exact
 * shapes against the sandbox once registered (see INTEGRATION.md).
 */
export function buildMaerskFixture(containerNumber: string) {
  return {
    container: {
      equipmentReference: containerNumber,
      ISOEquipmentCode: "42G1",
      equipmentSizeLabel: "40ft High Cube",
    },
    shipment: {
      billOfLadingNumber: `MAEUMTRABJ${containerNumber.slice(-6)}`,
      carrierBookingReference: `MAEU2026081100${containerNumber.slice(-3)}`,
    },
    vessel: { vesselIMONumber: "9784271", vesselName: "MAERSK SALTORO" },
    transportPlan: [
      {
        sequenceNumber: 1,
        portCallRole: "ORIGIN",
        UNLocationCode: "CAMTR",
        locationName: "Montreal",
        facilityName: "Termont Montreal",
        vesselName: "MAERSK SALTORO",
        carrierVoyageNumber: "426W",
      },
      {
        sequenceNumber: 2,
        portCallRole: "TRANSSHIPMENT",
        UNLocationCode: "NLRTM",
        locationName: "Rotterdam",
        facilityName: "APM Terminals Rotterdam",
        vesselName: "MAERSK NILA",
        carrierVoyageNumber: "118E",
      },
      {
        sequenceNumber: 3,
        portCallRole: "DESTINATION",
        UNLocationCode: "CIABJ",
        locationName: "Abidjan",
        facilityName: "Abidjan Terminal",
        vesselName: "MAERSK NILA",
        carrierVoyageNumber: "118E",
      },
    ],
    events: [
      {
        eventType: "SHIPMENT",
        shipmentEventTypeCode: "BOOK",
        eventClassifierCode: "ACT",
        eventDateTime: "2026-08-01T09:00:00Z",
        UNLocationCode: "CAMTR",
        locationName: "Montreal",
      },
      {
        eventType: "EQUIPMENT",
        equipmentEventTypeCode: "GTIN",
        eventClassifierCode: "ACT",
        eventDateTime: "2026-08-10T14:30:00Z",
        UNLocationCode: "CAMTR",
        locationName: "Montreal",
        facilityName: "Termont Montreal",
      },
      {
        eventType: "EQUIPMENT",
        equipmentEventTypeCode: "LOAD",
        eventClassifierCode: "ACT",
        eventDateTime: "2026-08-12T22:00:00Z",
        UNLocationCode: "CAMTR",
        locationName: "Montreal",
        vesselName: "MAERSK SALTORO",
        carrierVoyageNumber: "426W",
      },
      {
        eventType: "TRANSPORT",
        transportEventTypeCode: "DEPA",
        eventClassifierCode: "ACT",
        eventDateTime: "2026-08-13T05:00:00Z",
        UNLocationCode: "CAMTR",
        locationName: "Montreal",
        vesselName: "MAERSK SALTORO",
        carrierVoyageNumber: "426W",
      },
      {
        eventType: "TRANSPORT",
        transportEventTypeCode: "ARRI",
        eventClassifierCode: "ACT",
        eventDateTime: "2026-08-22T11:00:00Z",
        UNLocationCode: "NLRTM",
        locationName: "Rotterdam",
        vesselName: "MAERSK SALTORO",
        carrierVoyageNumber: "426W",
        isTransshipment: true,
      },
      {
        eventType: "TRANSPORT",
        transportEventTypeCode: "DEPA",
        eventClassifierCode: "EST",
        eventDateTime: "2026-08-25T18:00:00Z",
        UNLocationCode: "NLRTM",
        locationName: "Rotterdam",
        vesselName: "MAERSK NILA",
        carrierVoyageNumber: "118E",
        isTransshipment: true,
      },
      {
        eventType: "EQUIPMENT",
        equipmentEventTypeCode: "DISC",
        eventClassifierCode: "EST",
        eventDateTime: "2026-09-05T08:00:00Z",
        UNLocationCode: "CIABJ",
        locationName: "Abidjan",
      },
      {
        eventType: "EQUIPMENT",
        equipmentEventTypeCode: "GTOT",
        eventClassifierCode: "EST",
        eventDateTime: "2026-09-06T12:00:00Z",
        UNLocationCode: "CIABJ",
        locationName: "Abidjan",
      },
    ],
  };
}

export type MaerskRawPayload = ReturnType<typeof buildMaerskFixture>;

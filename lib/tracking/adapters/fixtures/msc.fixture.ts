/**
 * Sample payload shaped like MSC's Track & Trace service (included in the
 * "Basic" integration package — see DOCs/container tracking.docx §3.3).
 * Field names here are representative, not a verified copy of the live
 * response; confirm the exact schema during MSC's UAT process once the
 * Data Sharing Agreement is signed (see INTEGRATION.md). Modeled on the
 * Montreal -> Matadi river-port lane called out in the doc as an edge case.
 */
export function buildMscFixture(containerNumber: string) {
  return {
    equipmentNumber: containerNumber,
    equipmentIsoCode: "22G1",
    billOfLading: `MSCUMTRMAT${containerNumber.slice(-6)}`,
    bookingReference: `MSCBKG${containerNumber.slice(-6)}`,
    vessel: { name: "MSC KATRINA", imo: "9463011" },
    voyage: "FY426A",
    routing: {
      pol: { unLocode: "CAMTR", name: "Montreal" },
      pod: { unLocode: "CDMAT", name: "Matadi" },
      transshipments: [{ unLocode: "BEANR", name: "Antwerp" }],
    },
    milestones: [
      {
        milestoneCode: "BKCF",
        milestoneName: "Booking Confirmed",
        eventDateTimeUtc: "2026-08-02T00:00:00Z",
        status: "COMPLETED",
        location: "Montreal",
      },
      {
        milestoneCode: "GTIN",
        milestoneName: "Container Gated In",
        eventDateTimeUtc: "2026-08-11T00:00:00Z",
        status: "COMPLETED",
        location: "Montreal",
      },
      {
        milestoneCode: "LOAD",
        milestoneName: "Loaded on Board",
        eventDateTimeUtc: "2026-08-13T00:00:00Z",
        status: "COMPLETED",
        location: "Montreal",
        vesselName: "MSC KATRINA",
        voyageNumber: "FY426A",
      },
      {
        milestoneCode: "VDEP",
        milestoneName: "Vessel Departed",
        eventDateTimeUtc: "2026-08-14T00:00:00Z",
        status: "COMPLETED",
        location: "Montreal",
      },
      {
        milestoneCode: "TRSI",
        milestoneName: "Transshipment - Inbound",
        eventDateTimeUtc: "2026-08-24T00:00:00Z",
        status: "COMPLETED",
        location: "Antwerp",
      },
      {
        milestoneCode: "TRSO",
        milestoneName: "Transshipment - Outbound",
        eventDateTimeUtc: "2026-08-27T00:00:00Z",
        status: "PLANNED",
        location: "Antwerp",
        vesselName: "MSC CONGO RIVER",
        voyageNumber: "22R",
      },
      {
        milestoneCode: "DISC",
        milestoneName: "Discharged",
        eventDateTimeUtc: "2026-09-09T00:00:00Z",
        status: "PLANNED",
        location: "Matadi",
      },
      {
        milestoneCode: "GTOT",
        milestoneName: "Container Gated Out",
        eventDateTimeUtc: "2026-09-11T00:00:00Z",
        status: "PLANNED",
        location: "Matadi",
      },
    ],
  };
}

export type MscRawPayload = ReturnType<typeof buildMscFixture>;

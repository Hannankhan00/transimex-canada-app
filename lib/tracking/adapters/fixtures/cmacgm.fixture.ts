/**
 * Sample payload shaped like CMA CGM's Track & Trace API (public/partner
 * tier — see DOCs/container tracking.docx §3.2). CMA CGM does not publish a
 * DCSA-standardized event schema, so field names here are representative,
 * not a verified copy of the live response; confirm the partner-tier schema
 * with the account team once escalated (see INTEGRATION.md).
 */
export function buildCmaCgmFixture(containerNumber: string) {
  return {
    containerNumber,
    containerType: "40HC",
    blNumber: `CMAUMTRDKR${containerNumber.slice(-6)}`,
    bookingNumber: `BKGMTL00${containerNumber.slice(-5)}`,
    portOfLoading: { code: "CAMTR", name: "Montreal" },
    portOfDischarge: { code: "SNDKR", name: "Dakar" },
    transshipmentPorts: [{ code: "ESALG", name: "Algeciras" }],
    vesselName: "CMA CGM BRAZIL",
    voyageNumber: "0FW6RE1MA",
    trackingEvents: [
      {
        status: "Booking Confirmed",
        eventDate: "2026-07-28T00:00:00Z",
        isEstimate: false,
        location: "Montreal, CA",
      },
      {
        status: "Gate In at Origin",
        eventDate: "2026-08-05T16:00:00Z",
        isEstimate: false,
        location: "Montreal, CA",
      },
      {
        status: "Loaded on Vessel",
        eventDate: "2026-08-07T09:00:00Z",
        isEstimate: false,
        location: "Montreal, CA",
        vessel: "CMA CGM BRAZIL",
        voyage: "0FW6RE1MA",
      },
      {
        status: "Vessel Departed",
        eventDate: "2026-08-08T02:00:00Z",
        isEstimate: false,
        location: "Montreal, CA",
      },
      {
        status: "Transshipment Arrival",
        eventDate: "2026-08-19T13:00:00Z",
        isEstimate: false,
        location: "Algeciras, ES",
      },
      {
        status: "Transshipment Departure",
        eventDate: "2026-08-22T20:00:00Z",
        isEstimate: true,
        location: "Algeciras, ES",
        vessel: "CMA CGM DAKAR EXPRESS",
        voyage: "112N",
      },
      {
        status: "Discharged at Destination",
        eventDate: "2026-08-30T10:00:00Z",
        isEstimate: true,
        location: "Dakar, SN",
      },
      {
        status: "Gate Out from Terminal",
        eventDate: "2026-09-01T15:00:00Z",
        isEstimate: true,
        location: "Dakar, SN",
      },
    ],
  };
}

export type CmaCgmRawPayload = ReturnType<typeof buildCmaCgmFixture>;

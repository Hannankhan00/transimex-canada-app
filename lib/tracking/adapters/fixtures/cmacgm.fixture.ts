/**
 * Sample response from CMA CGM's Track & Trace API
 * (`GET /operation/trackandtrace/v1/events/{trackingReference}`), following
 * the published OpenAPI spec (DCSA T&T 2.2.0, CMA version 1.2.9 — see
 * api-portal.cma-cgm.com, product "visibility", operation.trackandtrace.v1).
 *
 * The response is a flat JSON array mixing TRANSPORT and EQUIPMENT events
 * (CMA CGM does not emit SHIPMENT events yet). Every field used here is in the
 * spec; values are representative of a Montreal -> Algeciras -> Dakar routing.
 */

// ---- Types mirroring the spec's components/schemas (only what we read) ----

export interface CmaCgmLocation {
  locationName?: string;
  latitude?: string;
  longitude?: string;
  UNLocationCode?: string;
  address?: { city?: string; country?: string };
}

export interface CmaCgmVessel {
  vesselIMONumber: string;
  vesselName?: string;
  vesselFlag?: string;
  vesselCallSignNumber?: string;
  vesselOperatorCarrierCode?: string;
}

export interface CmaCgmTransportCall {
  transportCallID: string;
  carrierServiceCode?: string;
  /** Deprecated in the spec in favour of export/importVoyageNumber. */
  carrierVoyageNumber?: string;
  exportVoyageNumber?: string;
  importVoyageNumber?: string;
  transportCallSequenceNumber?: number;
  UNLocationCode?: string;
  facilityCode?: string;
  facilityCodeListProvider?: "BIC" | "SMDG";
  facilityTypeCode?: string;
  otherFacility?: string;
  modeOfTransport: "VESSEL" | "RAIL" | "TRUCK" | "BARGE";
  location?: CmaCgmLocation;
  vessel?: CmaCgmVessel;
}

export interface CmaCgmCarrierSpecificData {
  internalEventCode?: string;
  internalEventLabel?: string;
  internalLocationCode?: string;
  internalFacilityCode?: string;
  bookingExportVoyageReference?: string;
  /** "Export" | "Transshipment" | "Import" */
  transportationPhase?: string;
  /** DEPOT | COL | ABP_EXP | POL | PTS | POD | ABP_IMP | DEL */
  shipmentLocationType?: string;
  transportCallSequenceTotal?: number;
  numberOfUnits?: number;
}

export interface CmaCgmDocumentReference {
  /** Spec enum is literally "BKG (Booking)" / "TRD (Transport Document)"; live data may send the bare code. */
  documentReferenceType?: string;
  documentReferenceValue?: string;
}

export interface CmaCgmEvent {
  eventID?: string;
  eventCreatedDateTime: string;
  eventType: "TRANSPORT" | "EQUIPMENT" | "SHIPMENT";
  eventClassifierCode: "ACT" | "PLN" | "EST";
  eventDateTime?: string;
  carrierSpecificData?: CmaCgmCarrierSpecificData;
  // TRANSPORT
  transportEventTypeCode?: "ARRI" | "DEPA";
  delayReasonCode?: string;
  changeRemark?: string;
  transportCall?: CmaCgmTransportCall;
  // EQUIPMENT
  equipmentEventTypeCode?: string;
  equipmentReference?: string;
  ISOEquipmentCode?: string;
  emptyIndicatorCode?: "EMPTY" | "LADEN";
  eventLocation?: CmaCgmLocation;
  // SHIPMENT (not emitted by CMA CGM yet, but part of the DCSA union)
  shipmentEventTypeCode?: string;
  documentTypeCode?: string;
  documentID?: string;
  // Shared
  documentReferences?: CmaCgmDocumentReference[];
  references?: { referenceType: string; referenceValue: string }[];
}

export type CmaCgmRawPayload = CmaCgmEvent[];

// ---- Fixture ----

const MONTREAL: CmaCgmLocation = { locationName: "Montreal", UNLocationCode: "CAMTR" };
const ALGECIRAS: CmaCgmLocation = { locationName: "Algeciras", UNLocationCode: "ESALG" };
const DAKAR: CmaCgmLocation = { locationName: "Dakar", UNLocationCode: "SNDKR" };

const MOTHER_VESSEL: CmaCgmVessel = {
  vesselIMONumber: "9454448",
  vesselName: "CMA CGM BRAZIL",
  vesselFlag: "MT",
  vesselOperatorCarrierCode: "CMDU",
};
const FEEDER_VESSEL: CmaCgmVessel = {
  vesselIMONumber: "9706906",
  vesselName: "CMA CGM DAKAR EXPRESS",
  vesselFlag: "MT",
  vesselOperatorCarrierCode: "CMDU",
};

function call(
  id: string,
  loc: CmaCgmLocation,
  vessel: CmaCgmVessel,
  voyage: string,
  facilityCode: string
): CmaCgmTransportCall {
  return {
    transportCallID: id,
    carrierServiceCode: "SAF",
    exportVoyageNumber: voyage,
    UNLocationCode: loc.UNLocationCode,
    facilityCode,
    facilityCodeListProvider: "SMDG",
    facilityTypeCode: "POTE",
    modeOfTransport: "VESSEL",
    location: loc,
    vessel,
  };
}

export function buildCmaCgmFixture(containerNumber: string): CmaCgmRawPayload {
  const booking = `MTL00${containerNumber.slice(-5)}`;
  const docRefs: CmaCgmDocumentReference[] = [
    { documentReferenceType: "BKG", documentReferenceValue: booking },
    { documentReferenceType: "TRD", documentReferenceValue: `CMAU${booking}` },
  ];
  const mtlCall = call("CAMTR-0FW6RE1MA", MONTREAL, MOTHER_VESSEL, "0FW6RE1MA", "TRM");
  const algArrCall = call("ESALG-0FW6RE1MA", ALGECIRAS, MOTHER_VESSEL, "0FW6RE1MA", "APM");
  const algDepCall = call("ESALG-112N", ALGECIRAS, FEEDER_VESSEL, "112N", "APM");
  const dkrCall = call("SNDKR-112N", DAKAR, FEEDER_VESSEL, "112N", "DPW");

  const equipment = (
    code: string,
    classifier: CmaCgmEvent["eventClassifierCode"],
    date: string,
    empty: "EMPTY" | "LADEN",
    loc: CmaCgmLocation,
    phase: string,
    locType: string,
    transportCall?: CmaCgmTransportCall
  ): CmaCgmEvent => ({
    eventCreatedDateTime: date,
    eventType: "EQUIPMENT",
    eventClassifierCode: classifier,
    eventDateTime: date,
    equipmentEventTypeCode: code,
    equipmentReference: containerNumber,
    ISOEquipmentCode: "45G1",
    emptyIndicatorCode: empty,
    eventLocation: loc,
    transportCall,
    documentReferences: docRefs,
    carrierSpecificData: { transportationPhase: phase, shipmentLocationType: locType },
  });

  const transport = (
    code: "ARRI" | "DEPA",
    classifier: CmaCgmEvent["eventClassifierCode"],
    date: string,
    transportCall: CmaCgmTransportCall,
    phase: string,
    locType: string
  ): CmaCgmEvent => ({
    eventCreatedDateTime: date,
    eventType: "TRANSPORT",
    eventClassifierCode: classifier,
    eventDateTime: date,
    transportEventTypeCode: code,
    transportCall,
    documentReferences: docRefs,
    carrierSpecificData: { transportationPhase: phase, shipmentLocationType: locType },
  });

  return [
    equipment("GTOT", "ACT", "2026-07-30T14:00:00Z", "EMPTY", MONTREAL, "Export", "DEPOT"),
    equipment("GTIN", "ACT", "2026-08-05T16:00:00Z", "LADEN", MONTREAL, "Export", "POL"),
    equipment("LOAD", "ACT", "2026-08-07T09:00:00Z", "LADEN", MONTREAL, "Export", "POL", mtlCall),
    transport("DEPA", "ACT", "2026-08-08T02:00:00Z", mtlCall, "Export", "POL"),
    transport("ARRI", "ACT", "2026-08-19T13:00:00Z", algArrCall, "Transshipment", "PTS"),
    equipment("DISC", "ACT", "2026-08-19T21:00:00Z", "LADEN", ALGECIRAS, "Transshipment", "PTS", algArrCall),
    equipment("LOAD", "EST", "2026-08-22T18:00:00Z", "LADEN", ALGECIRAS, "Transshipment", "PTS", algDepCall),
    transport("DEPA", "EST", "2026-08-22T20:00:00Z", algDepCall, "Transshipment", "PTS"),
    transport("ARRI", "EST", "2026-08-30T06:00:00Z", dkrCall, "Import", "POD"),
    equipment("DISC", "EST", "2026-08-30T10:00:00Z", "LADEN", DAKAR, "Import", "POD", dkrCall),
    equipment("GTOT", "EST", "2026-09-01T15:00:00Z", "LADEN", DAKAR, "Import", "POD"),
  ];
}

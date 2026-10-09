/**
 * Raw response shapes for each carrier's Track & Trace API — only the fields
 * the adapters read. Each adapter maps its carrier's shape into the internal
 * schema in `../schema.ts`; nothing else in the app reads these.
 */

// ---- CMA CGM: DCSA T&T 2.2.0 (OpenAPI "operation.trackandtrace.v1", CMA version 1.2.9) ----

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

// ---- Maersk: Track & Trace Plus (DCSA v2.2 OpenAPI specification) ----

export interface MaerskLocation {
  locationName?: string;
  latitude?: string;
  longitude?: string;
  UNLocationCode?: string;
  facilityCode?: string;
  facilityCodeListProvider?: "BIC" | "SMDG";
  address?: { city?: string; country?: string };
}

export interface MaerskVessel {
  vesselIMONumber?: number | string;
  vesselName?: string;
  vesselFlag?: string;
  vesselCallSignNumber?: string;
}

export interface MaerskTransportCall {
  transportCallID?: string;
  carrierServiceCode?: string;
  carrierVoyageNumber?: string;
  exportVoyageNumber?: string;
  importVoyageNumber?: string;
  transportCallSequenceNumber?: number;
  UNLocationCode?: string;
  facilityCode?: string;
  facilityTypeCode?: string;
  otherFacility?: string;
  modeOfTransport?: "VESSEL" | "RAIL" | "TRUCK" | "BARGE";
  location?: MaerskLocation;
  vessel?: MaerskVessel;
}

export interface MaerskDocumentReference {
  documentReferenceType?: string;
  documentReferenceValue?: string;
}

export interface MaerskDcsaEvent {
  eventID?: string;
  eventCreatedDateTime?: string;
  eventType: "TRANSPORT" | "EQUIPMENT" | "SHIPMENT";
  eventClassifierCode: "ACT" | "PLN" | "EST";
  eventDateTime?: string;
  // TRANSPORT
  transportEventTypeCode?: "ARRI" | "DEPA";
  delayReasonCode?: string;
  changeRemark?: string;
  transportCall?: MaerskTransportCall;
  // EQUIPMENT
  equipmentEventTypeCode?: string;
  equipmentReference?: string;
  ISOEquipmentCode?: string;
  emptyIndicatorCode?: "EMPTY" | "LADEN";
  eventLocation?: MaerskLocation;
  // SHIPMENT
  shipmentEventTypeCode?: string;
  documentTypeCode?: string;
  documentID?: string;
  carrierBookingReference?: string;
  // Shared
  documentReferences?: MaerskDocumentReference[];
  references?: { referenceType: string; referenceValue: string }[];
  carrierSpecificData?: Record<string, any>;
}

export interface MaerskPortCall {
  sequenceNumber: number;
  portCallRole: string;
  UNLocationCode: string;
  locationName: string;
  facilityName?: string;
  vesselName?: string;
  carrierVoyageNumber?: string;
}

export interface MaerskLegacyEvent {
  eventType: string;
  shipmentEventTypeCode?: string;
  equipmentEventTypeCode?: string;
  transportEventTypeCode?: string;
  eventClassifierCode: string;
  eventDateTime: string;
  UNLocationCode: string;
  locationName: string;
  facilityName?: string;
  vesselName?: string;
  carrierVoyageNumber?: string;
  isTransshipment?: boolean;
}

export interface MaerskLegacyPayload {
  container: { equipmentReference: string; ISOEquipmentCode?: string; equipmentSizeLabel?: string };
  shipment: { billOfLadingNumber?: string; carrierBookingReference?: string };
  vessel: { vesselIMONumber?: string; vesselName?: string };
  transportPlan: MaerskPortCall[];
  events: MaerskLegacyEvent[];
}

export type MaerskEvent = MaerskLegacyEvent;

export type MaerskRawPayload =
  | MaerskLegacyPayload
  | MaerskDcsaEvent[]
  | { events: (MaerskDcsaEvent | MaerskLegacyEvent)[] };

// ---- MSC: Track & Trace ("Basic" package). Field names are representative —
// confirm during MSC's UAT process (see INTEGRATION.md). ----

export interface MscPort {
  unLocode: string;
  name: string;
}

export interface MscMilestone {
  milestoneCode: string;
  milestoneName: string;
  eventDateTimeUtc: string;
  status: string;
  location: string;
  vesselName?: string;
  voyageNumber?: string;
}

export interface MscRawPayload {
  equipmentNumber: string;
  equipmentIsoCode?: string;
  billOfLading?: string;
  bookingReference?: string;
  vessel: { name?: string; imo?: string };
  voyage?: string;
  routing: { pol: MscPort; pod: MscPort; transshipments?: MscPort[] };
  milestones: MscMilestone[];
}

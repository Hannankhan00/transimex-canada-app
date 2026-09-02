/**
 * Transimex Canada Logistics - Phase 3 Shared Mock Data & Store
 * Provides institutional quotes, secure document vault, and address book storage.
 */

import { SavedAddress } from "./validations/address";

export type QuoteStatus = "under_review" | "reviewing" | "accepted" | "rejected" | "expired";

export interface QuoteItem {
  id: string; // e.g. "QT-2026-00124"
  clientName?: string;
  clientCompany?: string;
  clientEmail?: string;
  clientPhone?: string;
  userId?: string;
  origin: string;
  originDetail: string;
  destination: string;
  destinationDetail: string;
  transportMode: string;
  equipment: string;
  cargoType?: "General Freight" | "Hazardous Materials" | "Perishable / Cold-Chain" | "Heavy Haul Oversize";
  weight: string;
  palletCount?: number;
  dimensions?: string;
  commodity: string;
  preferredPickupDate?: string;
  specialInstructions?: string;
  submittedDate: string;
  validUntil: string;
  status: QuoteStatus;
  statusLabelEn: string;
  statusLabelFr: string;
  priceCad?: string;
  priceUsd?: string;
  breakdown?: {
    lineHaul: string;
    fuelSurcharge: string;
    crossBorderFee?: string;
    accessorials?: string;
    total: string;
  };
  shipmentId?: string; // Linked shipment if accepted
  rejectionReason?: string;
  adminNotes?: string;
}

export type DocumentType =
  | "Bill of Lading"
  | "Air Waybill"
  | "Rail Waybill"
  | "Proof of Delivery"
  | "Customs Entry"
  | "Commercial Invoice";

export interface VaultDocument {
  id: string; // e.g. "DOC-99482"
  name: string; // e.g. "Bill_of_Lading_TMX00847.pdf"
  type: DocumentType;
  shipmentId: string; // Clickable link to shipment
  dateUploaded: string;
  size: string;
  isClientVisible: boolean; // SECURITY: if false, NEVER rendered in client portal
  fileFormat: "PDF";
  downloadUrl?: string;
  statusText: string;
  customsPars?: string;
}

// Initial Preset Addresses for Canadian Logistics
export const INITIAL_ADDRESSES: SavedAddress[] = [
  {
    id: "ADDR-001",
    alias: "Montreal Distribution Center (HQ)",
    company: "Laurentian Global Logistics Ltd.",
    contactPerson: "Marc Tremblay",
    phone: "+1 (514) 555-0199",
    street: "4850 Rue Saint-Patrick, Suite 200",
    city: "Montreal",
    province: "QC",
    postalCode: "H4E 4N4",
    country: "Canada",
    accessInstructions: "Receiving dock 4-8. Ring bell for gate access. 24h receiving.",
    isDefault: true,
    createdAt: "2026-01-15T09:00:00Z",
  },
  {
    id: "ADDR-002",
    alias: "Toronto Cross-Dock Facility",
    company: "Laurentian Ontario Operations",
    contactPerson: "Sarah Jenkins",
    phone: "+1 (416) 555-0144",
    street: "1200 Britannia Road East",
    city: "Mississauga",
    province: "ON",
    postalCode: "L4W 4K5",
    country: "Canada",
    accessInstructions: "Overnight staging yard. Docks 12 through 18.",
    isDefault: false,
    createdAt: "2026-02-10T14:30:00Z",
  },
  {
    id: "ADDR-003",
    alias: "Vancouver Pacific Gateway Terminal",
    company: "Laurentian West Coast Cargo",
    contactPerson: "David Wong",
    phone: "+1 (604) 555-0182",
    street: "3388 Viking Way",
    city: "Richmond",
    province: "BC",
    postalCode: "V6V 1N6",
    country: "Canada",
    accessInstructions: "Port container de-stuffing center. Check in at main guardhouse.",
    isDefault: false,
    createdAt: "2026-03-01T11:15:00Z",
  },
  {
    id: "ADDR-004",
    alias: "Calgary Logistics Center",
    company: "Laurentian Western Hub",
    contactPerson: "Trevor Miller",
    phone: "+1 (403) 555-0177",
    street: "11050 50 Street SE",
    city: "Calgary",
    province: "AB",
    postalCode: "T2C 3E5",
    country: "Canada",
    accessInstructions: "Intermodal rail siding accessible. Low temperature storage available.",
    isDefault: false,
    createdAt: "2026-04-18T16:45:00Z",
  },
];

// Initial Quotes Dataset showcasing all status workflows
export const INITIAL_QUOTES: QuoteItem[] = [
  {
    id: "QT-2026-00124",
    clientName: "Marc Tremblay",
    clientCompany: "Laurentian Global Logistics Ltd.",
    clientEmail: "dispatch@laurentianglobal.ca",
    clientPhone: "+1 (514) 555-0199",
    origin: "Montreal (QC)",
    originDetail: "4850 Rue Saint-Patrick, Montreal, QC H4E 4N4",
    destination: "Detroit (MI)",
    destinationDetail: "8900 East Jefferson Ave, Detroit, MI 48214",
    transportMode: "Refrigerated Reefer",
    equipment: "53' Temp-Controlled Reefer (-18°C)",
    cargoType: "Perishable / Cold-Chain",
    weight: "42,000 lbs (19,050 kg)",
    palletCount: 24,
    dimensions: "53ft x 102in x 110in",
    commodity: "Frozen Pharmaceutical & Cold-Chain Vaccine Precursors",
    preferredPickupDate: "Sep 05, 2026",
    specialInstructions: "Continuous cold-chain logging required. Temperature cannot exceed -18°C. Tailgate delivery required at destination dock 4.",
    submittedDate: "Sep 02, 2026",
    validUntil: "Sep 09, 2026",
    status: "under_review",
    statusLabelEn: "New / Under Review",
    statusLabelFr: "Nouvelle / En Révision",
    priceCad: "Pending Rate Calculation",
    adminNotes: "Transimex cross-border dispatch is confirming customs bond verification and reefer unit availability.",
  },
  {
    id: "QT-2026-00122",
    clientName: "Sarah Jenkins",
    clientCompany: "Ontario Precision Aerospace Inc.",
    clientEmail: "sjenkins@ontarioprecision.ca",
    clientPhone: "+1 (416) 555-0144",
    origin: "Mississauga (ON)",
    originDetail: "1200 Britannia Road East, Mississauga, ON L4W 4K5",
    destination: "Chicago (IL)",
    destinationDetail: "4000 West 39th St, Chicago, IL 60632",
    transportMode: "53' Dry Van",
    equipment: "53' Tandem Dry Van (Air-Ride Suspension)",
    cargoType: "General Freight",
    weight: "34,200 lbs (15,510 kg)",
    palletCount: 20,
    dimensions: "Standard 53ft Air-Ride Van",
    commodity: "Machined Aircraft Hydraulic Valves & Titanium Actuators",
    preferredPickupDate: "Sep 06, 2026",
    specialInstructions: "High-value cargo seal required. Driver must report CBSA entry at Ambassador Bridge crossing.",
    submittedDate: "Sep 01, 2026",
    validUntil: "Sep 08, 2026",
    status: "reviewing",
    statusLabelEn: "In Staff Review",
    statusLabelFr: "En Évaluation Staff",
    priceCad: "Calculating Carrier Tariffs...",
    adminNotes: "Checking with Swift Transport and Bison for backhaul capacity from Chicago.",
  },
  {
    id: "QT-2026-00118",
    clientName: "David Wong",
    clientCompany: "Pacific Gateway Distribution Corp.",
    clientEmail: "dwong@pacificgateway.ca",
    clientPhone: "+1 (604) 555-0182",
    origin: "Toronto (ON)",
    originDetail: "1200 Britannia Road East, Mississauga, ON L4W 4K5",
    destination: "Vancouver (BC)",
    destinationDetail: "3388 Viking Way, Richmond, BC V6V 1N6",
    transportMode: "53' Dry Van",
    equipment: "53' Tandem Dry Van (Air-Ride)",
    cargoType: "General Freight",
    weight: "36,500 lbs (16,550 kg)",
    palletCount: 26,
    dimensions: "53ft x 102in",
    commodity: "Consumer Electronics & Dry Retail Freight",
    preferredPickupDate: "Aug 30, 2026",
    specialInstructions: "Overnight cross-dock transfer. Direct highway team drivers requested.",
    submittedDate: "Aug 29, 2026",
    validUntil: "Sep 05, 2026",
    status: "accepted",
    statusLabelEn: "Accepted & Dispatched",
    statusLabelFr: "Acceptée & Expédiée",
    priceCad: "$6,200.00 CAD",
    breakdown: {
      lineHaul: "$5,100.00 CAD",
      fuelSurcharge: "$850.00 CAD",
      crossBorderFee: "$0.00 CAD (Domestic)",
      accessorials: "$250.00 CAD (Tailgate)",
      total: "$6,200.00 CAD",
    },
    shipmentId: "TMX-2026-00847",
    adminNotes: "Booking confirmed. Assigned driver Jean D. (Unit #402). Load is currently in transit.",
  },
  {
    id: "QT-2026-00105",
    clientName: "Trevor Miller",
    clientCompany: "Laurentian Western Industrial Hub",
    clientEmail: "tmiller@laurentianhub.ca",
    clientPhone: "+1 (403) 555-0177",
    origin: "Dorval Terminal (QC)",
    originDetail: "555 Boulevard Stuart-Graham, Dorval, QC H4Y 1J6",
    destination: "Halifax Port (NS)",
    destinationDetail: "1055 Marginal Road, Halifax, NS B3H 4P7",
    transportMode: "Flatbed / Heavy Haul",
    equipment: "48' Stepdeck Heavy Haul (Oversize)",
    cargoType: "Heavy Haul Oversize",
    weight: "48,500 lbs (22,000 kg)",
    palletCount: 4,
    dimensions: "48ft x 120in Wide Load",
    commodity: "Heavy Industrial Generator Turbine",
    preferredPickupDate: "Aug 24, 2026",
    specialInstructions: "Pilot cars required. Transport Quebec corridor oversized transit clearance.",
    submittedDate: "Aug 22, 2026",
    validUntil: "Expired",
    status: "rejected",
    statusLabelEn: "Quote Rejected",
    statusLabelFr: "Soumission Refusée",
    priceCad: "N/A",
    rejectionReason: "Weight exceeds Quebec Spring Thaw axle load limits for the requested highway corridor. Route requires specialized multi-axle perimeter trailer and provincial transport permits not available within requested 48-hour pickup window.",
    adminNotes: "Advised client to reschedule load window to permit specialized heavy-haul corridor escort approval.",
  },
  {
    id: "QT-2026-00098",
    clientName: "Marc-Antoine Villeneuve",
    clientCompany: "Quebec Forest Products Syndicate",
    clientEmail: "mavilleneuve@qfps.qc.ca",
    clientPhone: "+1 (418) 555-0133",
    origin: "Quebec City (QC)",
    originDetail: "150 Rue de Courcelette, Quebec, QC G1K 4T5",
    destination: "Chicago (IL)",
    destinationDetail: "4000 West 39th St, Chicago, IL 60632",
    transportMode: "Intermodal Rail",
    equipment: "53' High-Cube Container",
    cargoType: "General Freight",
    weight: "41,000 lbs (18,600 kg)",
    palletCount: 22,
    dimensions: "53ft Container",
    commodity: "Paper Products & Newsprint Rolls",
    preferredPickupDate: "Aug 16, 2026",
    specialInstructions: "CN Rail terminal drop-off before 17:00.",
    submittedDate: "Aug 15, 2026",
    validUntil: "Aug 22, 2026",
    status: "expired",
    statusLabelEn: "Offer Expired",
    statusLabelFr: "Offre Expirée",
    priceCad: "$3,850.00 CAD",
    breakdown: {
      lineHaul: "$3,100.00 CAD",
      fuelSurcharge: "$550.00 CAD",
      crossBorderFee: "$200.00 CAD (Customs)",
      total: "$3,850.00 CAD",
    },
    adminNotes: "Quote validity period passed without booking confirmation.",
  },
];

// Initial Documents Vault Dataset
// Demonstrates strict enforcement of isClientVisible: true vs false
export const INITIAL_DOCUMENTS: VaultDocument[] = [
  {
    id: "DOC-99482",
    name: "Bill_of_Lading_TMX-00847.pdf",
    type: "Bill of Lading",
    shipmentId: "TMX-00847",
    dateUploaded: "Sep 01, 2026",
    size: "245 KB",
    isClientVisible: true,
    fileFormat: "PDF",
    statusText: "Official Shipper Signed",
  },
  {
    id: "DOC-99481",
    name: "Proof_of_Delivery_POD_TMX-00810.pdf",
    type: "Proof of Delivery",
    shipmentId: "TMX-00810",
    dateUploaded: "Aug 30, 2026",
    size: "520 KB",
    isClientVisible: true,
    fileFormat: "PDF",
    statusText: "Receiver Signed & Stamped",
  },
  {
    id: "DOC-99480",
    name: "CBSA_Customs_PARS_Entry_TMX-00839.pdf",
    type: "Customs Entry",
    shipmentId: "TMX-00839",
    dateUploaded: "Aug 31, 2026",
    size: "410 KB",
    isClientVisible: true,
    fileFormat: "PDF",
    statusText: "CBSA Cleared & Released",
    customsPars: "PARS-8849-QC",
  },
  {
    id: "DOC-99479",
    name: "Air_Waybill_AWB_TMX-00855.pdf",
    type: "Air Waybill",
    shipmentId: "TMX-00855",
    dateUploaded: "Aug 29, 2026",
    size: "310 KB",
    isClientVisible: true,
    fileFormat: "PDF",
    statusText: "IATA Flight Manifest Confirmed",
  },
  {
    id: "DOC-99478",
    name: "CN_Rail_Waybill_TMX-00839.pdf",
    type: "Rail Waybill",
    shipmentId: "TMX-00839",
    dateUploaded: "Aug 28, 2026",
    size: "290 KB",
    isClientVisible: true,
    fileFormat: "PDF",
    statusText: "Intermodal Terminal Staged",
  },
  {
    id: "DOC-99477",
    name: "Commercial_Invoice_Laurentian_882.pdf",
    type: "Commercial Invoice",
    shipmentId: "TMX-00810",
    dateUploaded: "Aug 30, 2026",
    size: "185 KB",
    isClientVisible: true,
    fileFormat: "PDF",
    statusText: "Commercial Verified",
  },
  // =========================================================================
  // INTERNAL ONLY DOCUMENTS: isClientVisible: false
  // SECURITY REQUIREMENT: Under no circumstances should these appear in the client vault!
  // =========================================================================
  {
    id: "DOC-INTERNAL-001",
    name: "Transimex_Internal_Carrier_Rate_Audit_TMX00847.pdf",
    type: "Commercial Invoice",
    shipmentId: "TMX-00847",
    dateUploaded: "Sep 01, 2026",
    size: "190 KB",
    isClientVisible: false, // Internal confidential
    fileFormat: "PDF",
    statusText: "Internal Admin Margin Audit",
  },
  {
    id: "DOC-INTERNAL-002",
    name: "Driver_ELD_Telematics_Log_Internal.pdf",
    type: "Bill of Lading",
    shipmentId: "TMX-00842",
    dateUploaded: "Aug 31, 2026",
    size: "820 KB",
    isClientVisible: false, // Internal telematics
    fileFormat: "PDF",
    statusText: "Internal HOS Log",
  },
];

// Helper storage keys for browser state persistence
const ADDRESSES_STORAGE_KEY = "transimex_saved_addresses_v1";
const QUOTES_STORAGE_KEY = "transimex_quotes_store_v1";

export function getStoredAddresses(): SavedAddress[] {
  if (typeof window === "undefined") return INITIAL_ADDRESSES;
  try {
    const data = localStorage.getItem(ADDRESSES_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading addresses from storage:", err);
  }
  return INITIAL_ADDRESSES;
}

export function saveStoredAddresses(addresses: SavedAddress[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ADDRESSES_STORAGE_KEY, JSON.stringify(addresses));
  } catch (err) {
    console.error("Error writing addresses to storage:", err);
  }
}

export function getStoredQuotes(): QuoteItem[] {
  if (typeof window === "undefined") return INITIAL_QUOTES;
  try {
    const data = localStorage.getItem(QUOTES_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading quotes from storage:", err);
  }
  return INITIAL_QUOTES;
}

export function saveStoredQuotes(quotes: QuoteItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(QUOTES_STORAGE_KEY, JSON.stringify(quotes));
  } catch (err) {
    console.error("Error writing quotes to storage:", err);
  }
}

export function addQuoteToStore(quote: QuoteItem): void {
  const current = getStoredQuotes();
  saveStoredQuotes([quote, ...current]);
}

export function updateQuoteStatus(id: string, updates: Partial<QuoteItem>): QuoteItem | null {
  const current = getStoredQuotes();
  const index = current.findIndex((q) => q.id === id);
  if (index === -1) return null;

  const updated: QuoteItem = {
    ...current[index],
    ...updates,
  };
  current[index] = updated;
  saveStoredQuotes(current);
  return updated;
}

export function acceptQuoteAndGenerateShipment(
  id: string,
  priceCad: string,
  breakdown?: QuoteItem["breakdown"],
  adminNotes?: string
): { quote: QuoteItem; trackingId: string } | null {
  const current = getStoredQuotes();
  const index = current.findIndex((q) => q.id === id);
  if (index === -1) return null;

  // Auto-generate sequential Tracking ID e.g. TMX-2026-00850
  const randomSuffix = Math.floor(10000 + Math.random() * 90000);
  const trackingId = `TMX-2026-${randomSuffix}`;

  const updatedQuote: QuoteItem = {
    ...current[index],
    status: "accepted",
    statusLabelEn: "Accepted & Dispatched",
    statusLabelFr: "Acceptée & Expédiée",
    priceCad,
    breakdown: breakdown || current[index].breakdown || {
      lineHaul: priceCad,
      fuelSurcharge: "$0.00 CAD",
      total: priceCad,
    },
    shipmentId: trackingId,
    adminNotes: adminNotes || current[index].adminNotes,
  };

  current[index] = updatedQuote;
  saveStoredQuotes(current);
  return { quote: updatedQuote, trackingId };
}

export function rejectQuote(
  id: string,
  reason: string,
  adminNotes?: string
): QuoteItem | null {
  const current = getStoredQuotes();
  const index = current.findIndex((q) => q.id === id);
  if (index === -1) return null;

  const updatedQuote: QuoteItem = {
    ...current[index],
    status: "rejected",
    statusLabelEn: "Quote Rejected",
    statusLabelFr: "Soumission Refusée",
    rejectionReason: reason,
    adminNotes: adminNotes || current[index].adminNotes,
  };

  current[index] = updatedQuote;
  saveStoredQuotes(current);
  return updatedQuote;
}

// =========================================================================
// DOCUMENT VAULT PERSISTENCE & VISIBILITY ENGINE
// =========================================================================

const DOCUMENTS_STORAGE_KEY = "transimex_vault_documents_v1";

export function getStoredDocuments(): VaultDocument[] {
  if (typeof window === "undefined") return INITIAL_DOCUMENTS;
  try {
    const data = localStorage.getItem(DOCUMENTS_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading documents from storage:", err);
  }
  return INITIAL_DOCUMENTS;
}

export function saveStoredDocuments(docs: VaultDocument[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DOCUMENTS_STORAGE_KEY, JSON.stringify(docs));
    window.dispatchEvent(new CustomEvent("transimex_documents_updated", { detail: docs }));
  } catch (err) {
    console.error("Error writing documents to storage:", err);
  }
}

export function addDocumentToStore(doc: VaultDocument): VaultDocument {
  const current = getStoredDocuments();
  const updated = [doc, ...current];
  saveStoredDocuments(updated);
  return doc;
}

export function toggleDocumentVisibility(docId: string): VaultDocument | null {
  const current = getStoredDocuments();
  const index = current.findIndex((d) => d.id === docId);
  if (index === -1) return null;

  const toggled: VaultDocument = {
    ...current[index],
    isClientVisible: !current[index].isClientVisible,
  };

  current[index] = toggled;
  saveStoredDocuments(current);
  return toggled;
}

/**
 * Filter vault documents ensuring only client-visible documents are returned.
 */
export function getClientVisibleDocuments(): VaultDocument[] {
  const docs = getStoredDocuments();
  return docs.filter((doc) => doc.isClientVisible === true);
}

// =========================================================================
// CUSTOMS COMPLIANCE RECORD DATA MODEL & STORE
// =========================================================================

export type CustomsClearanceStatus = "Pending" | "In Review" | "Released" | "Held";

export interface CustomsComplianceRecord {
  shipmentId: string;
  status: CustomsClearanceStatus;
  broker: string;
  portOfEntry: string;
  cbsaPars: string;
  cbsaNotes: string;
  duties: {
    amountCad: string;
    taxGstHst: string;
    brokerageFee: string;
    totalOwed: string;
    status: "Unassessed" | "Notice Dispatched" | "Settled";
    dispatchedAt?: string;
  };
  lastUpdated: string;
}

export const INITIAL_CUSTOMS_RECORDS: Record<string, CustomsComplianceRecord> = {
  "TMX-00839": {
    shipmentId: "TMX-00839",
    status: "Held",
    broker: "Livingston International Brokerage",
    portOfEntry: "Dorval Customs Terminal (QC)",
    cbsaPars: "PARS-8849-QC",
    cbsaNotes: "Secondary inspection flag: CBSA Officer #814 requesting verified B3 commercial invoice copy for Harmonized Tariff classification 8411.82.",
    duties: {
      amountCad: "$1,850.00 CAD",
      taxGstHst: "$420.00 CAD",
      brokerageFee: "$150.00 CAD",
      totalOwed: "$2,420.00 CAD",
      status: "Notice Dispatched",
      dispatchedAt: "Sep 01, 2026, 14:30",
    },
    lastUpdated: "2026-09-02T16:30:00Z",
  },
  "TMX-00847": {
    shipmentId: "TMX-00847",
    status: "Released",
    broker: "Transimex In-House Customs Gateway",
    portOfEntry: "Ambassador Bridge (Windsor / Detroit)",
    cbsaPars: "PARS-9948-ON",
    cbsaNotes: "Cleared without examination. ACI eManifest transmitted and accepted by CBSA.",
    duties: {
      amountCad: "$0.00 CAD",
      taxGstHst: "$0.00 CAD",
      brokerageFee: "$0.00 CAD",
      totalOwed: "$0.00 CAD",
      status: "Settled",
    },
    lastUpdated: "2026-09-02T15:45:00Z",
  },
  "TMX-00842": {
    shipmentId: "TMX-00842",
    status: "In Review",
    broker: "FedEx Trade Networks Transport & Brokerage",
    portOfEntry: "Lacolle / Champlain Crossing (QC / NY)",
    cbsaPars: "PARS-7721-NY",
    cbsaNotes: "Pharma cold-chain manifest under automated FDA/CFIA electronic review.",
    duties: {
      amountCad: "$920.00 CAD",
      taxGstHst: "$138.00 CAD",
      brokerageFee: "$110.00 CAD",
      totalOwed: "$1,168.00 CAD",
      status: "Unassessed",
    },
    lastUpdated: "2026-09-02T14:15:00Z",
  },
  "TMX-00810": {
    shipmentId: "TMX-00810",
    status: "Released",
    broker: "Cole International Customs Brokers",
    portOfEntry: "Montreal Port Berth 42 (QC)",
    cbsaPars: "PARS-4410-QC",
    cbsaNotes: "Heavy haul machinery customs entry cleared. CBSA stamp confirmed.",
    duties: {
      amountCad: "$3,400.00 CAD",
      taxGstHst: "$510.00 CAD",
      brokerageFee: "$220.00 CAD",
      totalOwed: "$4,130.00 CAD",
      status: "Settled",
      dispatchedAt: "Aug 30, 2026",
    },
    lastUpdated: "2026-08-30T17:15:00Z",
  },
};

const CUSTOMS_STORAGE_KEY = "transimex_customs_records_v1";

export function getStoredCustomsRecords(): Record<string, CustomsComplianceRecord> {
  if (typeof window === "undefined") return INITIAL_CUSTOMS_RECORDS;
  try {
    const data = localStorage.getItem(CUSTOMS_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading customs records from storage:", err);
  }
  return INITIAL_CUSTOMS_RECORDS;
}

export function saveStoredCustomsRecords(records: Record<string, CustomsComplianceRecord>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CUSTOMS_STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.error("Error writing customs records to storage:", err);
  }
}

export function getCustomsRecordForShipment(shipmentId: string): CustomsComplianceRecord {
  const records = getStoredCustomsRecords();
  if (records[shipmentId]) {
    return records[shipmentId];
  }
  // Default record if newly instantiated
  return {
    shipmentId,
    status: "Pending",
    broker: "Transimex In-House Customs Gateway",
    portOfEntry: "Canadian Highway Border Port",
    cbsaPars: `PARS-${Math.floor(1000 + Math.random() * 9000)}-CA`,
    cbsaNotes: "Awaiting cross-border manifest transmission.",
    duties: {
      amountCad: "$0.00 CAD",
      taxGstHst: "$0.00 CAD",
      brokerageFee: "$0.00 CAD",
      totalOwed: "$0.00 CAD",
      status: "Unassessed",
    },
    lastUpdated: new Date().toISOString(),
  };
}

export function updateCustomsRecordForShipment(
  shipmentId: string,
  updates: Partial<CustomsComplianceRecord>
): CustomsComplianceRecord {
  const records = getStoredCustomsRecords();
  const current = getCustomsRecordForShipment(shipmentId);
  const updated: CustomsComplianceRecord = {
    ...current,
    ...updates,
    shipmentId,
    lastUpdated: new Date().toISOString(),
  };
  records[shipmentId] = updated;
  saveStoredCustomsRecords(records);
  return updated;
}

// =========================================================================
// PHASE 4: NOTIFICATIONS INBOX DATA MODEL & STORAGE
// =========================================================================

export type NotificationCategory = "transit" | "customs" | "document" | "quote" | "system";

export interface PortalNotification {
  id: string;
  title: string;
  titleFr: string;
  desc: string;
  descFr: string;
  time: string;
  category: NotificationCategory;
  link: string;
  unread: boolean;
  timestamp: string;
}

export const INITIAL_NOTIFICATIONS: PortalNotification[] = [
  {
    id: "NOTIF-01",
    title: "CBSA Customs Action: Entry #8849-QC Inspection Staged",
    titleFr: "Action Douanes ASFC : Entrée #8849-QC en cours d'inspection",
    desc: "Dorval Terminal customs broker has staged paperwork. Release expected within 2 hours.",
    descFr: "Le courtier en douane au terminal de Dorval a soumis les documents. Mainlevée prévue d'ici 2 heures.",
    time: "25 mins ago",
    category: "customs",
    link: "/dashboard/shipments?id=TMX-00839",
    unread: true,
    timestamp: "2026-09-02T16:30:00Z",
  },
  {
    id: "NOTIF-02",
    title: "Live Telematics: Trailer #402 Departed Montreal Hub",
    titleFr: "Télématique en direct : Unité #402 partie du Hub de Montréal",
    desc: "Shipment TMX-00847 is on Highway 401 Westbound to Toronto. ETA today 04:15 PM.",
    descFr: "L'expédition TMX-00847 est sur l'autoroute 401 ouest vers Toronto. Heure d'arrivée prévue aujourd'hui 16h15.",
    time: "1 hour ago",
    category: "transit",
    link: "/dashboard/shipments?id=TMX-00847",
    unread: true,
    timestamp: "2026-09-02T15:45:00Z",
  },
  {
    id: "NOTIF-03",
    title: "Official Bill of Lading (BOL) Uploaded & Signed",
    titleFr: "Connaissement Officiel (BOL) téléversé et signé",
    desc: "Bill_of_Lading_TMX-00847.pdf is now available for download in your Document Vault.",
    descFr: "Le connaissement Bill_of_Lading_TMX-00847.pdf est disponible dans votre Coffre-fort numérique.",
    time: "3 hours ago",
    category: "document",
    link: "/dashboard/documents",
    unread: true,
    timestamp: "2026-09-02T13:30:00Z",
  },
  {
    id: "NOTIF-04",
    title: "Freight Quote QT-2026-00118 Accepted & Dispatched",
    titleFr: "Soumission de fret QT-2026-00118 acceptée et répartie",
    desc: "53' Dry Van carrier load from Toronto to Vancouver confirmed at $6,200.00 CAD.",
    descFr: "Chargement fourgon 53' de Toronto à Vancouver confirmé à 6 200,00 $ CAD.",
    time: "Yesterday",
    category: "quote",
    link: "/dashboard/quotes",
    unread: false,
    timestamp: "2026-09-01T11:00:00Z",
  },
  {
    id: "NOTIF-05",
    title: "Proof of Delivery (POD) Certified for TMX-00810",
    titleFr: "Preuve de Livraison (POD) certifiée pour TMX-00810",
    desc: "Receiver signature confirmed at Montreal Port Berth 42. Cargo successfully delivered.",
    descFr: "Signature du destinataire confirmée au quai 42 du Port de Montréal. Cargaison livrée.",
    time: "Aug 30, 2026",
    category: "document",
    link: "/dashboard/documents",
    unread: false,
    timestamp: "2026-08-30T17:15:00Z",
  },
];

const NOTIFICATIONS_STORAGE_KEY = "transimex_notifications_v1";

export function getStoredNotifications(): PortalNotification[] {
  if (typeof window === "undefined") return INITIAL_NOTIFICATIONS;
  try {
    const data = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading notifications from storage:", err);
  }
  return INITIAL_NOTIFICATIONS;
}

export function saveStoredNotifications(notifs: PortalNotification[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifs));
    window.dispatchEvent(new CustomEvent("transimex_notifications_updated", { detail: notifs }));
  } catch (err) {
    console.error("Error saving notifications:", err);
  }
}

export function markAllNotificationsRead(): PortalNotification[] {
  const current = getStoredNotifications();
  const updated = current.map((n) => ({ ...n, unread: false }));
  saveStoredNotifications(updated);
  return updated;
}

export function markNotificationRead(id: string): PortalNotification[] {
  const current = getStoredNotifications();
  const updated = current.map((n) => (n.id === id ? { ...n, unread: false } : n));
  saveStoredNotifications(updated);
  return updated;
}

export function getUnreadNotificationsCount(): number {
  const notifs = getStoredNotifications();
  return notifs.filter((n) => n.unread).length;
}

// =========================================================================
// PHASE 4: SUPPORT TICKETING DATA MODEL & STORAGE
// =========================================================================

export type TicketStatus = "Open" | "In Progress" | "Resolved";

export interface SupportTicket {
  id: string; // e.g. "TKT-2026-0042"
  subject: string;
  category: string;
  linkedShipmentId?: string;
  priority: "Low" | "Medium" | "High" | "Critical Dispatch Emergency";
  message: string;
  status: TicketStatus;
  statusFr: string;
  createdAt: string;
  updatedAt: string;
  assignedAgent: string;
  responses?: {
    id: string;
    sender: string;
    role: "agent" | "client";
    message: string;
    time: string;
  }[];
}

export const INITIAL_TICKETS: SupportTicket[] = [
  {
    id: "TKT-2026-0042",
    subject: "Temperature logging request for Reefer shipment TMX-00842",
    category: "Shipment Telematics & Tracking",
    linkedShipmentId: "TMX-00842",
    priority: "High",
    message: "Could dispatch provide continuous cold-chain temperature telemetry logs for trailer unit #118 (-18°C setpoint) for pharmaceutical compliance audit?",
    status: "In Progress",
    statusFr: "En Cours",
    createdAt: "Today, 10:15 AM",
    updatedAt: "35 mins ago",
    assignedAgent: "David Tremblay (Transimex Dispatch)",
    responses: [
      {
        id: "R-1",
        sender: "David Tremblay",
        role: "agent",
        message: "Telemetry sensor data received. Temperature has remained steady at -18.2°C throughout the transit corridor. Exporting calibrated PDF log for you.",
        time: "35 mins ago",
      },
    ],
  },
  {
    id: "TKT-2026-0038",
    subject: "CBSA PARS customs declaration copy for Entry #8849-01",
    category: "Customs Clearance & CBSA",
    linkedShipmentId: "TMX-00839",
    priority: "Medium",
    message: "Need the stamped CBSA B3 customs clearance manifest copy for Canadian internal accounting verification.",
    status: "Resolved",
    statusFr: "Résolu",
    createdAt: "Aug 31, 2026",
    updatedAt: "Yesterday",
    assignedAgent: "Elena Roy (Customs Brokerage)",
    responses: [
      {
        id: "R-2",
        sender: "Elena Roy",
        role: "agent",
        message: "Electronic clearance entry PARS-8849-QC has been verified and released by CBSA. Attached in your Documents Vault.",
        time: "Yesterday",
      },
    ],
  },
  {
    id: "TKT-2026-0029",
    subject: "Inquiry regarding container demurrage free days at Douala Port",
    category: "Billing & Tariff Invoices",
    priority: "Low",
    message: "Requesting confirmation of 14-day free container demurrage window for upcoming ocean FCL shipment to Douala seaport.",
    status: "Resolved",
    statusFr: "Résolu",
    createdAt: "Aug 26, 2026",
    updatedAt: "Aug 27, 2026",
    assignedAgent: "Marc-Antoine V. (Commercial Accounts)",
    responses: [
      {
        id: "R-3",
        sender: "Marc-Antoine V.",
        role: "agent",
        message: "Confirmed. Standard Transimex enterprise ocean booking includes 14 free detention/demurrage days at Douala terminal.",
        time: "Aug 27, 2026",
      },
    ],
  },
];

const TICKETS_STORAGE_KEY = "transimex_support_tickets_v1";

export function getStoredTickets(): SupportTicket[] {
  if (typeof window === "undefined") return INITIAL_TICKETS;
  try {
    const data = localStorage.getItem(TICKETS_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading tickets from storage:", err);
  }
  return INITIAL_TICKETS;
}

export function saveStoredTickets(tickets: SupportTicket[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TICKETS_STORAGE_KEY, JSON.stringify(tickets));
  } catch (err) {
    console.error("Error saving tickets:", err);
  }
}

export function addSupportTicket(ticket: SupportTicket): void {
  const current = getStoredTickets();
  saveStoredTickets([ticket, ...current]);
}

// =========================================================================
// PHASE 4: ACCOUNT NOTIFICATION PREFERENCES & PROFILE
// =========================================================================

export interface EmailPreferences {
  emailShipmentUpdates: boolean;
  emailCustomsHolds: boolean;
  emailNewDocuments: boolean;
  emailRateAlerts: boolean;
  smsUrgentAlerts: boolean;
}

export const DEFAULT_PREFERENCES: EmailPreferences = {
  emailShipmentUpdates: true,
  emailCustomsHolds: true,
  emailNewDocuments: true,
  emailRateAlerts: false,
  smsUrgentAlerts: true,
};

const PREFERENCES_STORAGE_KEY = "transimex_email_preferences_v1";

export function getStoredPreferences(): EmailPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const data = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading preferences:", err);
  }
  return DEFAULT_PREFERENCES;
}

export function saveStoredPreferences(prefs: EmailPreferences): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(prefs));
  } catch (err) {
    console.error("Error saving preferences:", err);
  }
}

// =========================================================================
// PHASE 5: CLIENT MANAGEMENT DIRECTORY & 360° DOSSIER DATA MODEL
// =========================================================================

export type ClientIndustry =
  | "Manufacturing"
  | "Automotive"
  | "Pharmaceutical"
  | "Retail & Consumer"
  | "Food & Cold-Chain"
  | "Industrial & Energy";

export type ClientAccountStatus = "Active" | "Deactivated";

export interface ClientProfile {
  id: string;
  companyName: string;
  primaryContact: string;
  contactTitle?: string;
  email: string;
  phone: string;
  industry: ClientIndustry;
  status: ClientAccountStatus;
  registeredDate: string;
  billingAddress: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  taxId: string;
  paymentTerms: string;
  accountManager: string;
  lifetimeRevenueCad: string;
  totalShipmentsCompleted: number;
  activeQuotesCount: number;
  notes?: string;
}

export const INITIAL_CLIENTS: ClientProfile[] = [
  {
    id: "CLI-1001",
    companyName: "Laurentian Global Logistics Ltd.",
    primaryContact: "Marc Tremblay",
    contactTitle: "VP Supply Chain & Operations",
    email: "dispatch@laurentianglobal.ca",
    phone: "+1 (514) 555-0199",
    industry: "Manufacturing",
    status: "Active",
    registeredDate: "Jan 12, 2025",
    billingAddress: "4850 Rue Saint-Patrick, Suite 400",
    city: "Montreal",
    province: "QC",
    postalCode: "H4E 4N4",
    country: "Canada",
    taxId: "GST-8921-9920-RT0001",
    paymentTerms: "Net 30 Days",
    accountManager: "Jean-Philippe Tremblay",
    lifetimeRevenueCad: "$142,500 CAD",
    totalShipmentsCompleted: 18,
    activeQuotesCount: 2,
    notes: "Tier-1 industrial manufacturing account. Regularly runs cross-border reefer and dry van corridors to Detroit and Chicago.",
  },
  {
    id: "CLI-1002",
    companyName: "Ontario Precision Aerospace Inc.",
    primaryContact: "Sarah Jenkins",
    contactTitle: "Director of Global Procurement",
    email: "sjenkins@ontarioprecision.ca",
    phone: "+1 (416) 555-0144",
    industry: "Automotive",
    status: "Active",
    registeredDate: "Mar 04, 2025",
    billingAddress: "1200 Britannia Road East",
    city: "Mississauga",
    province: "ON",
    postalCode: "L4W 4K5",
    country: "Canada",
    taxId: "GST-4412-8819-RT0001",
    paymentTerms: "Net 15 Days",
    accountManager: "Éléonore Moreau",
    lifetimeRevenueCad: "$98,400 CAD",
    totalShipmentsCompleted: 12,
    activeQuotesCount: 1,
    notes: "High-value aircraft component shipper. Requires air-ride suspension and sealed trailer documentation on all loads.",
  },
  {
    id: "CLI-1003",
    companyName: "Pacific Gateway Distribution Corp.",
    primaryContact: "David Wong",
    contactTitle: "Logistics Routing Coordinator",
    email: "dwong@pacificgateway.ca",
    phone: "+1 (604) 555-0182",
    industry: "Retail & Consumer",
    status: "Active",
    registeredDate: "May 19, 2025",
    billingAddress: "3388 Viking Way",
    city: "Richmond",
    province: "BC",
    postalCode: "V6V 1N6",
    country: "Canada",
    taxId: "GST-5510-7732-RT0001",
    paymentTerms: "Net 30 Days",
    accountManager: "Marc-André Bélanger",
    lifetimeRevenueCad: "$76,200 CAD",
    totalShipmentsCompleted: 9,
    activeQuotesCount: 1,
    notes: "Western Canadian consumer electronics retail hub. Regularly books cross-Canada highway corridors from Toronto.",
  },
  {
    id: "CLI-1004",
    companyName: "Quebec Forest Products Syndicate",
    primaryContact: "Marc-Antoine Villeneuve",
    contactTitle: "Chief Forestry Dispatcher",
    email: "mavilleneuve@qfps.qc.ca",
    phone: "+1 (418) 555-0133",
    industry: "Industrial & Energy",
    status: "Deactivated",
    registeredDate: "Jul 22, 2025",
    billingAddress: "150 Rue de Courcelette",
    city: "Quebec City",
    province: "QC",
    postalCode: "G1K 4T5",
    country: "Canada",
    taxId: "GST-1102-3399-RT0001",
    paymentTerms: "Pre-Paid Wire",
    accountManager: "Jean-Philippe Tremblay",
    lifetimeRevenueCad: "$24,500 CAD",
    totalShipmentsCompleted: 4,
    activeQuotesCount: 0,
    notes: "Account temporarily suspended due to credit line reconciliation. Portal access revoked until accounting review.",
  },
  {
    id: "CLI-1005",
    companyName: "Apex Maritime Energy & Heavy Haul",
    primaryContact: "Trevor Miller",
    contactTitle: "Marine Terminal Operations Officer",
    email: "tmiller@apexmaritime.ca",
    phone: "+1 (403) 555-0177",
    industry: "Industrial & Energy",
    status: "Active",
    registeredDate: "Nov 10, 2025",
    billingAddress: "1055 Marginal Road",
    city: "Halifax",
    province: "NS",
    postalCode: "B3H 4P7",
    country: "Canada",
    taxId: "GST-7740-1120-RT0001",
    paymentTerms: "Net 45 Days",
    accountManager: "Éléonore Moreau",
    lifetimeRevenueCad: "$188,900 CAD",
    totalShipmentsCompleted: 22,
    activeQuotesCount: 1,
    notes: "Maritime port heavy-machinery shipper. Frequently books 48ft and 53ft stepdeck flatbeds and ocean terminal transfers.",
  },
];

const CLIENTS_STORAGE_KEY = "transimex_clients_store_v1";

export function getStoredClients(): ClientProfile[] {
  if (typeof window === "undefined") return INITIAL_CLIENTS;
  try {
    const data = localStorage.getItem(CLIENTS_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading clients from storage:", err);
  }
  return INITIAL_CLIENTS;
}

export function saveStoredClients(clients: ClientProfile[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(clients));
  } catch (err) {
    console.error("Error saving clients:", err);
  }
}

export function updateClientStatus(id: string, status: ClientAccountStatus): ClientProfile | null {
  const clients = getStoredClients();
  const index = clients.findIndex((c) => c.id === id || c.email.toLowerCase() === id.toLowerCase());
  if (index === -1) return null;

  clients[index] = {
    ...clients[index],
    status,
  };
  saveStoredClients(clients);
  return clients[index];
}

// =========================================================================
// PHASE 5: CARRIER & VENDOR DIRECTORY DATA MODEL
// =========================================================================

export type TransportModeType = "Road" | "Sea" | "Air" | "Rail";
export type VendorStatusType = "Active" | "Under Review" | "Suspended";

export interface CarrierVendor {
  id: string;
  name: string;
  code: string;
  primaryMode: TransportModeType;
  supportedModes: TransportModeType[];
  dispatchContact: {
    name: string;
    phone: string;
    email: string;
    emergencyPhone?: string;
  };
  headquarters: string;
  operatingLanes: string[];
  fleetSize: string;
  rating: number;
  totalShipmentsCompleted: number;
  onTimeDeliveryRate: string;
  insurance: {
    policyNumber: string;
    coverageAmount: string;
    expiryDate: string;
    isCompliant: boolean;
  };
  status: VendorStatusType;
  notes?: string;
}

export const INITIAL_CARRIERS: CarrierVendor[] = [
  {
    id: "CAR-01",
    name: "Bison Transport Expedited Fleet",
    code: "BISO",
    primaryMode: "Road",
    supportedModes: ["Road"],
    dispatchContact: {
      name: "Greg Sutherland",
      phone: "+1 (800) 555-0244",
      email: "dispatch.bison@transimex-carrier.ca",
      emergencyPhone: "+1 (204) 555-9110",
    },
    headquarters: "Winnipeg, MB",
    operatingLanes: ["Montreal <-> Detroit", "Toronto <-> Chicago", "Calgary <-> Vancouver"],
    fleetSize: "450+ Dry Van & Reefer Tandems",
    rating: 4.9,
    totalShipmentsCompleted: 312,
    onTimeDeliveryRate: "99.1%",
    insurance: {
      policyNumber: "POL-BISO-99824",
      coverageAmount: "$10,000,000 CAD",
      expiryDate: "2027-08-30",
      isCompliant: true,
    },
    status: "Active",
    notes: "Primary Tier-1 dedicated cross-border highway partner. Highest safety rating in network.",
  },
  {
    id: "CAR-02",
    name: "Canadian National (CN) Intermodal Rail",
    code: "CN-RAIL",
    primaryMode: "Rail",
    supportedModes: ["Rail", "Road"],
    dispatchContact: {
      name: "Line Dispatch Yard #4",
      phone: "+1 (888) 555-0190",
      email: "intermodal.ops@cn.ca",
      emergencyPhone: "+1 (514) 555-9988",
    },
    headquarters: "Montreal, QC",
    operatingLanes: ["Dorval Intermodal <-> Calgary Yard", "Halifax Port <-> Toronto Hub"],
    fleetSize: "Intermodal Container Rail Network",
    rating: 4.8,
    totalShipmentsCompleted: 580,
    onTimeDeliveryRate: "97.8%",
    insurance: {
      policyNumber: "POL-CN-CORP-4410",
      coverageAmount: "$50,000,000 CAD",
      expiryDate: "2028-12-31",
      isCompliant: true,
    },
    status: "Active",
    notes: "Transcontinental heavy container and long-haul rail authority.",
  },
  {
    id: "CAR-03",
    name: "CMA CGM Canada Maritime Express",
    code: "CMACGM",
    primaryMode: "Sea",
    supportedModes: ["Sea"],
    dispatchContact: {
      name: "Isabelle Gagnon",
      phone: "+1 (514) 555-0377",
      email: "canada.port@cma-cgm.com",
    },
    headquarters: "Montreal Port Maritime Center, QC",
    operatingLanes: ["Montreal Port <-> Antwerp / Rotterdam", "Halifax <-> Le Havre"],
    fleetSize: "Container Container Ships & Feeder Vessels",
    rating: 4.7,
    totalShipmentsCompleted: 145,
    onTimeDeliveryRate: "96.4%",
    insurance: {
      policyNumber: "POL-CMA-MAR-1192",
      coverageAmount: "$25,000,000 CAD",
      expiryDate: "2027-03-15",
      isCompliant: true,
    },
    status: "Active",
    notes: "Ocean freight partner for European import/export shipments and St. Lawrence seaway freight.",
  },
  {
    id: "CAR-04",
    name: "Cargojet Airways Dedicated Freight",
    code: "CJT",
    primaryMode: "Air",
    supportedModes: ["Air"],
    dispatchContact: {
      name: "Flight Ops Center",
      phone: "+1 (905) 555-0120",
      email: "flightops@cargojet.ca",
    },
    headquarters: "Mississauga, ON (YYZ Airport)",
    operatingLanes: ["Dorval (YUL) <-> Vancouver (YVR)", "Toronto (YYZ) <-> Frankfurt (FRA)"],
    fleetSize: "Boeing 767-300F & 757-200F Freighters",
    rating: 4.9,
    totalShipmentsCompleted: 88,
    onTimeDeliveryRate: "99.5%",
    insurance: {
      policyNumber: "POL-CJT-AV-88120",
      coverageAmount: "$30,000,000 CAD",
      expiryDate: "2027-11-01",
      isCompliant: true,
    },
    status: "Active",
    notes: "Next-flight-out expedited air cargo and overnight trans-Canada air freight.",
  },
  {
    id: "CAR-05",
    name: "Apex Specialized Heavy Haul & Flatbed",
    code: "APEX-HH",
    primaryMode: "Road",
    supportedModes: ["Road"],
    dispatchContact: {
      name: "Dave Kowalski",
      phone: "+1 (780) 555-0811",
      email: "dispatch@apexheavyhaul.ca",
    },
    headquarters: "Edmonton, AB",
    operatingLanes: ["Quebec <-> Alberta Corridors", "Ontario <-> Texas Corridor"],
    fleetSize: "40 Specialized Multi-Axle Lowboys & Stepdecks",
    rating: 4.6,
    totalShipmentsCompleted: 74,
    onTimeDeliveryRate: "95.2%",
    insurance: {
      policyNumber: "POL-APEX-SPEC-339",
      coverageAmount: "$8,000,000 CAD",
      expiryDate: "2026-09-28", // Expiring soon warning!
      isCompliant: true,
    },
    status: "Active",
    notes: "Specialized oversized turbine and industrial generator hauler with multi-province permits.",
  },
];

const CARRIERS_STORAGE_KEY = "transimex_carriers_store_v1";

export function getStoredCarriers(): CarrierVendor[] {
  if (typeof window === "undefined") return INITIAL_CARRIERS;
  try {
    const data = localStorage.getItem(CARRIERS_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading carriers from storage:", err);
  }
  return INITIAL_CARRIERS;
}

export function saveStoredCarriers(carriers: CarrierVendor[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CARRIERS_STORAGE_KEY, JSON.stringify(carriers));
  } catch (err) {
    console.error("Error saving carriers:", err);
  }
}

export function addCarrierToStore(carrier: CarrierVendor): CarrierVendor {
  const current = getStoredCarriers();
  const updated = [carrier, ...current];
  saveStoredCarriers(updated);
  return carrier;
}

export function updateCarrierInStore(id: string, updates: Partial<CarrierVendor>): CarrierVendor | null {
  const carriers = getStoredCarriers();
  const index = carriers.findIndex((c) => c.id === id || c.code.toUpperCase() === id.toUpperCase());
  if (index === -1) return null;

  carriers[index] = {
    ...carriers[index],
    ...updates,
  };
  saveStoredCarriers(carriers);
  return carriers[index];
}



/**
 * Transimex Canada Logistics - Phase 3 Shared Mock Data & Store
 * Provides institutional quotes, secure document vault, and address book storage.
 */

import { SavedAddress } from "./validations/address";

export type QuoteStatus = "under_review" | "accepted" | "rejected" | "expired";

export interface QuoteItem {
  id: string; // e.g. "QT-2026-00124"
  origin: string;
  originDetail: string;
  destination: string;
  destinationDetail: string;
  transportMode: string;
  equipment: string;
  weight: string;
  palletCount?: number;
  commodity: string;
  submittedDate: string;
  validUntil: string;
  status: QuoteStatus;
  statusLabelEn: string;
  statusLabelFr: string;
  priceCad?: string;
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
    origin: "Montreal (QC)",
    originDetail: "4850 Rue Saint-Patrick, Montreal, QC H4E 4N4",
    destination: "Detroit (MI)",
    destinationDetail: "8900 East Jefferson Ave, Detroit, MI 48214",
    transportMode: "Refrigerated Reefer",
    equipment: "53' Temp-Controlled Reefer (-18°C)",
    weight: "42,000 lbs",
    palletCount: 24,
    commodity: "Frozen Pharmaceutical & Cold-Chain Goods",
    submittedDate: "Sep 02, 2026",
    validUntil: "Sep 09, 2026",
    status: "under_review",
    statusLabelEn: "Under Review",
    statusLabelFr: "En Révision",
    priceCad: "Pending Dispatch Calculation",
    adminNotes: "Transimex cross-border dispatch is confirming customs bond verification and reefer unit availability.",
  },
  {
    id: "QT-2026-00118",
    origin: "Toronto (ON)",
    originDetail: "1200 Britannia Road East, Mississauga, ON L4W 4K5",
    destination: "Vancouver (BC)",
    destinationDetail: "3388 Viking Way, Richmond, BC V6V 1N6",
    transportMode: "53' Dry Van",
    equipment: "53' Tandem Dry Van (Air-Ride)",
    weight: "36,500 lbs",
    palletCount: 26,
    commodity: "Consumer Electronics & Dry Retail Freight",
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
    shipmentId: "TMX-00847",
    adminNotes: "Booking confirmed. Assigned driver Jean D. (Unit #402). Load is currently in transit.",
  },
  {
    id: "QT-2026-00105",
    origin: "Dorval Terminal (QC)",
    originDetail: "555 Boulevard Stuart-Graham, Dorval, QC H4Y 1J6",
    destination: "Halifax Port (NS)",
    destinationDetail: "1055 Marginal Road, Halifax, NS B3H 4P7",
    transportMode: "Flatbed / Heavy Haul",
    equipment: "48' Stepdeck Heavy Haul (Oversize)",
    weight: "48,500 lbs",
    palletCount: 4,
    commodity: "Heavy Industrial Generator Turbine",
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
    origin: "Quebec City (QC)",
    originDetail: "150 Rue de Courcelette, Quebec, QC G1K 4T5",
    destination: "Chicago (IL)",
    destinationDetail: "4000 West 39th St, Chicago, IL 60632",
    transportMode: "Intermodal Rail",
    equipment: "53' High-Cube Container",
    weight: "41,000 lbs",
    palletCount: 22,
    commodity: "Paper Products & Newsprint Rolls",
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

/**
 * Filter vault documents ensuring only client-visible documents are returned.
 */
export function getClientVisibleDocuments(): VaultDocument[] {
  return INITIAL_DOCUMENTS.filter((doc) => doc.isClientVisible === true);
}

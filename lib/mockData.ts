/**
 * Transimex Canada Logistics - Client Portal Shared Types & Address Book Storage.
 *
 * Admin-panel mock data (quotes, clients, carriers, support, blog, resources, FAQ,
 * staff, audit log, email templates, customs, shipments) has been removed — those
 * features are now backed by real MongoDB collections (see app/api/admin/**).
 * What remains here backs client-portal-only features not covered by that migration.
 */

import { SavedAddress } from "./validations/address";

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

// Helper storage key for browser state persistence
const ADDRESSES_STORAGE_KEY = "transimex_saved_addresses_v1";

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

// =========================================================================
// CLIENT PORTAL NOTIFICATIONS — type only (real data comes from models/Notification.ts)
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

// =========================================================================
// CLIENT PORTAL SUPPORT TICKET TYPES — type only (real data comes from models/SupportTicket.ts)
// =========================================================================

export type TicketStatus = "Open" | "In Progress" | "Resolved";
export type TicketPriority =
  | "Low"
  | "Medium"
  | "High"
  | "Critical Dispatch Emergency"
  | "Urgent"
  | "Normal";

export interface TicketThreadMessage {
  id: string;
  sender: "client" | "admin";
  senderName: string;
  message: string;
  timestamp: string;
  isInternal?: boolean;
}

export interface SupportTicket {
  id: string; // e.g. "SUP-2026-0042" or "TKT-2026-0042"
  ticketId?: string;
  client?: {
    name: string;
    companyName: string;
    email: string;
  };
  subject: string;
  category: string;
  linkedShipmentId?: string;
  shipmentId?: string;
  priority: TicketPriority;
  message: string;
  status: TicketStatus;
  statusFr?: string;
  createdAt: string;
  updatedAt: string;
  assignedAgent?: string;
  internalNotes?: string;
  messages?: TicketThreadMessage[];
  responses?: {
    id: string;
    sender: string;
    role: "agent" | "client";
    message: string;
    time: string;
  }[];
}

// =========================================================================
// ACCOUNT NOTIFICATION PREFERENCES — type only (real data lives on models/User.ts)
// =========================================================================

export interface EmailPreferences {
  emailShipmentUpdates: boolean;
  emailCustomsHolds: boolean;
  emailNewDocuments: boolean;
  emailRateAlerts: boolean;
  smsUrgentAlerts: boolean;
}

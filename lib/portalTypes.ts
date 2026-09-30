/**
 * Transimex Canada Logistics - shared client-portal types. Type definitions
 * only; the data itself lives in MongoDB (see models/).
 */

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
  dateTime: string;
  category: NotificationCategory;
  link: string;
  shipmentId: string;
  route: string;
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

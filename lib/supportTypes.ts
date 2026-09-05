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

export interface SupportTicketItem {
  id: string;
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
  createdAt: string;
  updatedAt: string;
  internalNotes?: string;
  messages?: TicketThreadMessage[];
}

import { z } from "zod";

export const ticketCategoriesEnum = [
  "Shipment Telematics & Tracking",
  "Customs Clearance & CBSA",
  "Billing & Tariff Invoices",
  "Document Request",
  "General Logistics Inquiry",
] as const;

export const ticketPrioritiesEnum = [
  "Low",
  "Medium",
  "High",
  "Critical Dispatch Emergency",
] as const;

export type TicketCategory = (typeof ticketCategoriesEnum)[number];
export type TicketPriority = (typeof ticketPrioritiesEnum)[number];

export const supportTicketSchema = z.object({
  subject: z
    .string()
    .min(3, "Subject must be at least 3 characters")
    .max(120, "Subject must be under 120 characters"),
  category: z.enum(ticketCategoriesEnum, {
    errorMap: () => ({ message: "Please select an inquiry category" }),
  }),
  linkedShipmentId: z
    .string()
    .optional(),
  priority: z.enum(ticketPrioritiesEnum, {
    errorMap: () => ({ message: "Please select priority level" }),
  }),
  message: z
    .string()
    .min(10, "Please describe your request in at least 10 characters")
    .max(1500, "Message cannot exceed 1500 characters"),
});

export type SupportTicketFormData = z.infer<typeof supportTicketSchema>;

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

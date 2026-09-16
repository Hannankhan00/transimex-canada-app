export type QuoteStatus =
  | "under_review"
  | "reviewing"
  | "quoted"
  | "client_rejected"
  | "accepted"
  | "rejected"
  | "expired";

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
  clientNegotiationPhone?: string;
  clientRejectionReason?: string;
  clientCounterBudget?: string;
  rejectionBy?: "admin" | "client";
  offeredAt?: string;
  clientRespondedAt?: string;
  adminNotes?: string;
}

export function mapQuote(q: any): QuoteItem {
  return {
    id: q.refNumber,
    clientName: q.client?.name || "",
    clientCompany: q.client?.companyName || "",
    clientEmail: q.client?.email || "",
    clientPhone: q.client?.phone || "",
    userId: q.client?.userId || "",
    origin: q.route?.origin || "",
    originDetail: q.route?.originDetail || "",
    destination: q.route?.destination || "",
    destinationDetail: q.route?.destinationDetail || "",
    transportMode: q.cargo?.transportMode || "",
    equipment: q.cargo?.equipment || "",
    cargoType: q.cargo?.cargoType || "General Freight",
    weight: q.cargo?.weight || "",
    palletCount: q.cargo?.palletCount || 0,
    dimensions: q.cargo?.dimensions || "",
    commodity: q.cargo?.commodity || "",
    preferredPickupDate: q.cargo?.preferredPickupDate || "",
    specialInstructions: q.cargo?.specialInstructions || "",
    submittedDate: q.submittedDate,
    validUntil: q.validUntil || "",
    status: q.status,
    statusLabelEn:
      q.status === "accepted"
        ? "Accepted & Dispatched"
        : q.status === "quoted"
        ? "Rate Offered / Awaiting Client"
        : q.status === "client_rejected"
        ? "Rate Declined / In Negotiation"
        : q.status === "reviewing"
        ? "In Staff Review"
        : q.status === "rejected"
        ? "Quote Rejected"
        : q.status === "expired"
        ? "Offer Expired"
        : "New / Under Review",
    statusLabelFr:
      q.status === "accepted"
        ? "Acceptée & Expédiée"
        : q.status === "quoted"
        ? "Tarif Proposé / En Attente"
        : q.status === "client_rejected"
        ? "Tarif Refusé / En Négociation"
        : q.status === "reviewing"
        ? "En Évaluation Staff"
        : q.status === "rejected"
        ? "Soumission Refusée"
        : q.status === "expired"
        ? "Offre Expirée"
        : "Nouvelle / En Révision",
    priceCad: q.priceCad || "Pending Dispatch Calculation",
    priceUsd: q.priceUsd || "",
    breakdown: q.breakdown && q.breakdown.total ? q.breakdown : undefined,
    shipmentId: q.shipmentId || "",
    rejectionReason: q.rejectionReason || "",
    clientNegotiationPhone: q.clientNegotiationPhone || "",
    clientRejectionReason: q.clientRejectionReason || "",
    clientCounterBudget: q.clientCounterBudget || "",
    rejectionBy: q.rejectionBy || "",
    offeredAt: q.offeredAt || "",
    clientRespondedAt: q.clientRespondedAt || "",
    adminNotes: q.adminNotes || "",
  };
}

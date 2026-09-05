import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Quote from "@/models/Quote";
import Shipment, { ShipmentStatus } from "@/models/Shipment";
import Inquiry from "@/models/Inquiry";
import SupportTicket from "@/models/SupportTicket";

const ACTIVE_SHIPMENT_STATUSES: ShipmentStatus[] = [
  "Pending Dispatch",
  "In Transit",
  "Customs Hold",
  "Out for Delivery",
];

type ActivityCategory = "quote" | "shipment" | "customs" | "inquiry" | "ticket";
type ActivityStatusType = "success" | "warning" | "danger" | "info" | "neutral";

interface ActivityItem {
  id: string;
  category: ActivityCategory;
  title: string;
  titleFr: string;
  detail: string;
  detailFr: string;
  time: string;
  timestamp: string;
  actor: string;
  statusText: string;
  statusType: ActivityStatusType;
  actionLink?: string;
  referenceId?: string;
}

function timeAgo(date: Date): string {
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}

function quoteToActivity(q: any): ActivityItem {
  const statusMap: Record<string, { text: string; fr: string; type: ActivityStatusType }> = {
    accepted: { text: "Accepted & Dispatched", fr: "Acceptée & Expédiée", type: "success" },
    reviewing: { text: "In Staff Review", fr: "En Évaluation Staff", type: "warning" },
    rejected: { text: "Quote Rejected", fr: "Soumission Refusée", type: "danger" },
    expired: { text: "Quote Expired", fr: "Soumission Expirée", type: "neutral" },
    under_review: { text: "New / Under Review", fr: "Nouvelle / En Révision", type: "info" },
  };
  const s = statusMap[q.status] || statusMap.under_review;
  const updated: Date = q.updatedAt || q.createdAt || new Date();
  return {
    id: `quote-${q._id}`,
    category: "quote",
    title: `Quote ${q.refNumber} ${s.text}`,
    titleFr: `Soumission ${q.refNumber} ${s.fr}`,
    detail: `${q.client?.name || "Client"}${q.client?.companyName ? ` (${q.client.companyName})` : ""} — ${q.route?.origin || ""} to ${q.route?.destination || ""}.`,
    detailFr: `${q.client?.name || "Client"}${q.client?.companyName ? ` (${q.client.companyName})` : ""} — ${q.route?.origin || ""} vers ${q.route?.destination || ""}.`,
    time: timeAgo(updated),
    timestamp: new Date(updated).toISOString(),
    actor: q.client?.name || "Client",
    statusText: s.text,
    statusType: s.type,
    actionLink: "/admin/quotes",
    referenceId: q.refNumber,
  };
}

function shipmentToActivity(s: any): ActivityItem {
  const statusMap: Record<string, { text: string; fr: string; type: ActivityStatusType; category: ActivityCategory }> = {
    "Pending Dispatch": { text: "Pending Dispatch", fr: "En Attente de Répartition", type: "info", category: "shipment" },
    "In Transit": { text: "In Transit", fr: "En Transit", type: "info", category: "shipment" },
    "Customs Hold": { text: "Customs Hold", fr: "Blocage Douanier", type: "danger", category: "customs" },
    "Out for Delivery": { text: "Out for Delivery", fr: "En Livraison", type: "warning", category: "shipment" },
    "Delivered": { text: "Delivered", fr: "Livrée", type: "success", category: "shipment" },
    "Cancelled": { text: "Cancelled", fr: "Annulée", type: "neutral", category: "shipment" },
  };
  const meta = statusMap[s.status] || statusMap["Pending Dispatch"];
  const updated: Date = s.updatedAt || s.createdAt || new Date();
  return {
    id: `shipment-${s._id}`,
    category: meta.category,
    title: `Shipment ${s.trackingNumber} ${meta.text}`,
    titleFr: `Expédition ${s.trackingNumber} ${meta.fr}`,
    detail: `${s.route?.origin || ""} to ${s.route?.destination || ""} — ${s.cargo?.equipment || ""}.`,
    detailFr: `${s.route?.origin || ""} vers ${s.route?.destination || ""} — ${s.cargo?.equipment || ""}.`,
    time: timeAgo(updated),
    timestamp: new Date(updated).toISOString(),
    actor: s.assignedCarrier || s.driverName || "Dispatch",
    statusText: meta.text,
    statusType: meta.type,
    actionLink: "/admin/shipments",
    referenceId: s.trackingNumber,
  };
}

function ticketToActivity(t: any): ActivityItem {
  const statusMap: Record<string, { text: string; fr: string; type: ActivityStatusType }> = {
    "Open": { text: "Awaiting Reply", fr: "En Attente de Réponse", type: "warning" },
    "In Progress": { text: "In Progress", fr: "En Cours", type: "info" },
    "Resolved": { text: "Resolved", fr: "Résolu", type: "success" },
  };
  const s = statusMap[t.status] || statusMap.Open;
  const updated: Date = t.updatedAt || t.createdAt || new Date();
  return {
    id: `ticket-${t._id}`,
    category: "ticket",
    title: `Ticket ${t.ticketId}: ${t.subject}`,
    titleFr: `Billet ${t.ticketId}: ${t.subject}`,
    detail: `${t.client?.name || "Client"}${t.client?.companyName ? ` (${t.client.companyName})` : ""} — ${t.category || "Support"}.`,
    detailFr: `${t.client?.name || "Client"}${t.client?.companyName ? ` (${t.client.companyName})` : ""} — ${t.category || "Soutien"}.`,
    time: timeAgo(updated),
    timestamp: new Date(updated).toISOString(),
    actor: t.client?.name || "Client",
    statusText: s.text,
    statusType: s.type,
    actionLink: "/admin/support",
    referenceId: t.ticketId,
  };
}

export async function GET() {
  try {
    await connectDB();

    const [
      newQuotesCount,
      activeShipmentsCount,
      customsHoldsCount,
      unreadInquiriesCount,
      openTicketsCount,
      recentQuotes,
      recentShipments,
      recentTickets,
    ] = await Promise.all([
      Quote.countDocuments({ status: "under_review" }),
      Shipment.countDocuments({ status: { $in: ACTIVE_SHIPMENT_STATUSES } }),
      Shipment.countDocuments({ $or: [{ status: "Customs Hold" }, { customsStatus: "Held" }] }),
      Inquiry.countDocuments({ unread: true }),
      SupportTicket.countDocuments({ status: { $in: ["Open", "In Progress"] } }),
      Quote.find().sort({ updatedAt: -1 }).limit(8).lean(),
      Shipment.find().sort({ updatedAt: -1 }).limit(8).lean(),
      SupportTicket.find().sort({ updatedAt: -1 }).limit(8).lean(),
    ]);

    const activities: ActivityItem[] = [
      ...recentQuotes.map(quoteToActivity),
      ...recentShipments.map(shipmentToActivity),
      ...recentTickets.map(ticketToActivity),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 8);

    return NextResponse.json({
      success: true,
      metrics: {
        newQuotesCount,
        activeShipmentsCount,
        customsHoldsCount,
        unreadInquiriesCount,
        openTicketsCount,
      },
      activities,
    });
  } catch (error: any) {
    console.error("Error fetching admin dashboard metrics:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch dashboard metrics" },
      { status: 500 }
    );
  }
}

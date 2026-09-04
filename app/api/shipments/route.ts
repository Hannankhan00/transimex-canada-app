import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Shipment from "@/models/Shipment";
import { getCurrentUser } from "@/lib/session";
import { formatDateLabel } from "@/lib/formatDate";

const STATUS_KEY: Record<string, string> = {
  "Pending Dispatch": "pending",
  "In Transit": "in_transit",
  "Customs Hold": "customs",
  "Out for Delivery": "out_for_delivery",
  Delivered: "delivered",
  Cancelled: "cancelled",
};

const STATUS_PROGRESS: Record<string, number> = {
  "Pending Dispatch": 10,
  "In Transit": 55,
  "Customs Hold": 35,
  "Out for Delivery": 85,
  Delivered: 100,
  Cancelled: 0,
};

function mapShipment(s: any) {
  const total = s.timeline?.length || 0;
  const completed = s.timeline?.filter((t: any) => t.completed).length || 0;
  const progress = total > 0 ? Math.round((completed / total) * 100) : STATUS_PROGRESS[s.status] ?? 0;

  return {
    id: s.trackingNumber,
    quoteId: s.quoteId || "",
    origin: s.route?.origin || "",
    destination: s.route?.destination || "",
    equipment: s.cargo?.equipment || "",
    driver: s.driverName ? `${s.driverName} (${s.unitNumber || "Unit"})` : s.assignedCarrier || "Dispatch Pending",
    status: STATUS_KEY[s.status] || "pending",
    statusLabel: s.status,
    date: formatDateLabel(s.createdAt),
    eta: s.status === "Delivered" ? "Delivered" : s.eta || "Pending",
    progress,
  };
}

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    await connectDB();
    const shipments = await Shipment.find({
      $or: [{ "client.userId": currentUser.userId }, { "client.email": currentUser.email }],
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      shipments: shipments.map(mapShipment),
    });
  } catch (error: any) {
    console.error("Error fetching client shipments:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch shipments" },
      { status: 500 }
    );
  }
}

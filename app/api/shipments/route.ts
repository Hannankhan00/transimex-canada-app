import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Shipment from "@/models/Shipment";
import { getCurrentUser } from "@/lib/session";
import { formatDateLabel } from "@/lib/formatDate";
import { toClientVesselView, ClientVesselView } from "@/lib/tracking/clientView";
import { computeVoyageProgress, VoyagePhase } from "@/lib/tracking/voyageProgress";

// Model defaults filled in at creation — placeholders, not a real assignment.
const DEFAULT_DRIVER_NAME = "Assigned Dispatch";

// Statuses an admin sets deliberately; the vessel's voyage never overrides them.
const VOYAGE_DRIVEN_STATUSES = ["Pending Dispatch", "In Transit"];

const PHASE_STATUS: Record<VoyagePhase, { key: string; en: string; fr: string }> = {
  AWAITING_DEPARTURE: { key: "pending", en: "Awaiting Departure", fr: "En attente de départ" },
  AT_SEA: { key: "in_transit", en: "At Sea", fr: "En mer" },
  AT_PORT: { key: "in_transit", en: "At Transshipment Port", fr: "Au port de transbordement" },
  ARRIVED: { key: "in_transit", en: "Arrived at Port", fr: "Arrivé au port" },
};

/** Status, progress and vessel line driven by the ocean voyage, for shipments that have one. */
function voyageSummary(vessel: ClientVesselView) {
  const progress = computeVoyageProgress(vessel.legs, vessel.events);
  const departure = progress.ports[0]?.moment?.dateTime;
  const arrival = vessel.arrival?.dateTime;

  // 0-10% before sailing, 10-90% across the voyage by date, 90% on arrival (final delivery still to come).
  let percent = 5;
  if (progress.phase === "ARRIVED") {
    percent = 90;
  } else if (progress.phase !== "AWAITING_DEPARTURE") {
    const legs = Math.max(progress.ports.length - 1, 1);
    let share = progress.phase === "AT_SEA" ? (progress.sailingLeg + 0.5) / legs : progress.lastReached / legs;
    if (departure && arrival) {
      const start = new Date(departure).getTime();
      const end = new Date(arrival).getTime();
      if (end > start) share = (Date.now() - start) / (end - start);
    }
    percent = 10 + 80 * Math.min(Math.max(share, 0), 1);
  }

  const v = progress.featuredVessel;
  return {
    phase: progress.phase,
    status: PHASE_STATUS[progress.phase],
    progress: Math.round(percent),
    vesselName: v?.vesselName || "",
    vesselDetail: [v?.imoNumber && `IMO ${v.imoNumber}`, v?.voyageNumber && `Voyage ${v.voyageNumber}`]
      .filter(Boolean)
      .join(" • "),
  };
}

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
  const vessel = toClientVesselView(s.carrierBooking);
  const voyage = vessel ? voyageSummary(vessel) : null;
  const voyageDrivesStatus = !!voyage && VOYAGE_DRIVEN_STATUSES.includes(s.status);

  const progress = voyageDrivesStatus
    ? voyage!.progress
    : total > 0
    ? Math.round((completed / total) * 100)
    : STATUS_PROGRESS[s.status] ?? 0;

  const hasDriver = !!s.driverName && s.driverName !== DEFAULT_DRIVER_NAME;
  // While the cargo is on the water, the vessel is what the client wants to see — not a truck.
  const showVessel = !!voyage?.vesselName && voyage.phase !== "ARRIVED" && voyageDrivesStatus;

  return {
    id: s.trackingNumber,
    quoteId: s.quoteId || "",
    origin: s.route?.origin || "",
    destination: s.route?.destination || "",
    equipment: s.cargo?.equipment || "",
    driver: showVessel
      ? voyage!.vesselName
      : hasDriver
      ? `${s.driverName} (${s.unitNumber || "Unit"})`
      : s.carrierId && s.assignedCarrier
      ? s.assignedCarrier
      : "Dispatch pending",
    driverDetail: showVessel ? voyage!.vesselDetail : "",
    isVessel: showVessel,
    vehicleType: showVessel ? "" : s.vehicleType || "",
    plateNumber: showVessel ? "" : s.plateNumber || "",
    status: voyageDrivesStatus ? voyage!.status.key : STATUS_KEY[s.status] || "pending",
    statusLabel: voyageDrivesStatus ? voyage!.status.en : s.status,
    statusLabelFr: voyageDrivesStatus ? voyage!.status.fr : "",
    date: formatDateLabel(s.createdAt),
    // The vessel's arrival date, when the ocean booking reports one, beats the manual ETA text.
    eta:
      s.status === "Delivered"
        ? "Delivered"
        : vessel?.arrival
        ? formatDateLabel(vessel.arrival.dateTime)
        : s.eta || "Pending",
    progress,
    customsStatus: s.customsStatus || "Pending",
    portOfEntry: s.portOfEntry || "",
    cbsaPars: s.cbsaPars || "",
    containers: (s.containers || []).map((c: any) => c.containerNumber),
    // Vessel, route and arrival from the tracked booking — never the carrier or its reference.
    vessel,
    duties: s.duties
      ? {
          amountCad: s.duties.amountCad || "",
          taxGstHst: s.duties.taxGstHst || "",
          brokerageFeeCad: s.duties.brokerageFeeCad || s.duties.brokerageFee || "",
          totalOwed: s.duties.totalOwed || "",
          status: s.duties.status || "Unassessed",
          dispatchedAt: s.duties.dispatchedAt || "",
        }
      : undefined,
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

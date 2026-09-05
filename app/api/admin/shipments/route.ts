import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Shipment, { ShipmentStatus } from "@/models/Shipment";

const ACTIVE_ROAD_STATUSES: ShipmentStatus[] = ["In Transit", "Out for Delivery"];
const NON_TERMINAL_STATUSES: ShipmentStatus[] = [
  "Pending Dispatch",
  "In Transit",
  "Customs Hold",
  "Out for Delivery",
];

function mapUiStatus(status: string): "in_transit" | "customs" | "delivered" | "pending" | "cancelled" {
  if (status === "Customs Hold") return "customs";
  if (status === "In Transit" || status === "Out for Delivery") return "in_transit";
  if (status === "Delivered") return "delivered";
  if (status === "Cancelled") return "cancelled";
  return "pending";
}

function formatDate(date?: Date | string) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

export async function GET(req: Request) {
  try {
    await connectDB();

    const dbShipments = await Shipment.find().sort({ createdAt: -1 }).lean();

    const shipments = dbShipments.map((s: any) => ({
      id: s.trackingNumber || s._id.toString(),
      quoteId: s.quoteId || "",
      origin: s.route?.origin || "",
      destination: s.route?.destination || "",
      equipment: s.cargo?.equipment || "",
      driver: s.driverName || "",
      carrier: s.assignedCarrier || "",
      status: mapUiStatus(s.status),
      rawStatus: s.status,
      customsStatus: s.customsStatus || "Pending",
      customsPars: s.cbsaPars || "",
      broker: s.customsBroker || "",
      eta: s.eta || "",
      date: formatDate(s.createdAt),
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));

    const now = new Date();
    const activeInTransit = dbShipments.filter((s: any) =>
      ACTIVE_ROAD_STATUSES.includes(s.status)
    ).length;
    const customsHolds = dbShipments.filter(
      (s: any) => s.status === "Customs Hold" || s.customsStatus === "Held"
    ).length;
    const completedThisMonth = dbShipments.filter((s: any) => {
      if (s.status !== "Delivered") return false;
      const updated = s.updatedAt ? new Date(s.updatedAt) : null;
      return (
        !!updated &&
        updated.getFullYear() === now.getFullYear() &&
        updated.getMonth() === now.getMonth()
      );
    }).length;
    const activeCount = dbShipments.filter((s: any) =>
      NON_TERMINAL_STATUSES.includes(s.status)
    ).length;

    return NextResponse.json({
      success: true,
      shipments,
      counts: {
        total: dbShipments.length,
        activeInTransit,
        customsHolds,
        completedThisMonth,
        active: activeCount,
      },
    });
  } catch (error: any) {
    console.error("Error fetching admin shipments:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch shipments" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();

    const {
      quoteId,
      clientName,
      clientCompany,
      clientEmail,
      clientPhone,
      origin,
      originDetail,
      destination,
      destinationDetail,
      transportMode,
      equipment,
      weight,
      palletCount,
      commodity,
      dimensions,
      cargoType,
      rateCad,
      assignedCarrier,
      driverName,
      unitNumber,
      eta,
    } = body || {};

    const missing: string[] = [];
    if (!clientName) missing.push("clientName");
    if (!clientCompany) missing.push("clientCompany");
    if (!clientEmail) missing.push("clientEmail");
    if (!origin) missing.push("origin");
    if (!destination) missing.push("destination");
    if (!transportMode) missing.push("transportMode");
    if (!equipment) missing.push("equipment");
    if (!weight) missing.push("weight");
    if (!commodity) missing.push("commodity");
    if (!rateCad) missing.push("rateCad");

    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required shipment fields: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    const year = new Date().getFullYear();
    const existingCount = await Shipment.countDocuments();

    const buildShipmentDoc = (sequence: number) => ({
      trackingNumber: `TMX-${year}-${String(sequence).padStart(5, "0")}`,
      quoteId: quoteId || "",
      client: {
        name: clientName,
        companyName: clientCompany,
        email: clientEmail,
        phone: clientPhone || "",
      },
      route: {
        origin,
        originDetail: originDetail || origin,
        destination,
        destinationDetail: destinationDetail || destination,
      },
      cargo: {
        transportMode,
        equipment,
        weight,
        palletCount: palletCount || 0,
        commodity,
        dimensions: dimensions || "",
        cargoType: cargoType || "General Freight",
      },
      status: "Pending Dispatch" as ShipmentStatus,
      rateCad,
      ...(assignedCarrier ? { assignedCarrier } : {}),
      ...(driverName ? { driverName } : {}),
      ...(unitNumber ? { unitNumber } : {}),
      ...(eta ? { eta } : {}),
      timeline: [
        {
          title: "Shipment Created",
          location: origin,
          timestamp: new Date().toISOString(),
          statusText: "Pending Dispatch",
          completed: true,
        },
      ],
    });

    let shipment;
    try {
      shipment = await Shipment.create(buildShipmentDoc(existingCount + 1));
    } catch (err: any) {
      // Tracking number collision fallback (e.g. concurrent creation)
      if (err?.code === 11000) {
        shipment = await Shipment.create(
          buildShipmentDoc(existingCount + 1 + Math.floor(Math.random() * 10000))
        );
      } else {
        throw err;
      }
    }

    return NextResponse.json({ success: true, shipment }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating shipment:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create shipment" },
      { status: 500 }
    );
  }
}

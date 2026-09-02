import { NextRequest } from "next/server";
import connectDB from "@/lib/mongoose";
import Shipment from "@/models/Shipment";
import { getStoredShipments } from "@/lib/mockData";
import { serializeToCsv, createCsvDownloadResponse } from "@/lib/csvExport";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode");
    const status = searchParams.get("status");

    let shipments = getStoredShipments();

    try {
      await connectDB();
      const dbShipments = await Shipment.find().lean();
      if (dbShipments && dbShipments.length > 0) {
        shipments = dbShipments as any;
      }
    } catch (dbErr) {
      console.warn("[Export Shipments] DB read fallback:", dbErr);
    }

    if (mode && mode !== "all") {
      shipments = shipments.filter(
        (s: any) => (s.mode || s.transportMode || "").toLowerCase() === mode.toLowerCase()
      );
    }

    if (status && status !== "all") {
      shipments = shipments.filter(
        (s: any) =>
          (s.status || s.currentStatus || "").toLowerCase() === status.toLowerCase()
      );
    }

    // Map into flat data objects
    const flatData = shipments.map((s: any) => {
      const clientName = typeof s.client === "object" ? s.client?.name || s.client?.companyName : s.client || "Enterprise Shipper";
      const clientEmail = typeof s.client === "object" ? s.client?.email : "dispatch@client.ca";
      const origin = typeof s.origin === "object" ? `${s.origin.city || ""}, ${s.origin.province || s.origin.state || ""}` : s.origin || "Montreal, QC";
      const destination = typeof s.destination === "object" ? `${s.destination.city || ""}, ${s.destination.province || s.destination.state || ""}` : s.destination || "Chicago, IL";

      return {
        trackingId: s.trackingId || s.id,
        client: clientName,
        email: clientEmail,
        mode: s.mode || s.transportMode || "Road Freight",
        equipment: s.equipmentType || "53' Dry Van",
        origin,
        destination,
        carrier: s.carrier || s.assignedCarrier || "Transimex Fleet Division",
        status: s.status || s.currentStatus || "In Transit",
        customsStatus: s.customsStatus || "Released",
        portOfEntry: s.portOfEntry || "Lacolle / Champlain (0308)",
        tariffRateCad: s.tariffRate || s.rate || 4850,
        dispatchedDate: s.dispatchedAt || s.createdAt || "2026-08-28",
        etaDelivery: s.eta || s.estimatedDelivery || "2026-09-03",
      };
    });

    const headers = [
      { key: "trackingId", label: "Tracking ID" },
      { key: "client", label: "Client Enterprise" },
      { key: "email", label: "Client Email" },
      { key: "mode", label: "Transport Mode" },
      { key: "equipment", label: "Equipment Type" },
      { key: "origin", label: "Origin Location" },
      { key: "destination", label: "Destination Location" },
      { key: "carrier", label: "Assigned Carrier" },
      { key: "status", label: "Shipment Status" },
      { key: "customsStatus", label: "CBSA Customs Status" },
      { key: "portOfEntry", label: "Port of Entry" },
      { key: "tariffRateCad", label: "Linehaul Rate (CAD)" },
      { key: "dispatchedDate", label: "Dispatched Date" },
      { key: "etaDelivery", label: "ETA / Delivery Date" },
    ];

    const csvContent = serializeToCsv(flatData, headers);
    const filename = `transimex_shipments_report_${new Date().toISOString().slice(0, 10)}.csv`;

    return createCsvDownloadResponse(csvContent, filename);
  } catch (error: any) {
    console.error("Error exporting shipments CSV:", error);
    return new Response(`Error generating CSV export: ${error.message}`, { status: 500 });
  }
}

import { NextRequest } from "next/server";
import connectDB from "@/lib/mongoose";
import Shipment from "@/models/Shipment";
import { serializeToCsv, createCsvDownloadResponse } from "@/lib/csvExport";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode");
    const status = searchParams.get("status");

    await connectDB();
    let shipments = await Shipment.find().sort({ createdAt: -1 }).lean();

    if (mode && mode !== "all") {
      shipments = shipments.filter(
        (s: any) => (s.cargo?.transportMode || "").toLowerCase() === mode.toLowerCase()
      );
    }

    if (status && status !== "all") {
      shipments = shipments.filter(
        (s: any) => (s.status || "").toLowerCase() === status.toLowerCase()
      );
    }

    const flatData = shipments.map((s: any) => ({
      trackingId: s.trackingNumber,
      client: s.client?.name || "",
      companyName: s.client?.companyName || "",
      email: s.client?.email || "",
      mode: s.cargo?.transportMode || "",
      equipment: s.cargo?.equipment || "",
      origin: s.route?.origin || "",
      destination: s.route?.destination || "",
      carrier: s.assignedCarrier || "",
      status: s.status || "",
      customsStatus: s.customsStatus || "",
      portOfEntry: s.portOfEntry || "",
      rateCad: s.rateCad || "",
      dispatchedDate: s.createdAt ? new Date(s.createdAt).toISOString().slice(0, 10) : "",
      etaDelivery: s.eta || "",
    }));

    const headers = [
      { key: "trackingId", label: "Tracking ID" },
      { key: "client", label: "Client Contact" },
      { key: "companyName", label: "Client Enterprise" },
      { key: "email", label: "Client Email" },
      { key: "mode", label: "Transport Mode" },
      { key: "equipment", label: "Equipment Type" },
      { key: "origin", label: "Origin Location" },
      { key: "destination", label: "Destination Location" },
      { key: "carrier", label: "Assigned Carrier" },
      { key: "status", label: "Shipment Status" },
      { key: "customsStatus", label: "CBSA Customs Status" },
      { key: "portOfEntry", label: "Port of Entry" },
      { key: "rateCad", label: "Linehaul Rate (CAD)" },
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

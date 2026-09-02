import { NextRequest } from "next/server";
import connectDB from "@/lib/mongoose";
import Shipment from "@/models/Shipment";
import { getStoredShipments } from "@/lib/mockData";
import { serializeToCsv, createCsvDownloadResponse } from "@/lib/csvExport";

export async function GET(req: NextRequest) {
  try {
    let shipments = getStoredShipments();

    try {
      await connectDB();
      const dbShipments = await Shipment.find().lean();
      if (dbShipments && dbShipments.length > 0) {
        shipments = dbShipments as any;
      }
    } catch (dbErr) {
      console.warn("[Export Revenue] DB read fallback:", dbErr);
    }

    const flatData = shipments.map((s: any) => {
      const linehaul = typeof s.tariffRate === "number" ? s.tariffRate : typeof s.rate === "number" ? s.rate : 4850;
      const duties = s.duties ? s.duties.customsDutiesCad || 420 : 380;
      const taxes = s.duties ? s.duties.taxesCad || 210 : 190;
      const brokerage = s.duties ? s.duties.brokerageFeeCad || 150 : 150;
      const totalFreightCharges = linehaul + duties + taxes + brokerage;

      const clientName = typeof s.client === "object" ? s.client?.companyName || s.client?.name : s.client || "Laurentian Global Logistics";

      return {
        manifestTrackingId: s.trackingId || s.id,
        clientCompany: clientName,
        mode: s.mode || s.transportMode || "Road Freight",
        linehaulCad: linehaul,
        customsDutiesCad: duties,
        federalTaxesCad: taxes,
        brokerageFeeCad: brokerage,
        totalInvoicedCad: totalFreightCharges,
        currency: "CAD",
        paymentStatus: s.customsStatus === "Released" ? "Settled" : "Pending Clearance",
        invoiceDate: s.dispatchedAt || s.createdAt || "2026-08-28",
      };
    });

    const headers = [
      { key: "manifestTrackingId", label: "Manifest Tracking Ref" },
      { key: "clientCompany", label: "Billed Corporate Client" },
      { key: "mode", label: "Transport Mode" },
      { key: "linehaulCad", label: "Linehaul Freight (CAD)" },
      { key: "customsDutiesCad", label: "CBSA Customs Duties (CAD)" },
      { key: "federalTaxesCad", label: "Taxes GST/HST (CAD)" },
      { key: "brokerageFeeCad", label: "Brokerage Filing Fee (CAD)" },
      { key: "totalInvoicedCad", label: "Total Invoiced Amount (CAD)" },
      { key: "currency", label: "Currency" },
      { key: "paymentStatus", label: "Settlement Status" },
      { key: "invoiceDate", label: "Billing Date" },
    ];

    const csvContent = serializeToCsv(flatData, headers);
    const filename = `transimex_financial_revenue_audit_${new Date().toISOString().slice(0, 10)}.csv`;

    return createCsvDownloadResponse(csvContent, filename);
  } catch (error: any) {
    console.error("Error exporting financial revenue CSV:", error);
    return new Response(`Error generating financial revenue export: ${error.message}`, { status: 500 });
  }
}

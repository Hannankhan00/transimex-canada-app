import { NextRequest } from "next/server";
import connectDB from "@/lib/mongoose";
import Shipment from "@/models/Shipment";
import { serializeToCsv, createCsvDownloadResponse } from "@/lib/csvExport";

/** Parses a currency string like "$4,850.00 CAD" into a plain number. Returns 0 if unparseable. */
function parseCadAmount(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return 0;
  const parsed = parseFloat(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const shipments = await Shipment.find().lean();

    const flatData = shipments.map((s: any) => {
      const linehaul = parseCadAmount(s.rateCad);
      const duties = parseCadAmount(s.duties?.amountCad);
      const taxes = parseCadAmount(s.duties?.taxGstHst);
      const brokerage = parseCadAmount(s.duties?.brokerageFeeCad);
      const totalFreightCharges = linehaul + duties + taxes + brokerage;

      const clientName = s.client?.companyName || s.client?.name || "";

      return {
        manifestTrackingId: s.trackingNumber || "",
        clientCompany: clientName,
        mode: s.cargo?.transportMode || "",
        linehaulCad: linehaul,
        customsDutiesCad: duties,
        federalTaxesCad: taxes,
        brokerageFeeCad: brokerage,
        totalInvoicedCad: totalFreightCharges,
        currency: "CAD",
        paymentStatus: s.customsStatus === "Released" ? "Settled" : "Pending Clearance",
        invoiceDate: s.duties?.dispatchedAt || s.createdAt || "",
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

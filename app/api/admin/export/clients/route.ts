import { NextRequest } from "next/server";
import { getStoredClients } from "@/lib/mockData";
import { serializeToCsv, createCsvDownloadResponse } from "@/lib/csvExport";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    let clients = getStoredClients();

    if (status && status !== "all") {
      clients = clients.filter(
        (c) => c.status.toLowerCase() === status.toLowerCase()
      );
    }

    const flatData = clients.map((c) => ({
      clientId: c.id,
      companyName: c.companyName,
      primaryContact: c.primaryContact,
      email: c.email,
      phone: c.phone,
      industry: c.industry,
      status: c.status,
      totalShipments: c.totalShipmentsCompleted || 0,
      totalSpendCad: c.lifetimeRevenueCad || "$0.00 CAD",
      registeredDate: c.registeredDate,
      paymentTerms: c.paymentTerms || "Net 30 Days",
      taxNumber: c.taxId || "CA-GST-99214481",
    }));

    const headers = [
      { key: "clientId", label: "Client Account ID" },
      { key: "companyName", label: "Enterprise Company Name" },
      { key: "primaryContact", label: "Primary Contact" },
      { key: "email", label: "Contact Email" },
      { key: "phone", label: "Phone" },
      { key: "industry", label: "Industry Sector" },
      { key: "status", label: "Account Access Status" },
      { key: "totalShipments", label: "Lifetime Completed Loads" },
      { key: "totalSpendCad", label: "Total Lifetime Spend (CAD)" },
      { key: "paymentTerms", label: "Payment Terms" },
      { key: "taxNumber", label: "Federal Tax / GST #" },
      { key: "registeredDate", label: "Onboarding Date" },
    ];

    const csvContent = serializeToCsv(flatData, headers);
    const filename = `transimex_clients_directory_${new Date().toISOString().slice(0, 10)}.csv`;

    return createCsvDownloadResponse(csvContent, filename);
  } catch (error: any) {
    console.error("Error exporting clients CSV:", error);
    return new Response(`Error generating clients export: ${error.message}`, { status: 500 });
  }
}

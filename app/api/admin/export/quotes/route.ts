import { NextRequest } from "next/server";
import connectDB from "@/lib/mongoose";
import Quote from "@/models/Quote";
import { serializeToCsv, createCsvDownloadResponse } from "@/lib/csvExport";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    await connectDB();
    let quotes = await Quote.find().sort({ createdAt: -1 }).lean();

    if (status && status !== "all") {
      quotes = quotes.filter((q: any) => (q.status || "").toLowerCase() === status.toLowerCase());
    }

    const flatData = quotes.map((q: any) => ({
      quoteId: q.refNumber || q._id.toString(),
      clientName: q.client?.name || "",
      companyName: q.client?.companyName || "",
      email: q.client?.email || "",
      mode: q.cargo?.transportMode || "",
      equipment: q.cargo?.equipment || "",
      origin: q.route?.origin || "",
      destination: q.route?.destination || "",
      weight: q.cargo?.weight || "",
      pallets: q.cargo?.palletCount || 0,
      linehaulRateCad: q.breakdown?.lineHaul || "",
      fuelSurchargeCad: q.breakdown?.fuelSurcharge || "",
      crossBorderFeeCad: q.breakdown?.crossBorderFee || "",
      totalRateCad: q.breakdown?.total || q.priceCad || "",
      status: q.status || "",
      submittedDate: q.submittedDate || (q.createdAt ? new Date(q.createdAt).toISOString().slice(0, 10) : ""),
    }));

    const headers = [
      { key: "quoteId", label: "Quote Reference" },
      { key: "clientName", label: "Client Contact" },
      { key: "companyName", label: "Corporate Entity" },
      { key: "email", label: "Email Address" },
      { key: "mode", label: "Transport Mode" },
      { key: "equipment", label: "Equipment Required" },
      { key: "origin", label: "Origin Location" },
      { key: "destination", label: "Destination Location" },
      { key: "weight", label: "Weight" },
      { key: "pallets", label: "Pallets Count" },
      { key: "linehaulRateCad", label: "Linehaul Rate (CAD)" },
      { key: "fuelSurchargeCad", label: "Fuel Surcharge (CAD)" },
      { key: "crossBorderFeeCad", label: "Cross-Border Fee (CAD)" },
      { key: "totalRateCad", label: "Total Quoted Freight (CAD)" },
      { key: "status", label: "Pipeline Status" },
      { key: "submittedDate", label: "Submission Date" },
    ];

    const csvContent = serializeToCsv(flatData, headers);
    const filename = `transimex_quotes_pipeline_${new Date().toISOString().slice(0, 10)}.csv`;

    return createCsvDownloadResponse(csvContent, filename);
  } catch (error: any) {
    console.error("Error exporting quotes CSV:", error);
    return new Response(`Error generating quotes export: ${error.message}`, { status: 500 });
  }
}

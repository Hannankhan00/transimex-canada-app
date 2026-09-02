import { NextRequest } from "next/server";
import connectDB from "@/lib/mongoose";
import Quote from "@/models/Quote";
import { getStoredQuotes } from "@/lib/mockData";
import { serializeToCsv, createCsvDownloadResponse } from "@/lib/csvExport";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    let quotes = getStoredQuotes();

    try {
      await connectDB();
      const dbQuotes = await Quote.find().lean();
      if (dbQuotes && dbQuotes.length > 0) {
        quotes = dbQuotes as any;
      }
    } catch (dbErr) {
      console.warn("[Export Quotes] DB read fallback:", dbErr);
    }

    if (status && status !== "all") {
      quotes = quotes.filter(
        (q: any) => (q.status || "").toLowerCase() === status.toLowerCase()
      );
    }

    const flatData = quotes.map((q: any) => {
      const origin = typeof q.origin === "object" ? `${q.origin.city || ""}, ${q.origin.province || ""}` : q.origin || "Montreal, QC";
      const destination = typeof q.destination === "object" ? `${q.destination.city || ""}, ${q.destination.province || ""}` : q.destination || "Detroit, MI";
      const rateCalc = q.rateCalculation || {};

      return {
        quoteId: q.quoteId || q.id,
        clientName: q.clientName || q.name || "Freight Shipper",
        companyName: q.companyName || q.company || "Enterprise Corp",
        email: q.email || "shipper@client.com",
        mode: q.mode || q.transportMode || "Road",
        equipment: q.equipmentType || "53' Dry Van",
        origin,
        destination,
        weightKg: q.weightKg || q.weight || 18500,
        pallets: q.pallets || 26,
        linehaulRateCad: rateCalc.linehaulCad || q.rate || 3200,
        fuelSurchargeCad: rateCalc.fuelCad || 480,
        crossBorderFeeCad: rateCalc.crossBorderCad || 150,
        totalRateCad: rateCalc.totalCad || q.totalRate || 3830,
        status: q.status || "New",
        submittedDate: q.createdAt ? new Date(q.createdAt).toISOString().slice(0, 10) : "2026-08-30",
      };
    });

    const headers = [
      { key: "quoteId", label: "Quote Reference" },
      { key: "clientName", label: "Client Contact" },
      { key: "companyName", label: "Corporate Entity" },
      { key: "email", label: "Email Address" },
      { key: "mode", label: "Transport Mode" },
      { key: "equipment", label: "Equipment Required" },
      { key: "origin", label: "Origin Location" },
      { key: "destination", label: "Destination Location" },
      { key: "weightKg", label: "Weight (KG)" },
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

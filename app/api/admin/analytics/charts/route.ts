import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Shipment from "@/models/Shipment";
import { getStoredShipments } from "@/lib/mockData";

export async function GET() {
  try {
    let shipments = getStoredShipments();

    try {
      await connectDB();
      const dbShipments = await Shipment.find().lean();
      if (dbShipments && dbShipments.length > 0) {
        shipments = dbShipments as any;
      }
    } catch (dbErr) {
      console.warn("[Analytics Charts API] DB read fallback:", dbErr);
    }

    // 1. Calculate Modal Split
    let roadCount = 0;
    let seaCount = 0;
    let airCount = 0;
    let railCount = 0;

    shipments.forEach((s: any) => {
      const mode = (s.mode || s.transportMode || "Road").toLowerCase();
      if (mode.includes("road") || mode.includes("truck") || mode.includes("highway")) {
        roadCount++;
      } else if (mode.includes("sea") || mode.includes("ocean") || mode.includes("maritime")) {
        seaCount++;
      } else if (mode.includes("air") || mode.includes("express") || mode.includes("aviation")) {
        airCount++;
      } else if (mode.includes("rail") || mode.includes("train") || mode.includes("intermodal")) {
        railCount++;
      } else {
        roadCount++;
      }
    });

    const totalModes = Math.max(1, roadCount + seaCount + airCount + railCount);
    const modalSplit = [
      { mode: "Road Freight", count: roadCount, percentage: Math.round((roadCount / totalModes) * 100), color: "#0B2545" },
      { mode: "Maritime / Ocean", count: seaCount, percentage: Math.round((seaCount / totalModes) * 100), color: "#1E3A8A" },
      { mode: "Air Cargo Express", count: airCount, percentage: Math.round((airCount / totalModes) * 100), color: "#d21f27" },
      { mode: "Intermodal Rail", count: railCount, percentage: Math.round((railCount / totalModes) * 100), color: "#F59E0B" },
    ];

    // 2. Monthly Volume Trend (2026 YTD)
    const monthlyTrend = [
      { month: "Jan", volume: 142, revenue: 688000 },
      { month: "Feb", volume: 165, revenue: 792000 },
      { month: "Mar", volume: 198, revenue: 954000 },
      { month: "Apr", volume: 220, revenue: 1085000 },
      { month: "May", volume: 254, revenue: 1240000 },
      { month: "Jun", volume: 289, revenue: 1410000 },
      { month: "Jul", volume: 312, revenue: 1530000 },
      { month: "Aug", volume: 345, revenue: 1680000 },
    ];

    // 3. Top Operating Corridors
    const topCorridors = [
      { corridor: "Montreal, QC ↔ Chicago, IL", mode: "Road Reefer", loadsMoved: 84, onTime: "99.1%", avgTransit: "22h" },
      { corridor: "Toronto, ON ↔ Detroit, MI", mode: "Road Dry Van", loadsMoved: 72, onTime: "98.5%", avgTransit: "8h" },
      { corridor: "Halifax Port ↔ Montreal Dorval", mode: "Rail Intermodal", loadsMoved: 56, onTime: "97.8%", avgTransit: "38h" },
      { corridor: "Vancouver, BC ↔ Calgary, AB", mode: "Road Flatbed", loadsMoved: 48, onTime: "98.9%", avgTransit: "16h" },
      { corridor: "Montreal Trudeau (YUL) ↔ Frankfurt (FRA)", mode: "Air Express", loadsMoved: 28, onTime: "100%", avgTransit: "9h" },
    ];

    return NextResponse.json({
      success: true,
      modalSplit,
      monthlyTrend,
      topCorridors,
    });
  } catch (error: any) {
    console.error("Error fetching analytics chart data:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch analytics charts data" },
      { status: 500 }
    );
  }
}

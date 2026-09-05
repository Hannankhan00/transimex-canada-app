import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Shipment from "@/models/Shipment";

/** Parses a currency string like "$4,850.00 CAD" into a plain number. Returns 0 if unparseable. */
function parseCadAmount(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return 0;
  const parsed = parseFloat(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function GET() {
  try {
    await connectDB();

    const shipments = await Shipment.find().lean();

    // 1. Calculate Modal Split
    let roadCount = 0;
    let seaCount = 0;
    let airCount = 0;
    let railCount = 0;

    shipments.forEach((s: any) => {
      const mode = (s.cargo?.transportMode || "Road").toLowerCase();
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

    // 2. Monthly Volume & Revenue Trend — real aggregation over Shipment.createdAt
    const monthlyBuckets = new Map<string, { volume: number; revenue: number }>();
    shipments.forEach((s: any) => {
      if (!s.createdAt) return;
      const date = new Date(s.createdAt);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const bucket = monthlyBuckets.get(key) || { volume: 0, revenue: 0 };
      bucket.volume += 1;
      bucket.revenue += parseCadAmount(s.rateCad);
      monthlyBuckets.set(key, bucket);
    });

    const monthlyTrend = Array.from(monthlyBuckets.entries())
      .sort(([a], [b]) => {
        const [ay, am] = a.split("-").map(Number);
        const [by, bm] = b.split("-").map(Number);
        return ay - by || am - bm;
      })
      .map(([key, bucket]) => {
        const [, monthIndex] = key.split("-").map(Number);
        return { month: MONTH_LABELS[monthIndex], volume: bucket.volume, revenue: bucket.revenue };
      });

    // 3. Top Operating Corridors — real aggregation grouped by origin/destination pair
    const corridorBuckets = new Map<string, { corridor: string; mode: string; loadsMoved: number }>();
    shipments.forEach((s: any) => {
      const origin = s.route?.origin || "";
      const destination = s.route?.destination || "";
      if (!origin && !destination) return;
      const key = `${origin} -> ${destination}`;
      const bucket = corridorBuckets.get(key) || {
        corridor: `${origin} ↔ ${destination}`,
        mode: s.cargo?.transportMode || "",
        loadsMoved: 0,
      };
      bucket.loadsMoved += 1;
      corridorBuckets.set(key, bucket);
    });

    const topCorridors = Array.from(corridorBuckets.values())
      .sort((a, b) => b.loadsMoved - a.loadsMoved)
      .slice(0, 5);

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

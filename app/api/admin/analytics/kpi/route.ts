import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Shipment from "@/models/Shipment";
import Quote from "@/models/Quote";

/** Parses a currency string like "$4,850.00 CAD" into a plain number. Returns 0 if unparseable. */
function parseCadAmount(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return 0;
  const parsed = parseFloat(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function GET() {
  try {
    await connectDB();

    const shipments = await Shipment.find().lean();
    const quotes = await Quote.find().lean();

    const totalShipments = shipments.length;

    // Month-to-date vs. prior full calendar month, computed from real createdAt timestamps.
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const mtdShipments = shipments.filter(
      (s: any) => s.createdAt && new Date(s.createdAt) >= startOfThisMonth
    ).length;
    const lastMonthShipments = shipments.filter(
      (s: any) =>
        s.createdAt &&
        new Date(s.createdAt) >= startOfLastMonth &&
        new Date(s.createdAt) < startOfThisMonth
    ).length;

    const volumeGrowth =
      lastMonthShipments > 0
        ? Math.round(((mtdShipments - lastMonthShipments) / lastMonthShipments) * 100)
        : mtdShipments > 0
        ? 100
        : 0;

    // Quote conversion rate
    const acceptedQuotes = quotes.filter((q: any) => q.status === "accepted").length;
    const totalQuotesCount = quotes.length;
    const conversionRate = totalQuotesCount > 0 ? Math.round((acceptedQuotes / totalQuotesCount) * 100) : 0;

    // On-Time Delivery Rate — the Shipment model has no delivery/ETA timestamp fields to
    // compute a real on-time percentage from, so we report null (frontend renders "N/A")
    // rather than a fabricated benchmark constant.
    const deliveredShipments = shipments.filter((s: any) => s.status === "Delivered");
    const onTimeRate: number | null = null;

    // Active Customs Holds
    const customsHolds = shipments.filter((s: any) => s.customsStatus === "Held" || s.status === "Customs Hold").length;
    const inReviewCustoms = shipments.filter((s: any) => s.customsStatus === "In Review").length;

    // Revenue calculation from real shipment rate fields
    const totalLinehaulRevenue = shipments.reduce((sum: number, s: any) => sum + parseCadAmount(s.rateCad), 0);

    return NextResponse.json({
      success: true,
      kpis: {
        totalFreightVolume: {
          value: totalShipments,
          mtd: mtdShipments,
          lastMonth: lastMonthShipments,
          growthPercent: volumeGrowth >= 0 ? `+${volumeGrowth}%` : `${volumeGrowth}%`,
        },
        quoteConversionRate: {
          value: `${conversionRate}%`,
          accepted: acceptedQuotes,
          total: totalQuotesCount,
          benchmark: "Industry Avg: 42%",
        },
        onTimeDeliveryRate: {
          value: onTimeRate === null ? null : `${onTimeRate}%`,
          status: onTimeRate === null ? "No Delivery Telemetry" : "Optimal SLA",
          completedLoads: deliveredShipments.length,
        },
        activeCustomsHolds: {
          value: customsHolds,
          severity: customsHolds > 2 ? "High Attention" : "Normal Clearance",
          inReview: inReviewCustoms,
        },
        totalRevenue: {
          value: totalLinehaulRevenue,
          formatted: `$${totalLinehaulRevenue.toLocaleString()} CAD`,
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching analytics KPI:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch analytics KPIs" },
      { status: 500 }
    );
  }
}

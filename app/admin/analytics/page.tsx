"use client";

import React, { useState, useEffect, useCallback } from "react";
import AnalyticsKpiCards from "@/components/admin/analytics/AnalyticsKpiCards";
import ModalSplitChart from "@/components/admin/analytics/ModalSplitChart";
import VolumeTrendChart from "@/components/admin/analytics/VolumeTrendChart";
import RevenueTrendChart from "@/components/admin/analytics/RevenueTrendChart";
import CsvExportSuite from "@/components/admin/analytics/CsvExportSuite";
import {
  BarChart3,
  RefreshCw,
  TrendingUp,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  FileSpreadsheet,
} from "lucide-react";

export default function AdminAnalyticsPage() {
  const [kpis, setKpis] = useState<any>({});
  const [chartData, setChartData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalyticsData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [kpiRes, chartsRes] = await Promise.all([
        fetch("/api/admin/analytics/kpi"),
        fetch("/api/admin/analytics/charts"),
      ]);

      const [kpiJson, chartsJson] = await Promise.all([
        kpiRes.json(),
        chartsRes.json(),
      ]);

      if (kpiJson.kpis) setKpis(kpiJson.kpis);
      if (chartsJson) setChartData(chartsJson);
    } catch (err) {
      console.error("Error fetching analytics:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  const topCorridors: any[] = chartData.topCorridors && chartData.topCorridors.length > 0 ? chartData.topCorridors : [];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#d21f27]">
              Operations Intelligence &amp; Telemetry
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-mono font-bold">
              BUSINESS ANALYTICS
            </span>
          </div>
          <h1
            className="text-3xl sm:text-4xl font-bold text-[#0B2545] tracking-tight leading-tight mt-1"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Logistics KPI &amp; Financial Reporting
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl">
            Live operations dashboard tracking freight velocity, quote conversion yields, customs clearance velocity, and raw CSV data exports.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchAnalyticsData}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs transition cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh Analytics</span>
          </button>
        </div>
      </div>

      {/* 2. TOP-LEVEL KPI CARDS */}
      <AnalyticsKpiCards kpis={kpis} />

      {/* 3. CHARTS ROW 1: MODAL SPLIT & MONTHLY VOLUME TREND */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ModalSplitChart data={chartData.modalSplit} />
        <VolumeTrendChart data={chartData.monthlyTrend} />
      </div>

      {/* 4. REVENUE TRAJECTORY CHART */}
      <RevenueTrendChart data={chartData.monthlyTrend} />

      {/* 5. TOP OPERATING CORRIDORS & LANES PERFORMANCE */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-[#0B2545] text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#d21f27]" />
              <span>High-Density Transport Corridors &amp; Velocity Benchmarks</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Consolidated volume, on-time SLA metrics, and transit timelines across primary lanes.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4">Freight Corridor</th>
                <th className="py-3.5 px-4">Primary Mode / Equipment</th>
                <th className="py-3.5 px-4">Dispatched Loads</th>
                <th className="py-3.5 px-4 text-right">Regulatory Border Crossing</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700">
              {topCorridors.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">
                    No dispatched shipments yet to compute corridor performance.
                  </td>
                </tr>
              ) : (
                topCorridors.map((c: any) => (
                  <tr key={c.corridor} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-bold text-[#0B2545]">
                      {c.corridor}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold text-slate-700 text-[11px] border border-slate-200">
                        {c.mode}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                      {c.loadsMoved} Loads
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-[11px] text-slate-500">
                      CBSA ACI eManifest / PARS
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. ONE-CLICK CSV EXPORT SUITE */}
      <CsvExportSuite />
    </div>
  );
}

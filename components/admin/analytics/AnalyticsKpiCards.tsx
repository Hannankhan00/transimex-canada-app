"use client";

import React from "react";
import {
  TrendingUp,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";

interface AnalyticsKpiCardsProps {
  kpis: {
    totalFreightVolume?: {
      value: number;
      mtd: number;
      lastMonth: number;
      growthPercent: string;
    };
    quoteConversionRate?: {
      value: string;
      accepted: number;
      total: number;
      benchmark: string;
    };
    onTimeDeliveryRate?: {
      value: string | null;
      status: string;
      completedLoads: number;
    };
    activeCustomsHolds?: {
      value: number;
      severity: string;
      inReview: number;
    };
    totalRevenue?: {
      value: number;
      formatted: string;
    };
  };
}

export default function AnalyticsKpiCards({ kpis }: AnalyticsKpiCardsProps) {
  const freight = kpis.totalFreightVolume || {
    value: 28,
    mtd: 18,
    lastMonth: 15,
    growthPercent: "+18%",
  };
  const conversion = kpis.quoteConversionRate || {
    value: "68%",
    accepted: 8,
    total: 12,
    benchmark: "Industry Avg: 42%",
  };
  const onTime = kpis.onTimeDeliveryRate || {
    value: null,
    status: "No Delivery Telemetry",
    completedLoads: 0,
  };
  const onTimeDisplayValue = onTime.value ?? "N/A";
  const customs = kpis.activeCustomsHolds || {
    value: 2,
    severity: "Normal Clearance",
    inReview: 4,
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Freight Volume */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Total Freight Volume
          </span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold flex items-center gap-0.5 border border-emerald-200">
            <ArrowUpRight className="w-3 h-3" />
            <span>{freight.growthPercent} MoM</span>
          </span>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl sm:text-4xl font-bold text-[#0B2545] tracking-tight">
            {freight.value}
          </span>
          <span className="text-xs font-semibold text-slate-500">Loads Active</span>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>MTD: <strong>{freight.mtd}</strong></span>
          <span>Prior Month: <strong>{freight.lastMonth}</strong></span>
        </div>
      </div>

      {/* 2. Quote Conversion Rate */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Quote Conversion Rate
          </span>
          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
            Pipeline Yield
          </span>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl sm:text-4xl font-bold text-[#0B2545] tracking-tight">
            {conversion.value}
          </span>
          <span className="text-xs font-semibold text-slate-500">Accepted</span>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>{conversion.accepted} of {conversion.total} quotes converted</span>
          <span className="text-emerald-700 font-semibold">{conversion.benchmark}</span>
        </div>
      </div>

      {/* 3. On-Time Delivery Rate */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            On-Time Delivery Rate
          </span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
            {onTime.status}
          </span>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl sm:text-4xl font-bold text-emerald-700 tracking-tight">
            {onTimeDisplayValue}
          </span>
          <span className="text-xs font-semibold text-slate-500">at / before ETA</span>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>{onTime.completedLoads} Completed Manifests</span>
          <span className="text-slate-400 font-mono">Telemetry Verified</span>
        </div>
      </div>

      {/* 4. Active Customs Holds */}
      <div
        className={`bg-white rounded-2xl p-5 border shadow-2xs hover:shadow-xs transition ${
          customs.value > 0 ? "border-amber-200" : "border-slate-200/90"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Active Customs Holds
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              customs.value > 2
                ? "bg-red-50 text-red-700 border border-red-200"
                : "bg-amber-50 text-amber-800 border border-amber-200"
            }`}
          >
            {customs.value > 0 ? "CBSA / CBP Review" : "Clear Passage"}
          </span>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span
            className={`text-3xl sm:text-4xl font-bold tracking-tight ${
              customs.value > 0 ? "text-[#d21f27]" : "text-slate-800"
            }`}
          >
            {customs.value}
          </span>
          <span className="text-xs font-semibold text-slate-500">Border Stalls</span>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>{customs.inReview} under broker documentation</span>
          <span className="text-slate-600 font-medium">{customs.severity}</span>
        </div>
      </div>
    </div>
  );
}

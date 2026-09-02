"use client";

import React, { useState } from "react";
import { BarChart3, TrendingUp, Calendar } from "lucide-react";

interface MonthlyVolumeData {
  month: string;
  volume: number;
  revenue: number;
}

interface VolumeTrendChartProps {
  data?: MonthlyVolumeData[];
}

export default function VolumeTrendChart({ data }: VolumeTrendChartProps) {
  const defaultData: MonthlyVolumeData[] = [
    { month: "Jan", volume: 142, revenue: 688000 },
    { month: "Feb", volume: 165, revenue: 792000 },
    { month: "Mar", volume: 198, revenue: 954000 },
    { month: "Apr", volume: 220, revenue: 1085000 },
    { month: "May", volume: 254, revenue: 1240000 },
    { month: "Jun", volume: 289, revenue: 1410000 },
    { month: "Jul", volume: 312, revenue: 1530000 },
    { month: "Aug", volume: 345, revenue: 1680000 },
  ];

  const items = data && data.length > 0 ? data : defaultData;
  const [activeIdx, setActiveIdx] = useState<number | null>(items.length - 1);

  const maxVolume = Math.max(...items.map((d) => d.volume));

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="font-bold text-[#0B2545] text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#d21f27]" />
            <span>Monthly Freight Volume Trend</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Dispatched loads month-over-month identifying seasonal cross-border peaks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-600" />
            <span>+142% 2026 Surge</span>
          </span>
        </div>
      </div>

      {/* SVG Bar Chart */}
      <div className="pt-6 pb-2">
        <div className="h-56 flex items-end justify-between gap-2 sm:gap-3 px-2 border-b border-slate-200 relative">
          {/* Horizontal Grid lines */}
          <div className="absolute inset-x-0 top-0 border-b border-dashed border-slate-100 pointer-events-none" />
          <div className="absolute inset-x-0 top-1/2 border-b border-dashed border-slate-100 pointer-events-none" />

          {items.map((item, idx) => {
            const heightPercent = Math.round((item.volume / (maxVolume * 1.15)) * 100);
            const isSelected = activeIdx === idx;
            const isHighest = item.volume === maxVolume;

            return (
              <div
                key={item.month}
                className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                onMouseEnter={() => setActiveIdx(idx)}
              >
                {/* Tooltip on hover */}
                {isSelected && (
                  <div className="mb-2 px-2 py-1 bg-[#0B2545] text-white text-[10px] font-mono rounded shadow-md whitespace-nowrap animate-in fade-in zoom-in-95 duration-100">
                    <span className="font-bold">{item.volume} Loads</span>
                    <span className="text-slate-300 block text-[9px]">${(item.revenue / 1000).toFixed(0)}k CAD</span>
                  </div>
                )}

                {/* Bar */}
                <div
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full max-w-[38px] rounded-t-lg transition-all duration-300 ${
                    isSelected
                      ? "bg-[#d21f27] shadow-sm"
                      : isHighest
                      ? "bg-[#0B2545]"
                      : "bg-slate-200 group-hover:bg-slate-400"
                  }`}
                />

                {/* X-axis Label */}
                <span
                  className={`mt-2 text-[11px] font-mono transition ${
                    isSelected ? "font-bold text-[#0B2545]" : "text-slate-500"
                  }`}
                >
                  {item.month}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span>
          Selected: <strong className="text-slate-800">{items[activeIdx ?? 0].month} 2026</strong> &bull;{" "}
          <strong className="text-[#0B2545]">{items[activeIdx ?? 0].volume} Shipments</strong>
        </span>
        <span className="text-emerald-700 font-semibold font-mono">
          Revenue: ${(items[activeIdx ?? 0].revenue).toLocaleString()} CAD
        </span>
      </div>
    </div>
  );
}

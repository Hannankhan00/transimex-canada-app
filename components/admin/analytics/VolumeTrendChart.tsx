"use client";

import React, { useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { BarChart3, TrendingUp, TrendingDown } from "lucide-react";

interface MonthlyVolumeData {
  month: string;
  volume: number;
  revenue: number;
}

interface VolumeTrendChartProps {
  data?: MonthlyVolumeData[];
}

export default function VolumeTrendChart({ data }: VolumeTrendChartProps) {
  const { language } = useLanguage();
  const items = data || [];
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  // Clamp against the currently rendered items — activeIdx may have been set
  // (or default-initialized) against a previous, differently-sized array.
  const selectedIdx = activeIdx !== null && activeIdx < items.length ? activeIdx : items.length - 1;

  const maxVolume = items.length > 0 ? Math.max(...items.map((d) => d.volume)) : 0;

  // Real month-over-month growth from the last two data points, rather than a
  // fixed claim disconnected from whatever data is actually showing.
  const momGrowth =
    items.length >= 2 && items[items.length - 2].volume > 0
      ? Math.round(
          ((items[items.length - 1].volume - items[items.length - 2].volume) /
            items[items.length - 2].volume) *
            100
        )
      : null;

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="font-bold text-[#0B2545] text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#d21f27]" />
            <span>{language === "fr" ? "Tendance Mensuelle du Volume de Fret" : "Monthly Freight Volume Trend"}</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {language === "fr"
              ? "Chargements expédiés mois par mois, identifiant les pics saisonniers transfrontaliers."
              : "Dispatched loads month-over-month identifying seasonal cross-border peaks."}
          </p>
        </div>

        {momGrowth !== null && (
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                momGrowth >= 0
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-red-50 text-red-700 border-red-200"
              }`}
            >
              {momGrowth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>
                {momGrowth >= 0 ? "+" : ""}
                {momGrowth}% {language === "fr" ? "M/M" : "MoM"}
              </span>
            </span>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-xs">
          {language === "fr" ? "Aucune donnée de volume disponible pour le moment." : "No volume data available yet."}
        </div>
      ) : (
        <>
          {/* SVG Bar Chart */}
          <div className="pt-6 pb-2">
            <div className="h-56 flex items-end justify-between gap-2 sm:gap-3 px-2 border-b border-slate-200 relative">
              {/* Horizontal Grid lines */}
              <div className="absolute inset-x-0 top-0 border-b border-dashed border-slate-100 pointer-events-none" />
              <div className="absolute inset-x-0 top-1/2 border-b border-dashed border-slate-100 pointer-events-none" />

              {items.map((item, idx) => {
                const heightPercent = maxVolume > 0 ? Math.round((item.volume / (maxVolume * 1.15)) * 100) : 0;
                const isSelected = selectedIdx === idx;
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
                        <span className="font-bold">{item.volume} {language === "fr" ? "Chargements" : "Loads"}</span>
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
              {language === "fr" ? "Sélectionné :" : "Selected:"}{" "}
              <strong className="text-slate-800">{items[selectedIdx].month}</strong> &bull;{" "}
              <strong className="text-[#0B2545]">
                {items[selectedIdx].volume} {language === "fr" ? "Expéditions" : "Shipments"}
              </strong>
            </span>
            <span className="text-emerald-700 font-semibold font-mono">
              {language === "fr" ? "Revenu :" : "Revenue:"} ${items[selectedIdx].revenue.toLocaleString()} CAD
            </span>
          </div>
        </>
      )}
    </div>
  );
}

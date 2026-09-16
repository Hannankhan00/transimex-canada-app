"use client";

import React, { useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { DollarSign } from "lucide-react";

interface MonthlyRevenueData {
  month: string;
  revenue: number;
}

interface RevenueTrendChartProps {
  data?: MonthlyRevenueData[];
}

export default function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  const { language } = useLanguage();
  const items = data || [];
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  // Clamp against the currently rendered items — hoveredIdx may have been set
  // (or default-initialized) against a previous, differently-sized array.
  const selectedIdx = hoveredIdx !== null && hoveredIdx < items.length ? hoveredIdx : items.length - 1;

  const hasData = items.length > 0;
  const maxRevenue = hasData ? Math.max(...items.map((d) => d.revenue)) : 0;
  const minRevenue = hasData ? Math.min(...items.map((d) => d.revenue)) : 0;

  // Area chart SVG path calculation
  const width = 600;
  const height = 180;
  const padding = 20;

  const points = items.map((d, idx) => {
    const x = padding + (items.length > 1 ? idx / (items.length - 1) : 0) * (width - 2 * padding);
    const range = maxRevenue - minRevenue * 0.8;
    const y =
      height - padding - (range > 0 ? ((d.revenue - minRevenue * 0.8) / range) * (height - 2 * padding) : 0);
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, p, idx) => {
    return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, "");

  const areaD = hasData
    ? `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`
    : "";

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="font-bold text-[#0B2545] text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>
              {language === "fr"
                ? "Trajectoire du Revenu de Fret et de Transport"
                : "Freight Tariff & Linehaul Revenue Trajectory"}
            </span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {language === "fr"
              ? "Tarifs de transport mensuels facturés cumulés pour toutes les opérations transfrontalières canado-américaines."
              : "Cumulative monthly billed linehaul tariffs across all Canadian and US cross-border operations."}
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono">
          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
            {language === "fr" ? "Devise CAD" : "CAD Currency"}
          </span>
        </div>
      </div>

      {!hasData ? (
        <div className="py-16 text-center text-slate-400 text-xs">
          {language === "fr" ? "Aucune donnée de revenu disponible pour le moment." : "No revenue data available yet."}
        </div>
      ) : (
        <>
          {/* SVG Area Chart */}
          <div className="py-4 relative">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44 overflow-visible">
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0B2545" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#0B2545" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Background Area */}
              <path d={areaD} fill="url(#revenueGrad)" />

              {/* Stroke Line */}
              <path d={pathD} fill="none" stroke="#0B2545" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

              {/* Data Points */}
              {points.map((p, idx) => {
                const isHovered = selectedIdx === idx;
                return (
                  <g key={p.month} className="cursor-pointer">
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isHovered ? 6 : 4}
                      fill={isHovered ? "#d21f27" : "#0B2545"}
                      stroke="#FFFFFF"
                      strokeWidth="2"
                      onMouseEnter={() => setHoveredIdx(idx)}
                    />
                  </g>
                );
              })}
            </svg>

            {/* X-axis Month labels */}
            <div className="flex items-center justify-between px-3 pt-1 text-[11px] font-mono text-slate-500">
              {items.map((item, idx) => (
                <span
                  key={item.month}
                  className={`cursor-pointer transition ${selectedIdx === idx ? "font-bold text-[#0B2545]" : ""}`}
                  onMouseEnter={() => setHoveredIdx(idx)}
                >
                  {item.month}
                </span>
              ))}
            </div>
          </div>

          {/* Footer Info */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-500">
            <span>
              {language === "fr" ? "Sélectionné :" : "Selected:"}{" "}
              <strong className="text-slate-800">{items[selectedIdx].month}</strong>
            </span>
            <span className="text-[#0B2545] font-bold text-sm font-mono">
              ${items[selectedIdx].revenue.toLocaleString()} CAD
            </span>
          </div>
        </>
      )}
    </div>
  );
}

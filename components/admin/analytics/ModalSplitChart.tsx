"use client";

import React, { useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { PieChart } from "lucide-react";

interface ModalSplitItem {
  mode: string;
  count: number;
  percentage: number;
  color: string;
}

interface ModalSplitChartProps {
  data?: ModalSplitItem[];
}

export default function ModalSplitChart({ data }: ModalSplitChartProps) {
  const { language } = useLanguage();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const items = data || [];
  const totalLoads = items.reduce((sum, item) => sum + item.count, 0);
  const hasData = totalLoads > 0;
  const currentYear = new Date().getFullYear();

  // SVG doughnut calculations
  const size = 180;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Precompute each segment's starting rotation from cumulative percentages
  // rather than mutating a variable during render (unsafe under React's
  // concurrent rendering, and flagged by react-hooks/immutability).
  const segmentRotations = items.reduce<number[]>((acc, item, idx) => {
    const prevCumulative = idx === 0 ? 0 : acc[idx - 1] + items[idx - 1].percentage;
    acc.push(prevCumulative);
    return acc;
  }, []);

  const leadingMode = hasData
    ? items.reduce((a, b) => (b.count > a.count ? b : a), items[0])
    : null;

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="font-bold text-[#0B2545] text-sm flex items-center gap-2">
            <PieChart className="w-4 h-4 text-[#d21f27]" />
            <span>{language === "fr" ? "Répartition Modale du Transport" : "Transport Modal Split"}</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {language === "fr"
              ? "Répartition du fret entre les réseaux routier, maritime, aérien et ferroviaire."
              : "Freight distribution across road, maritime, aviation & rail networks."}
          </p>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono font-bold">
          {currentYear} YTD
        </span>
      </div>

      {!hasData ? (
        <div className="py-12 text-center text-slate-400 text-xs">
          {language === "fr" ? "Aucune expédition consignée pour le moment." : "No shipments logged yet."}
        </div>
      ) : (
        <>
          {/* Doughnut Graphic & Legend */}
          <div className="py-5 flex flex-col sm:flex-row items-center justify-center gap-6">
            {/* SVG Doughnut */}
            <div className="relative w-[180px] h-[180px] flex-shrink-0 flex items-center justify-center">
              <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className="transform -rotate-90"
              >
                {/* Background circle */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke="#F1F5F9"
                  strokeWidth={strokeWidth}
                />

                {/* Segments */}
                {items.map((item, index) => {
                  const strokeDashoffset =
                    circumference - (item.percentage / 100) * circumference;
                  const rotation = (segmentRotations[index] / 100) * 360;

                  const isHovered = hoveredIdx === index;

                  return (
                    <circle
                      key={item.mode}
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      fill="transparent"
                      stroke={item.color}
                      strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
                      className="transition-all duration-300 cursor-pointer"
                      onMouseEnter={() => setHoveredIdx(index)}
                      onMouseLeave={() => setHoveredIdx(null)}
                    />
                  );
                })}
              </svg>

              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {language === "fr" ? "Total Chargements" : "Total Loads"}
                </span>
                <span className="text-2xl font-bold text-[#0B2545] leading-tight">
                  {hoveredIdx !== null ? `${items[hoveredIdx].percentage}%` : totalLoads}
                </span>
                <span className="text-[10px] font-semibold text-slate-500">
                  {hoveredIdx !== null
                    ? items[hoveredIdx].mode.split(" ")[0]
                    : language === "fr"
                    ? "Expédiés"
                    : "Dispatched"}
                </span>
              </div>
            </div>

            {/* Legend List */}
            <div className="flex-1 w-full space-y-2.5 text-xs">
              {items.map((item, idx) => {
                const isHovered = hoveredIdx === idx;
                return (
                  <div
                    key={item.mode}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                      isHovered
                        ? "bg-slate-50 border-slate-300 shadow-2xs"
                        : "border-slate-100 hover:border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-bold text-slate-800">{item.mode}</span>
                    </div>

                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-slate-500 text-[11px]">
                        {item.count} {language === "fr" ? "chargements" : "loads"}
                      </span>
                      <span className="font-bold text-slate-900 text-xs w-9 text-right">
                        {item.percentage}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {leadingMode && (
            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400">
              {language === "fr"
                ? `${leadingMode.mode} est le principal moteur du volume actuel (${leadingMode.percentage}%).`
                : `${leadingMode.mode} remains the primary driver of current volume (${leadingMode.percentage}%).`}
            </div>
          )}
        </>
      )}
    </div>
  );
}

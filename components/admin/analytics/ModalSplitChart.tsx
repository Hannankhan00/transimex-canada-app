"use client";

import React, { useState } from "react";
import { Truck, Ship, Plane, Train, PieChart } from "lucide-react";

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
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const defaultData: ModalSplitItem[] = [
    { mode: "Road (Highway)", count: 12, percentage: 42, color: "#0B2545" },
    { mode: "Sea (Maritime)", count: 9, percentage: 31, color: "#1E3A8A" },
    { mode: "Air (Express)", count: 5, percentage: 16, color: "#d21f27" },
    { mode: "Rail (Intermodal)", count: 3, percentage: 11, color: "#D97706" },
  ];

  const items = data && data.length > 0 ? data : defaultData;
  const totalLoads = items.reduce((sum, item) => sum + item.count, 0);

  // SVG doughnut calculations
  const size = 180;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativePercent = 0;

  const modeIcons: Record<string, any> = {
    Road: Truck,
    Sea: Ship,
    Air: Plane,
    Rail: Train,
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="font-bold text-[#0B2545] text-sm flex items-center gap-2">
            <PieChart className="w-4 h-4 text-[#d21f27]" />
            <span>Transport Modal Split</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Freight distribution across road, maritime, aviation &amp; rail networks.
          </p>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono font-bold">
          2026 YTD
        </span>
      </div>

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
              const rotation = (cumulativePercent / 100) * 360;
              cumulativePercent += item.percentage;

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
              Total Loads
            </span>
            <span className="text-2xl font-bold text-[#0B2545] leading-tight">
              {hoveredIdx !== null ? `${items[hoveredIdx].percentage}%` : totalLoads}
            </span>
            <span className="text-[10px] font-semibold text-slate-500">
              {hoveredIdx !== null ? items[hoveredIdx].mode.split(" ")[0] : "Dispatched"}
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
                  <span className="text-slate-500 text-[11px]">{item.count} loads</span>
                  <span className="font-bold text-slate-900 text-xs w-9 text-right">
                    {item.percentage}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span>Road highway freight remains primary driver</span>
        <span className="font-mono">Ambassador &amp; Lacolle Corridors</span>
      </div>
    </div>
  );
}

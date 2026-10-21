"use client";

import React from "react";
import type { UnitSystem } from "@/lib/express/units";

/** lb / in versus kg / cm. */
export default function UnitToggle({ value, onChange }: { value: UnitSystem; onChange: (v: UnitSystem) => void }) {
  return (
    <div role="group" aria-label="Units" className="inline-flex overflow-hidden rounded-lg border border-slate-200 text-xs font-bold">
      {(
        [
          ["imperial", "lb · in"],
          ["metric", "kg · cm"],
        ] as const
      ).map(([unit, label]) => (
        <button
          key={unit}
          type="button"
          aria-pressed={value === unit}
          onClick={() => onChange(unit)}
          className={`cursor-pointer px-3 py-1.5 transition ${value === unit ? "bg-[#0B2545] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

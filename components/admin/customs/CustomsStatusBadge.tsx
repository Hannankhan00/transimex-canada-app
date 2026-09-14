"use client";

import React from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { CustomsClearanceStatus } from "@/lib/customsTypes";
import { Clock, AlertTriangle, ShieldCheck } from "lucide-react";

interface CustomsStatusBadgeProps {
  status: CustomsClearanceStatus | string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function CustomsStatusBadge({
  status,
  size = "md",
  className = "",
}: CustomsStatusBadgeProps) {
  const { language } = useLanguage();
  const sizeClasses =
    size === "sm"
      ? "px-2 py-0.5 text-[10px]"
      : size === "lg"
      ? "px-3.5 py-1.5 text-xs font-bold"
      : "px-2.5 py-1 text-[11px] font-bold";

  switch (status) {
    case "Pending":
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs font-semibold ${sizeClasses} ${className}`}
        >
          <Clock className="w-3 h-3 text-slate-500" />
          <span>{language === "fr" ? "Dédouanement en Attente" : "Pending Clearance"}</span>
        </span>
      );

    case "In Review":
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200/90 shadow-2xs font-bold ${sizeClasses} ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
          <span>{language === "fr" ? "ASFC / En Révision" : "CBSA / In Review"}</span>
        </span>
      );

    case "Released":
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/90 shadow-2xs font-bold ${sizeClasses} ${className}`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>{language === "fr" ? "Douanes Libérées" : "Customs Released"}</span>
        </span>
      );

    case "Held":
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-red-50 text-[#d21f27] border-2 border-red-200 shadow-xs font-bold animate-pulse ${sizeClasses} ${className}`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-[#d21f27] stroke-[2.5]" />
          <span>{language === "fr" ? "RETENU EN DOUANE" : "CUSTOMS HELD"}</span>
        </span>
      );

    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses} ${className}`}
        >
          <span>{status}</span>
        </span>
      );
  }
}

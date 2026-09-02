"use client";

import React from "react";
import { QuoteStatus } from "@/lib/mockData";
import { CheckCircle2, Clock, XCircle, AlertCircle, FileSpreadsheet } from "lucide-react";

interface StatusBadgeProps {
  status: QuoteStatus | string;
  size?: "sm" | "md";
  className?: string;
}

export default function StatusBadge({
  status,
  size = "md",
  className = "",
}: StatusBadgeProps) {
  const sizeClasses =
    size === "sm"
      ? "px-2 py-0.5 text-[10px]"
      : "px-2.5 py-1 text-[11px]";

  switch (status) {
    case "under_review":
    case "new":
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200/80 shadow-2xs ${sizeClasses} ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span>New / Review</span>
        </span>
      );

    case "reviewing":
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs ${sizeClasses} ${className}`}
        >
          <Clock className="w-3 h-3 text-blue-500 animate-spin" style={{ animationDuration: "3s" }} />
          <span>In Staff Review</span>
        </span>
      );

    case "accepted":
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-2xs ${sizeClasses} ${className}`}
        >
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>Accepted & Dispatched</span>
        </span>
      );

    case "rejected":
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full font-bold bg-red-50 text-[#d21f27] border border-red-200/80 shadow-2xs ${sizeClasses} ${className}`}
        >
          <XCircle className="w-3 h-3 text-[#d21f27]" />
          <span>Rejected</span>
        </span>
      );

    case "expired":
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-slate-100 text-slate-600 border border-slate-200 ${sizeClasses} ${className}`}
        >
          <AlertCircle className="w-3 h-3 text-slate-400" />
          <span>Expired</span>
        </span>
      );

    default:
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full font-medium bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses} ${className}`}
        >
          <span>{status}</span>
        </span>
      );
  }
}

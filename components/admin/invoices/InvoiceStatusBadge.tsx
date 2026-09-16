"use client";

import React from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { InvoiceStatus } from "@/lib/invoiceTypes";

export default function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const { language } = useLanguage();

  const config: Record<InvoiceStatus, { labelEn: string; labelFr: string; className: string; icon: React.ComponentType<{ className?: string }> }> = {
    unpaid: {
      labelEn: "Unpaid",
      labelFr: "Impayée",
      className: "bg-slate-100 text-slate-600 border-slate-200",
      icon: Clock,
    },
    pending_verification: {
      labelEn: "Pending Verification",
      labelFr: "Vérification en Cours",
      className: "bg-amber-50 text-amber-700 border-amber-200/70",
      icon: AlertTriangle,
    },
    paid: {
      labelEn: "Paid",
      labelFr: "Payée",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
      icon: CheckCircle2,
    },
  };

  const { labelEn, labelFr, className, icon: Icon } = config[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${className}`}>
      <Icon className="w-3 h-3" />
      {language === "fr" ? labelFr : labelEn}
    </span>
  );
}

"use client";

import React from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export type AdminStatus = "pending" | "active" | "rejected" | "suspended";

export const STATUS_STYLES: Record<AdminStatus, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  suspended: "bg-slate-100 text-slate-600 border-slate-300",
};

export function useTr() {
  const { language } = useLanguage();
  return { language, tr: (en: string, fr: string) => (language === "fr" ? fr : en) };
}

export function StatusBadge({ status }: { status: AdminStatus }) {
  const { tr } = useTr();
  const labels: Record<AdminStatus, string> = {
    pending: tr("Pending", "En attente"),
    active: tr("Active", "Actif"),
    rejected: tr("Rejected", "Rejeté"),
    suspended: tr("Suspended", "Suspendu"),
  };
  return (
    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${STATUS_STYLES[status]}`}>{labels[status]}</span>
  );
}

export function TypeBadge({ type }: { type: "b2c" | "b2b" | "customer" }) {
  return (
    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wide">
      {type}
    </span>
  );
}

/** Navigation now lives in the admin sidebar; kept as a no-op so existing pages need no change. */
export function ExpressAdminTabs() {
  return null;
}

export const adminInput =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]";

export function dollarsToCents(value: string): number | null {
  const n = Number(value);
  return Number.isFinite(n) && value.trim() !== "" ? Math.round(n * 100) : null;
}

export function formatDate(iso: string | null, lang: "en" | "fr") {
  if (!iso) return "";
  return new Intl.DateTimeFormat(lang === "fr" ? "fr-CA" : "en-CA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

export const INVOICE_STATUS_STYLES: Record<string, string> = {
  issued: "bg-amber-50 text-amber-700 border-amber-200",
  overdue: "bg-red-50 text-red-700 border-red-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  void: "bg-slate-100 text-slate-600 border-slate-300",
};

export function InvoiceStatusBadge({ status }: { status: string }) {
  const { tr } = useTr();
  const labels: Record<string, string> = {
    issued: tr("Unpaid", "Impayée"),
    overdue: tr("Overdue", "En retard"),
    paid: tr("Paid", "Payée"),
    void: tr("Void", "Annulée"),
  };
  return <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${INVOICE_STATUS_STYLES[status] || ""}`}>{labels[status] || status}</span>;
}

export const SHIPMENT_STATUS_STYLES: Record<string, string> = {
  awaiting_payment: "bg-amber-50 text-amber-700 border-amber-200",
  paid: "bg-blue-50 text-blue-700 border-blue-200",
  label_ready: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-slate-100 text-slate-600 border-slate-300",
};

/** Documents or goods, shown on every shipment so a mislabelled booking is easy to spot. */
export function ContentTypeBadge({ type }: { type?: string }) {
  const { tr } = useTr();
  return type === "documents" ? (
    <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold uppercase">{tr("Documents", "Documents")}</span>
  ) : (
    <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold uppercase">{tr("Goods", "Marchandises")}</span>
  );
}

export function ShipmentStatusBadge({ status }: { status: string }) {
  const { tr } = useTr();
  const labels: Record<string, string> = {
    awaiting_payment: tr("Awaiting payment", "En attente de paiement"),
    paid: tr("Paid", "Payé"),
    label_ready: tr("Label ready", "Étiquette prête"),
    cancelled: tr("Cancelled", "Annulé"),
  };
  return <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${SHIPMENT_STATUS_STYLES[status] || ""}`}>{labels[status] || status}</span>;
}

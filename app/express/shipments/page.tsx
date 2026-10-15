"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Package, RefreshCw } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { formatCad } from "@/lib/shipping/core/money";
import { COUNTRIES } from "@/lib/data/countries";
import type { ClientShipmentDTO } from "@/lib/express/shipmentDto";

const STATUS_STYLE: Record<string, string> = {
  awaiting_payment: "bg-amber-50 text-amber-700 border-amber-200",
  paid: "bg-blue-50 text-blue-700 border-blue-200",
  label_ready: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-slate-100 text-slate-600 border-slate-300",
};

export default function ExpressShipmentsPage() {
  const { t, language } = useLanguage();
  const s = t.express.shipments;
  const [shipments, setShipments] = useState<ClientShipmentDTO[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const res = await fetch("/api/express/shipments");
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error("load");
      setShipments(data.shipments);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const country = (code: string) => {
    const c = COUNTRIES.find((x) => x.code === code);
    return c ? (language === "fr" ? c.nameFr : c.name) : code;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-[#0B2545]">{s.title}</h1>
        <Link href="/express/book" className="px-4 py-2 rounded-xl bg-[#D21F27] hover:bg-[#b91a21] text-white text-sm font-bold transition">
          {t.express.navBook}
        </Link>
      </div>

      {error ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3">
          <p className="text-sm text-red-600 font-semibold">{t.express.loadError}</p>
          <button type="button" onClick={load} className="px-4 py-2 rounded-xl bg-[#0B2545] text-white text-xs font-bold cursor-pointer">
            {t.express.retry}
          </button>
        </div>
      ) : shipments === null ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
          <RefreshCw className="w-4 h-4 animate-spin" />
          {t.express.loading}
        </div>
      ) : shipments.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-xs">
          <Package className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="mt-2 text-sm text-slate-600">{s.empty}</p>
          <Link href="/express/book" className="inline-block mt-4 px-5 py-2.5 rounded-xl bg-[#0B2545] text-white text-sm font-bold">
            {s.bookFirst}
          </Link>
        </div>
      ) : (
        <ul className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden">
          {shipments.map((sh) => (
            <li key={sh.id}>
              <Link href={`/express/shipments/${sh.id}`} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-4 hover:bg-slate-50 transition">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-[#0B2545] font-mono">{sh.reference}</span>
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${STATUS_STYLE[sh.status]}`}>{t.express.shipmentStatus[sh.status]}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 truncate">
                    {s.recipient}: {sh.recipient.name}, {sh.recipient.city}, {country(sh.recipient.countryCode)}
                  </div>
                </div>
                <div className="text-xs text-slate-500 sm:text-right whitespace-nowrap">
                  <div className="font-bold text-slate-800 text-sm">{formatCad(sh.totalCents, language)}</div>
                  {sh.createdAt && new Intl.DateTimeFormat(language === "fr" ? "fr-CA" : "en-CA", { dateStyle: "medium" }).format(new Date(sh.createdAt))}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

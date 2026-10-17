"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, PackagePlus, Package, RefreshCw, Search } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { formatCad } from "@/lib/shipping/core/money";
import { COUNTRIES } from "@/lib/data/countries";
import { useExpressAccount } from "@/components/express/useExpressAccount";
import ExpressStatusBanner from "@/components/express/ExpressStatusBanner";
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
  const { account } = useExpressAccount();
  const isCustomer = account?.type === "customer";
  // A partner's customer cannot book: their partner does that.
  const canBook = account?.status === "active" && !isCustomer;
  const [shipments, setShipments] = useState<ClientShipmentDTO[] | null>(null);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<"all" | "awaiting_payment" | "paid" | "label_ready" | "cancelled">("all");
  const [query, setQuery] = useState("");

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

  const q = query.trim().toLowerCase();
  const visible = (shipments ?? []).filter(
    (sh) => (filter === "all" || sh.status === filter) && (!q || [sh.reference, sh.recipient.name, sh.recipient.city, sh.partner?.customerName].some((v) => v && v.toLowerCase().includes(q))),
  );
  const countOf = (status: string) => (shipments ?? []).filter((sh) => status === "all" || sh.status === status).length;
  const filters = ["all", "awaiting_payment", "paid", "label_ready", "cancelled"] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0B2545]">{s.title}</h1>
          {shipments && <p className="mt-1 text-sm text-slate-600">{shipments.length} {t.express.overview.statTotal.toLowerCase()}</p>}
        </div>
        {canBook && (
          <Link href="/express/book" className="inline-flex items-center gap-2 rounded-xl bg-[#0B2545] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#12315c]">
            <PackagePlus className="h-4 w-4" />
            {t.express.navBook}
          </Link>
        )}
      </div>

      {account && !canBook && <ExpressStatusBanner account={account} />}

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
          {canBook && (
            <Link href="/express/book" className="inline-block mt-4 px-5 py-2.5 rounded-xl bg-[#0B2545] text-white text-sm font-bold">
              {s.bookFirst}
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5" role="tablist">
              {filters.map((f) => (
                <button
                  key={f}
                  type="button"
                  role="tab"
                  aria-selected={filter === f}
                  onClick={() => setFilter(f)}
                  className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${filter === f ? "border-[#0B2545] bg-[#0B2545] text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                >
                  {f === "all" ? t.express.overview.statTotal : t.express.shipmentStatus[f]} <span className="opacity-60">{countOf(f)}</span>
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={s.recipient}
                aria-label={s.recipient}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#0B2545] focus:ring-1 focus:ring-[#0B2545]/10"
              />
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-xs">{s.empty}</div>
          ) : (
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
              {visible.map((sh) => (
                <li key={sh.id}>
                  <Link href={`/express/shipments/${sh.id}`} className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50">
                    <div className="hidden h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-[#0B2545]/5 text-[#0B2545] sm:grid">
                      <Package className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-bold text-[#0B2545]">{sh.reference}</span>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[sh.status]}`}>{sh.status === "label_ready" && sh.tracking ? t.express.trackingStatus[sh.tracking.status as keyof typeof t.express.trackingStatus] : isCustomer && sh.status === "paid" ? t.express.partner.customerStatusPaid : t.express.shipmentStatus[sh.status]}</span>
                        {sh.contentType === "documents" && <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">{t.express.book.typeDocuments}</span>}
                        {sh.partner && <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600">{sh.partner.customerName}</span>}
                      </div>
                      <div className="mt-1 truncate text-xs text-slate-500">
                        {s.recipient}: {sh.recipient.name}, {sh.recipient.city}, {country(sh.recipient.countryCode)}
                      </div>
                    </div>
                    <div className="whitespace-nowrap text-right text-xs text-slate-500">
                      <div className="text-sm font-bold tabular-nums text-slate-800">{formatCad(sh.partner ? sh.partner.customerTotalCents : sh.totalCents, language)}</div>
                      {sh.partner && <div className="text-[11px]">{t.express.partner.youPay}: {formatCad(sh.totalCents, language)}</div>}
                      {sh.createdAt && <div className="mt-0.5">{new Intl.DateTimeFormat(language === "fr" ? "fr-CA" : "en-CA", { dateStyle: "medium" }).format(new Date(sh.createdAt))}</div>}
                    </div>
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-300 transition-colors group-hover:text-slate-500" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

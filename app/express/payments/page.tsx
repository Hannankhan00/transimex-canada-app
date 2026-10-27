"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDownToLine, CreditCard, RefreshCw, Undo2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { formatCad } from "@/lib/shipping/core/money";
import type { PaymentEntry, PaymentEntryKind } from "@/lib/express/paymentHistory";

interface Loaded {
  entries: PaymentEntry[];
  paidCents: number;
  refundedCents: number;
  netCents: number;
}

const KIND_STYLE: Record<PaymentEntryKind, string> = {
  booking: "bg-blue-50 text-blue-700 border-blue-200",
  invoice: "bg-violet-50 text-violet-700 border-violet-200",
  refund: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function ExpressPaymentsPage() {
  const { t, language } = useLanguage();
  const p = t.express.payments;
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<"all" | PaymentEntryKind>("all");

  const load = useCallback(async () => {
    setError(false);
    try {
      const res = await fetch("/api/express/payments");
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.success) throw new Error("load");
      setData(body);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const m = (c: number) => formatCad(c, language);
  const locale = language === "fr" ? "fr-CA" : "en-CA";
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

  const visible = (data?.entries ?? []).filter((e) => filter === "all" || e.kind === filter);
  const countOf = (k: "all" | PaymentEntryKind) => (data?.entries ?? []).filter((e) => k === "all" || e.kind === k).length;

  // A spreadsheet-friendly copy for the client's bookkeeping.
  const exportCsv = () => {
    const rows = [[p.colDate, p.colType, p.colReference, p.colMethod, p.colAmount], ...visible.map((e) => [new Date(e.date).toISOString(), p.kind[e.kind], e.reference, p.method[e.method], (e.amountCents / 100).toFixed(2)])];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "transimex-express-payments.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const filters = ["all", "booking", "invoice", "refund"] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0B2545]">{p.title}</h1>
          <p className="mt-1 text-sm text-slate-600">{p.subtitle}</p>
        </div>
        {data && data.entries.length > 0 && (
          <button type="button" onClick={exportCsv} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50">
            <ArrowDownToLine className="h-4 w-4" />
            {p.export}
          </button>
        )}
      </div>

      {data && (
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            [p.totalPaid, data.paidCents, "text-[#0B2545]"],
            [p.totalRefunded, data.refundedCents, "text-emerald-700"],
            [p.net, data.netCents, "text-slate-800"],
          ].map(([label, cents, tone]) => (
            <div key={label as string} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label as string}</p>
              <p className={`mt-1 text-2xl font-extrabold tabular-nums ${tone}`}>{m(cents as number)}</p>
            </div>
          ))}
        </div>
      )}

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
            {f === "all" ? p.filterAll : p.kind[f]} <span className="opacity-60">{countOf(f)}</span>
          </button>
        ))}
      </div>

      {error ? (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm font-semibold text-red-600">{p.loadError}</p>
          <button type="button" onClick={load} className="cursor-pointer rounded-xl bg-[#0B2545] px-4 py-2 text-xs font-bold text-white">
            {t.express.retry}
          </button>
        </div>
      ) : data === null ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
          <RefreshCw className="h-4 w-4 animate-spin" />
          {t.express.loading}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-xs">
          <CreditCard className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">{p.empty}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-bold">{p.colDate}</th>
                <th className="px-4 py-3 font-bold">{p.colType}</th>
                <th className="px-4 py-3 font-bold">{p.colReference}</th>
                <th className="px-4 py-3 font-bold">{p.colMethod}</th>
                <th className="px-4 py-3 text-right font-bold">{p.colAmount}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{date(e.date)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${KIND_STYLE[e.kind]}`}>
                      {e.kind === "refund" && <Undo2 className="h-3 w-3" />}
                      {p.kind[e.kind]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={e.href} className="font-mono font-bold text-[#0B2545] hover:underline">
                      {e.reference}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.method[e.method]}</td>
                  <td className={`whitespace-nowrap px-4 py-3 text-right font-bold tabular-nums ${e.amountCents < 0 ? "text-emerald-700" : "text-slate-800"}`}>{m(e.amountCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

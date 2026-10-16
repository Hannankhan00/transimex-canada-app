"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, FileText, RefreshCw } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { formatCad } from "@/lib/shipping/core/money";
import type { ClientInvoiceDTO } from "@/lib/express/invoiceDto";
import type { CreditSummary } from "@/lib/express/credit";

const INVOICE_STATUS_STYLE: Record<string, string> = {
  issued: "bg-amber-50 text-amber-700 border-amber-200",
  overdue: "bg-red-50 text-red-700 border-red-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  void: "bg-slate-100 text-slate-600 border-slate-300",
};

export default function ExpressInvoicesPage() {
  const { t, language } = useLanguage();
  const v = t.express.invoices;
  const [invoices, setInvoices] = useState<ClientInvoiceDTO[] | null>(null);
  const [credit, setCredit] = useState<CreditSummary | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const res = await fetch("/api/express/invoices");
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error("load");
      setInvoices(data.invoices);
      setCredit(data.credit);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const m = (c: number) => formatCad(c, language);
  const date = (iso: string | null) => (iso ? new Intl.DateTimeFormat(language === "fr" ? "fr-CA" : "en-CA", { dateStyle: "medium" }).format(new Date(iso)) : "");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#0B2545]">{v.title}</h1>
        <p className="mt-1 text-sm text-slate-600">{v.subtitle}</p>
      </div>

      {credit && credit.limitCents != null && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
          <h2 className="text-sm font-bold text-[#0B2545]">{v.creditTitle}</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{v.limit}</p>
              <p className="text-lg font-extrabold tabular-nums text-[#0B2545]">{m(credit.limitCents)}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{v.used}</p>
              <p className="text-lg font-extrabold tabular-nums text-slate-800">{m(credit.usedCents)}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{v.available}</p>
              <p className="text-lg font-extrabold tabular-nums text-emerald-700">{m(credit.availableCents)}</p>
            </div>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100" role="img" aria-label={`${v.used}: ${m(credit.usedCents)} / ${m(credit.limitCents)}`}>
            <div className="h-2 rounded-full bg-[#0B2545]" style={{ width: `${credit.limitCents > 0 ? Math.min(100, Math.round((credit.usedCents / credit.limitCents) * 100)) : 0}%` }} />
          </div>
          {credit.overdueCount > 0 && (
            <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              {v.overdueBanner}
            </p>
          )}
        </section>
      )}

      {error ? (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm font-semibold text-red-600">{v.loadError}</p>
          <button type="button" onClick={load} className="cursor-pointer rounded-xl bg-[#0B2545] px-4 py-2 text-xs font-bold text-white">
            {t.express.retry}
          </button>
        </div>
      ) : invoices === null ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
          <RefreshCw className="h-4 w-4 animate-spin" />
          {t.express.loading}
        </div>
      ) : invoices.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <FileText className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">{v.empty}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-bold">{v.colNumber}</th>
                <th className="px-4 py-3 font-bold">{v.colIssued}</th>
                <th className="px-4 py-3 font-bold">{v.colDue}</th>
                <th className="px-4 py-3 text-right font-bold">{v.colAmount}</th>
                <th className="px-4 py-3 font-bold">{v.colStatus}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/express/invoices/${inv.id}`} className="font-mono font-bold text-[#0B2545] hover:underline">
                      {inv.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{date(inv.issuedAt)}</td>
                  <td className="px-4 py-3 text-slate-600">{date(inv.dueAt)}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{m(inv.totalCents)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${INVOICE_STATUS_STYLE[inv.status]}`}>{v.status[inv.status]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

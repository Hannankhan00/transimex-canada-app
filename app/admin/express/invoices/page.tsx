"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Loader2, Search } from "lucide-react";
import PermissionGuard from "@/components/admin/PermissionGuard";
import { ExpressAdminTabs, InvoiceStatusBadge, adminInput, formatDate, useTr } from "@/components/admin/express/expressAdminShared";
import { formatCad } from "@/lib/shipping/core/money";
import type { toAdminInvoiceDTO } from "@/lib/express/invoiceDto";

type Row = ReturnType<typeof toAdminInvoiceDTO>;
type Filter = "all" | "issued" | "overdue" | "paid" | "void";

interface Counts {
  issued: number;
  issuedCents: number;
  overdue: number;
  overdueCents: number;
  paid: number;
  void: number;
}

export default function AdminExpressInvoicesPage() {
  const { language, tr } = useTr();
  const [invoices, setInvoices] = useState<Row[]>([]);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("status", filter);
      if (query.trim()) params.set("q", query.trim());
      const res = await fetch(`/api/admin/express/invoices?${params}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load invoices");
      setInvoices(data.invoices);
      setCounts(data.counts);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filter, query]);

  useEffect(() => {
    const timer = setTimeout(load, query ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, query]);

  const runNow = async () => {
    if (!window.confirm(tr("Issue invoices now for every account with unbilled credit bookings?", "Émettre maintenant les factures de chaque compte ayant des réservations à crédit non facturées ?"))) return;
    setRunning(true);
    try {
      const res = await fetch("/api/admin/express/invoices/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "The run failed");
      setToast({
        text: data.issued
          ? tr(`${data.issued} invoice(s) issued, ${formatCad(data.totalCents, language)} in total`, `${data.issued} facture(s) émise(s), ${formatCad(data.totalCents, language)} au total`)
          : tr("Nothing to invoice", "Rien à facturer"),
        error: data.failed > 0,
      });
      await load();
    } catch (err: any) {
      setToast({ text: err.message, error: true });
    } finally {
      setRunning(false);
      setTimeout(() => setToast(null), 5000);
    }
  };

  const total = counts ? counts.issued + counts.overdue + counts.paid + counts.void : 0;
  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: tr("All", "Toutes"), count: total },
    { key: "overdue", label: tr("Overdue", "En retard"), count: counts?.overdue ?? 0 },
    { key: "issued", label: tr("Unpaid", "Impayées"), count: counts?.issued ?? 0 },
    { key: "paid", label: tr("Paid", "Payées"), count: counts?.paid ?? 0 },
    { key: "void", label: tr("Void", "Annulées"), count: counts?.void ?? 0 },
  ];

  return (
    <PermissionGuard module="express">
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-[#0B2545]">Transimex Express</h1>
            <p className="text-sm text-slate-600 mt-0.5">{tr("Weekly invoices for accounts that book on credit.", "Factures hebdomadaires des comptes qui réservent à crédit.")}</p>
          </div>
          <button
            type="button"
            onClick={runNow}
            disabled={running}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0B2545] hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-bold cursor-pointer"
          >
            {running && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {tr("Run invoicing now", "Lancer la facturation maintenant")}
          </button>
        </div>

        <ExpressAdminTabs />

        {toast && (
          <p role="status" className={`rounded-xl border px-4 py-3 text-sm font-semibold ${toast.error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
            {toast.text}
          </p>
        )}

        {counts && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{tr("Unpaid, not yet due", "Impayées, pas encore échues")}</p>
              <p className="mt-1 text-xl font-extrabold tabular-nums text-[#0B2545]">{formatCad(counts.issuedCents, language)}</p>
              <p className="text-[11px] text-slate-500">{counts.issued} {tr("invoices", "factures")}</p>
            </div>
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-red-700">{tr("Overdue", "En retard")}</p>
              <p className="mt-1 text-xl font-extrabold tabular-nums text-red-700">{formatCad(counts.overdueCents, language)}</p>
              <p className="text-[11px] text-red-700">{counts.overdue} {tr("invoices", "factures")}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer ${
                  filter === f.key ? "bg-[#0B2545] text-white border-[#0B2545]" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                }`}
              >
                {f.label} <span className="opacity-60 ml-0.5">{f.count}</span>
              </button>
            ))}
          </div>
          <div className="relative lg:ml-auto">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input className={`${adminInput} pl-9`} placeholder={tr("Search invoice number or client", "Rechercher numéro de facture ou client")} value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">{tr("Loading...", "Chargement...")}</div>
          ) : error ? (
            <div className="py-12 text-center text-xs text-red-600 font-semibold">
              {error}{" "}
              <button type="button" onClick={load} className="underline cursor-pointer">
                {tr("Retry", "Réessayer")}
              </button>
            </div>
          ) : invoices.length === 0 ? (
            <div className="py-14 text-center">
              <FileText className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="mt-2 text-xs text-slate-500">{tr("No invoices match this filter.", "Aucune facture ne correspond à ce filtre.")}</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {invoices.map((i) => (
                <li key={i.id}>
                  <Link href={`/admin/express/invoices/${i.id}`} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-4 hover:bg-slate-50 transition">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-sm text-[#0B2545]">{i.number}</span>
                        <InvoiceStatusBadge status={i.status} />
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 truncate">
                        {i.owner.companyName || i.owner.name} · {i.owner.email}
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-500 sm:text-right whitespace-nowrap">
                      <div className="font-bold text-slate-800 text-sm">{formatCad(i.totalCents, language)}</div>
                      {tr("Due", "Échéance")} {formatDate(i.dueAt, language)}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </PermissionGuard>
  );
}

"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Package, Search } from "lucide-react";
import PermissionGuard from "@/components/admin/PermissionGuard";
import { ExpressAdminTabs, ShipmentStatusBadge, adminInput, formatDate, useTr } from "@/components/admin/express/expressAdminShared";
import { formatCad } from "@/lib/shipping/core/money";
import type { toAdminShipmentDTO } from "@/lib/express/shipmentDto";

type Row = ReturnType<typeof toAdminShipmentDTO>;
type Filter = "all" | "attention" | "awaiting_payment" | "paid" | "label_ready" | "cancelled";

export default function AdminExpressShipmentsPage() {
  const { language, tr } = useTr();
  const [shipments, setShipments] = useState<Row[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("status", filter);
      if (query.trim()) params.set("q", query.trim());
      const res = await fetch(`/api/admin/express/shipments?${params}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load shipments");
      setShipments(data.shipments);
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

  const total = ["awaiting_payment", "paid", "label_ready", "cancelled"].reduce((a, k) => a + (counts[k] ?? 0), 0);
  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: tr("All", "Tous"), count: total },
    { key: "attention", label: tr("Needs attention", "À traiter"), count: counts.attention ?? 0 },
    { key: "awaiting_payment", label: tr("Awaiting payment", "En attente de paiement"), count: counts.awaiting_payment ?? 0 },
    { key: "paid", label: tr("Paid", "Payés"), count: counts.paid ?? 0 },
    { key: "label_ready", label: tr("Label ready", "Étiquette prête"), count: counts.label_ready ?? 0 },
    { key: "cancelled", label: tr("Cancelled", "Annulés"), count: counts.cancelled ?? 0 },
  ];

  return (
    <PermissionGuard module="express">
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0B2545]">Transimex Express</h1>
          <p className="text-sm text-slate-600 mt-0.5">{tr("Every Express booking, with its status and price.", "Toutes les réservations Express, avec leur statut et leur prix.")}</p>
        </div>

        <ExpressAdminTabs />

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
            <input
              className={`${adminInput} pl-9`}
              placeholder={tr("Search reference, recipient, client", "Rechercher référence, destinataire, client")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
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
          ) : shipments.length === 0 ? (
            <div className="py-14 text-center">
              <Package className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="mt-2 text-xs text-slate-500">{tr("No shipments match this filter.", "Aucun envoi ne correspond à ce filtre.")}</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {shipments.map((s) => (
                <li key={s.id}>
                  <Link href={`/admin/express/shipments/${s.id}`} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-4 hover:bg-slate-50 transition">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-sm text-[#0B2545]">{s.reference}</span>
                        <ShipmentStatusBadge status={s.status} />
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold uppercase">{s.accountType}</span>
                        {s.attention.length > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-700 text-[10px] font-bold">
                            <AlertTriangle className="w-3 h-3" />
                            {tr("Needs attention", "À traiter")}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 truncate">
                        {s.user.companyName || s.user.name} · {s.user.email} → {s.recipient.city}, {s.recipient.countryCode}
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-500 sm:text-right whitespace-nowrap">
                      <div className="font-bold text-slate-800 text-sm">{formatCad(s.totalCents, language)}</div>
                      {formatDate(s.createdAt, language)}
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

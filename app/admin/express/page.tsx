"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plane, Search } from "lucide-react";
import PermissionGuard from "@/components/admin/PermissionGuard";
import {
  AdminStatus,
  ExpressAdminTabs,
  StatusBadge,
  TypeBadge,
  adminInput,
  formatDate,
  useTr,
} from "@/components/admin/express/expressAdminShared";
import type { AdminAccountDTO } from "@/lib/express/accountDto";

type Filter = "all" | AdminStatus;

export default function AdminExpressApplicationsPage() {
  const { language, tr } = useTr();
  const [accounts, setAccounts] = useState<AdminAccountDTO[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<Filter>("pending");
  const [type, setType] = useState<"" | "b2c" | "b2b">("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("status", filter);
      if (type) params.set("type", type);
      if (query.trim()) params.set("q", query.trim());
      const res = await fetch(`/api/admin/express/accounts?${params}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load applications");
      setAccounts(data.accounts);
      setCounts(data.counts);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filter, type, query]);

  useEffect(() => {
    const timer = setTimeout(load, query ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, query]);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "pending", label: tr("Pending", "En attente"), count: counts.pending ?? 0 },
    { key: "active", label: tr("Active", "Actifs"), count: counts.active ?? 0 },
    { key: "rejected", label: tr("Rejected", "Rejetés"), count: counts.rejected ?? 0 },
    { key: "suspended", label: tr("Suspended", "Suspendus"), count: counts.suspended ?? 0 },
    { key: "all", label: tr("All", "Tous"), count: total },
  ];

  return (
    <PermissionGuard module="express">
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0B2545]">Transimex Express</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            {tr("Review applications, set discounts and manage Express accounts.", "Examinez les demandes, fixez les rabais et gérez les comptes Express.")}
          </p>
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
          <div className="flex gap-2 lg:ml-auto">
            <select className={`${adminInput} !w-auto`} value={type} onChange={(e) => setType(e.target.value as "" | "b2c" | "b2b")}>
              <option value="">{tr("All types", "Tous les types")}</option>
              <option value="b2b">B2B</option>
              <option value="b2c">B2C</option>
            </select>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                className={`${adminInput} pl-9`}
                placeholder={tr("Search name, company, email", "Rechercher nom, entreprise, courriel")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
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
          ) : accounts.length === 0 ? (
            <div className="py-14 text-center">
              <Plane className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="mt-2 text-xs text-slate-500">{tr("No accounts match this filter.", "Aucun compte ne correspond à ce filtre.")}</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {accounts.map((a) => (
                <li key={a.id}>
                  <Link href={`/admin/express/${a.id}`} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-4 hover:bg-slate-50 transition">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-[#0B2545] truncate">{a.company?.name || a.contactName}</span>
                        <TypeBadge type={a.type} />
                        <StatusBadge status={a.status} />
                        {a.shippingProfile && a.shippingProfile.shipsFor !== "own" && (
                          <span className="px-2 py-0.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-[10px] font-bold">{tr("Ships for clients", "Expédie pour des clients")}</span>
                        )}
                        {a.shippingProfile && a.shippingProfile.restrictedGoods.some((r) => r !== "none") && (
                          <span className="px-2 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-800 text-[10px] font-bold">{tr("Restricted goods", "Marchandises restreintes")}</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 truncate">
                        {a.contactName} · {a.user.email} · {a.country}
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-500 sm:text-right whitespace-nowrap">
                      {a.discountPct != null && <div className="font-bold text-slate-700">{a.discountPct}%</div>}
                      {formatDate(a.createdAt, language)}
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

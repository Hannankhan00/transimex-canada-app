"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ClientProfile, ClientAccountStatus } from "@/lib/mockData";
import ClientDataTable from "@/components/admin/clients/ClientDataTable";
import {
  Building2,
  Users,
  ShieldCheck,
  UserX,
  DollarSign,
  Download,
  RefreshCw,
  Plus,
} from "lucide-react";

export default function AdminClientsPage() {
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [counts, setCounts] = useState({ total: 0, active: 0, deactivated: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchClients = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch("/api/admin/clients");
      const data = await res.json();
      if (res.ok && data.clients) {
        setClients(data.clients);
        if (data.counts) {
          setCounts(data.counts);
        }
      }
    } catch (err) {
      console.error("Error fetching clients:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleStatusToggled = (clientId: string, newStatus: ClientAccountStatus) => {
    setClients((prev) =>
      prev.map((c) => (c.id === clientId ? { ...c, status: newStatus } : c))
    );
    setCounts((prev) => ({
      ...prev,
      active: newStatus === "Active" ? prev.active + 1 : prev.active - 1,
      deactivated: newStatus === "Deactivated" ? prev.deactivated + 1 : prev.deactivated - 1,
    }));
  };

  const totalRevenue = clients.reduce((acc, c) => {
    const val = parseFloat(c.lifetimeRevenueCad.replace(/[^0-9.]/g, "")) || 0;
    return acc + val;
  }, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#d21f27]">
              Commercial Enterprise Entities
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-mono font-bold">
              B2B REGISTRY
            </span>
          </div>
          <h1
            className="text-3xl sm:text-4xl font-bold text-[#0B2545] tracking-tight leading-tight mt-1"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Client Management Directory
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl">
            Centralized hub for overseeing registered B2B shippers, controlling client portal security access, and analyzing commercial trade accounts.
          </p>
        </div>

        {/* Action Bar */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchClients}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs transition cursor-pointer flex items-center gap-1.5"
            title="Refresh Directory"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const csvContent =
                "data:text/csv;charset=utf-8," +
                ["Client ID,Company,Contact,Email,Phone,Industry,Status,Revenue"]
                  .concat(
                    clients.map(
                      (c) =>
                        `"${c.id}","${c.companyName}","${c.primaryContact}","${c.email}","${c.phone}","${c.industry}","${c.status}","${c.lifetimeRevenueCad}"`
                    )
                  )
                  .join("\n");
              const encodedUri = encodeURI(csvContent);
              const link = document.createElement("a");
              link.setAttribute("href", encodedUri);
              link.setAttribute("download", `Transimex_Clients_${Date.now()}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#0B2545] shadow-2xs transition cursor-pointer flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-[#0B2545]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 2. HIGH LEVEL SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Accounts */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Corporate Accounts
            </span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-[#0B2545] flex items-center justify-center">
              <Building2 className="w-4 h-4 text-[#0B2545]" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#0B2545]">{counts.total}</span>
            <span className="text-xs font-semibold text-slate-500">Registered</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Verified commercial shipper entities</p>
        </div>

        {/* Active Accounts */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Active Portal Access
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#0B2545]">{counts.active}</span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Authorized
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Can book freight and download paperwork</p>
        </div>

        {/* Deactivated Accounts */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Deactivated / Suspended
            </span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#0B2545]">{counts.deactivated}</span>
            <span className="text-xs font-semibold text-slate-600">Restricted</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Login blocked pending credit review</p>
        </div>

        {/* Lifetime Pipeline Revenue */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Combined Client Spend
            </span>
            <div className="w-8 h-8 rounded-xl bg-red-50 text-[#d21f27] flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-[#0B2545] font-mono">
              ${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            <span className="text-[10px] font-bold text-[#d21f27]">CAD</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Total revenue generated across accounts</p>
        </div>
      </div>

      {/* 3. CLIENT DATA TABLE */}
      <ClientDataTable clients={clients} onStatusToggled={handleStatusToggled} />
    </div>
  );
}

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ClientProfile, ClientIndustry, ClientAccountStatus } from "@/lib/mockData";
import {
  Search,
  Building2,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  MoreVertical,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  UserX,
  UserCheck,
  CheckCircle2,
  Filter,
} from "lucide-react";

interface ClientDataTableProps {
  clients: ClientProfile[];
  onStatusToggled: (clientId: string, newStatus: ClientAccountStatus) => void;
}

const INDUSTRIES: { label: string; value: string }[] = [
  { label: "All Industries", value: "all" },
  { label: "Manufacturing", value: "Manufacturing" },
  { label: "Automotive", value: "Automotive" },
  { label: "Pharmaceutical", value: "Pharmaceutical" },
  { label: "Retail & Consumer", value: "Retail & Consumer" },
  { label: "Food & Cold-Chain", value: "Food & Cold-Chain" },
  { label: "Industrial & Energy", value: "Industrial & Energy" },
];

export default function ClientDataTable({
  clients,
  onStatusToggled,
}: ClientDataTableProps) {
  const [search, setSearch] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filteredClients = clients.filter((client) => {
    if (statusFilter !== "all" && client.status.toLowerCase() !== statusFilter.toLowerCase()) {
      return false;
    }
    if (selectedIndustry !== "all" && client.industry !== selectedIndustry) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      return (
        client.companyName.toLowerCase().includes(q) ||
        client.primaryContact.toLowerCase().includes(q) ||
        client.email.toLowerCase().includes(q) ||
        client.industry.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleToggleStatus = async (client: ClientProfile) => {
    const newStatus: ClientAccountStatus =
      client.status === "Active" ? "Deactivated" : "Active";
    setUpdatingId(client.id);
    setActiveMenuId(null);
    try {
      const res = await fetch(`/api/admin/clients/${encodeURIComponent(client.id)}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");

      onStatusToggled(client.id, newStatus);
      setNotificationMsg(
        `Client ${client.companyName} access is now ${newStatus === "Active" ? "ACTIVATED" : "DEACTIVATED"}.`
      );
      setTimeout(() => setNotificationMsg(null), 3500);
    } catch (err: any) {
      alert(err.message || "Failed to update client account status");
    } finally {
      setUpdatingId(null);
    }
  };

  const handlePasswordReset = (client: ClientProfile) => {
    setActiveMenuId(null);
    setNotificationMsg(
      `Password recovery dispatch triggered for ${client.email}. Client will receive institutional reset instructions.`
    );
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden space-y-0">
      {/* Toast Notification */}
      {notificationMsg && (
        <div className="p-3 bg-[#0B2545] text-white text-xs font-semibold flex items-center justify-between animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{notificationMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotificationMsg(null)}
            className="text-slate-300 hover:text-white text-[11px] underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter & Search Header */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              statusFilter === "all"
                ? "bg-[#0B2545] text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            All Accounts ({clients.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("active")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              statusFilter === "active"
                ? "bg-emerald-700 text-white shadow-xs"
                : "bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50"
            }`}
          >
            Active ({clients.filter((c) => c.status === "Active").length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("deactivated")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              statusFilter === "deactivated"
                ? "bg-slate-700 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            Deactivated ({clients.filter((c) => c.status === "Deactivated").length})
          </button>
        </div>

        {/* Industry Filter + Search */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          <select
            value={selectedIndustry}
            onChange={(e) => setSelectedIndustry(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-[#0B2545]"
          >
            {INDUSTRIES.map((ind) => (
              <option key={ind.value} value={ind.value}>
                {ind.label}
              </option>
            ))}
          </select>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search company, contact, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white border border-slate-200 focus:border-[#0B2545] rounded-xl pl-8 pr-3 py-2 text-xs text-slate-800 outline-none w-full sm:w-64 transition"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto min-h-[300px]">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th className="py-3.5 px-4">Company &amp; ID</th>
              <th className="py-3.5 px-4">Primary Contact</th>
              <th className="py-3.5 px-4">Industry Sector</th>
              <th className="py-3.5 px-4">Account Status</th>
              <th className="py-3.5 px-4">Lifetime Revenue</th>
              <th className="py-3.5 px-4">Registration</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-slate-700">
            {filteredClients.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                  No registered corporate clients match your filter criteria.
                </td>
              </tr>
            ) : (
              filteredClients.map((client) => {
                const isActive = client.status === "Active";
                const isMenuOpen = activeMenuId === client.id;

                return (
                  <tr key={client.id} className="hover:bg-slate-50/80 transition group">
                    {/* Company Name & ID */}
                    <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 text-[#0B2545] flex items-center justify-center font-bold text-xs">
                          <Building2 className="w-4 h-4 text-[#0B2545]" />
                        </div>
                        <div>
                          <Link
                            href={`/admin/clients/${encodeURIComponent(client.id)}`}
                            className="font-bold text-[#0B2545] hover:text-[#d21f27] transition block"
                          >
                            {client.companyName}
                          </Link>
                          <span className="font-mono text-[10px] text-slate-500 block">
                            {client.id} &bull; {client.city}, {client.province}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Primary Contact */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div>
                        <span className="font-bold text-slate-900 block">{client.primaryContact}</span>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {client.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Industry Sector */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold text-[11px] border border-slate-200">
                        {client.industry}
                      </span>
                    </td>

                    {/* Account Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 text-[10px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>Active Access</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-bold border border-slate-300 text-[10px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          <span>Deactivated</span>
                        </span>
                      )}
                    </td>

                    {/* Lifetime Revenue */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-slate-800">
                      {client.lifetimeRevenueCad}
                    </td>

                    {/* Registration Date */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 text-[11px]">
                      {client.registeredDate}
                    </td>

                    {/* Actions Menu */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-right relative">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/admin/clients/${encodeURIComponent(client.id)}`}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-[#0B2545] font-bold text-[11px] transition flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3 text-[#d21f27]" />
                          <span>360° Dossier</span>
                        </Link>

                        {/* Dropdown Toggle */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveMenuId(isMenuOpen ? null : client.id)
                            }
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          {isMenuOpen && (
                            <div className="absolute right-0 top-8 z-30 w-48 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 text-xs text-left animate-in fade-in duration-100">
                              <Link
                                href={`/admin/clients/${encodeURIComponent(client.id)}`}
                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-700 flex items-center gap-2 font-medium"
                                onClick={() => setActiveMenuId(null)}
                              >
                                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                                <span>Inspect 360° Profile</span>
                              </Link>

                              <button
                                type="button"
                                onClick={() => handleToggleStatus(client)}
                                className={`w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 flex items-center gap-2 font-medium cursor-pointer ${
                                  isActive ? "text-red-700" : "text-emerald-700"
                                }`}
                              >
                                {isActive ? (
                                  <>
                                    <UserX className="w-3.5 h-3.5 text-red-600" />
                                    <span>Deactivate Account</span>
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Activate Account</span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => handlePasswordReset(client)}
                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-700 flex items-center gap-2 font-medium cursor-pointer"
                              >
                                <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                                <span>Trigger Password Reset</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

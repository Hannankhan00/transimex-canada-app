"use client";

import React, { useState, useEffect, useCallback } from "react";
import SettingsNavTabs from "@/components/admin/settings/SettingsNavTabs";
import { AuditLogEntry, AuditActionType } from "@/lib/auditTypes";
import {
  ShieldAlert,
  Search,
  Download,
  Filter,
  RefreshCw,
  Clock,
  User,
  ShieldCheck,
  FileSpreadsheet,
  ArrowDownToLine,
  CheckCircle2,
} from "lucide-react";

export default function AdminAuditSettingsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [actionsList, setActionsList] = useState<string[]>([]);
  const [staffList, setStaffList] = useState<string[]>([]);
  const [selectedAction, setSelectedAction] = useState("all");
  const [selectedStaff, setSelectedStaff] = useState("all");
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchAuditLogs = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch("/api/admin/settings/audit");
      const data = await res.json();
      if (res.ok && data.logs) {
        setLogs(data.logs);
        if (data.filters) {
          setActionsList(data.filters.actions || []);
          setStaffList(data.filters.staffMembers || []);
        }
      }
    } catch (err) {
      console.error("Error loading audit logs:", err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const url = `/api/admin/export/audit?action=${encodeURIComponent(selectedAction)}&staff=${encodeURIComponent(selectedStaff)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to generate audit CSV export");

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `transimex_audit_ledger_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      alert(err.message || "Failed to download audit CSV");
    } finally {
      setExporting(false);
    }
  };

  const filteredLogs = logs.filter((l) => {
    if (selectedAction !== "all" && l.action.toLowerCase() !== selectedAction.toLowerCase()) {
      return false;
    }
    if (selectedStaff !== "all" && l.staffName.toLowerCase() !== selectedStaff.toLowerCase()) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      return (
        l.id.toLowerCase().includes(q) ||
        l.staffName.toLowerCase().includes(q) ||
        l.resourceId.toLowerCase().includes(q) ||
        l.details.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case "CUSTOMS_HOLD":
        return "bg-red-50 text-red-700 border-red-200";
      case "CUSTOMS_RELEASE":
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case "DUTIES_DISPATCHED":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "QUOTE_ACCEPTED":
        return "bg-blue-50 text-blue-800 border-blue-200";
      case "ACCESS_REVOKED":
        return "bg-slate-900 text-white";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#d21f27]">
              Regulatory Accountability &amp; Integrity
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-mono font-bold">
              IMMUTABLE AUDIT TRAIL
            </span>
          </div>
          <h1
            className="text-3xl sm:text-4xl font-bold text-[#0B2545] tracking-tight leading-tight mt-1"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            System Activity Audit Log
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl">
            A permanent, tamper-proof chronological ledger recording regulatory actions, rate assignments, and security adjustments across the platform.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchAuditLogs}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs transition cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh Ledger</span>
          </button>

          <button
            type="button"
            disabled={exporting}
            onClick={handleExportCsv}
            className="px-4 py-2 bg-[#0B2545] hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            <ArrowDownToLine className="w-3.5 h-3.5 text-[#d21f27]" />
            <span>{exporting ? "Generating..." : "Export Audit CSV"}</span>
          </button>
        </div>
      </div>

      {/* 2. SUB-NAVIGATION TABS */}
      <SettingsNavTabs />

      {/* 3. AUDIT LOG DATA TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Table Filters */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Action Type Filter */}
            <div>
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none"
              >
                <option value="all">All Action Categories</option>
                {actionsList.map((act) => (
                  <option key={act} value={act}>
                    {act}
                  </option>
                ))}
              </select>
            </div>

            {/* Staff Actor Filter */}
            <div>
              <select
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none"
              >
                <option value="all">All Staff Actors</option>
                {staffList.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search resource ref, staff, audit note..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white border border-slate-200 focus:border-[#0B2545] rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 outline-none w-full sm:w-64 transition"
            />
          </div>
        </div>

        {/* Audit Table (Preserved on Desktop) */}
        <div className="hidden md:block overflow-x-auto min-h-[360px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Staff Member &amp; Role</th>
                <th className="py-3.5 px-4">Action Performed</th>
                <th className="py-3.5 px-4">Target Resource</th>
                <th className="py-3.5 px-4">Audit Details</th>
                <th className="py-3.5 px-4 text-right">Origin Gateway</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    No activity logs match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition">
                    {/* Timestamp */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-slate-500">
                      {log.timestamp}
                    </td>

                    {/* Staff & Role */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-bold text-slate-900 block">{log.staffName}</span>
                      <span className="text-[11px] text-slate-500">{log.staffRole}</span>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${getActionBadgeColor(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>

                    {/* Target Resource */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-[#0B2545]">
                      <span className="text-[10px] font-sans text-slate-400 font-normal block">
                        {log.resourceType}
                      </span>
                      {log.resourceId}
                    </td>

                    {/* Audit Details */}
                    <td className="py-3.5 px-4 max-w-md text-slate-700 leading-relaxed">
                      {log.details}
                    </td>

                    {/* IP Gateway */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-right font-mono text-[11px] text-slate-400">
                      {log.ipAddress}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View for Audit Ledger */}
        <div className="block md:hidden divide-y divide-slate-100">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No activity logs match the selected filters.
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] text-slate-500">{log.timestamp}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${getActionBadgeColor(
                      log.action
                    )}`}
                  >
                    {log.action}
                  </span>
                </div>

                <div>
                  <span className="font-bold text-slate-900">{log.staffName}</span>{" "}
                  <span className="text-[11px] text-slate-500 font-medium">({log.staffRole})</span>
                </div>

                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-[11px] text-slate-700 leading-relaxed">
                  <div className="font-mono font-bold text-[#0B2545] mb-0.5">
                    {log.resourceType}: {log.resourceId}
                  </div>
                  <p>{log.details}</p>
                </div>

                <div className="text-right font-mono text-[10px] text-slate-400">
                  IP Gateway: {log.ipAddress}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

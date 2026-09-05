"use client";

import React, { useState, useMemo } from "react";
import { CarrierVendor, TransportModeType } from "@/lib/carrierTypes";
import {
  Truck,
  Ship,
  Plane,
  Train,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Search,
  Star,
  Phone,
  Mail,
  Edit2,
  Calendar,
  AlertTriangle,
  Layers,
} from "lucide-react";

interface CarrierDataTableProps {
  carriers: CarrierVendor[];
  onEditCarrier: (carrier: CarrierVendor) => void;
}

export default function CarrierDataTable({
  carriers,
  onEditCarrier,
}: CarrierDataTableProps) {
  const [activeTab, setActiveTab] = useState<"All" | TransportModeType>("All");
  const [search, setSearch] = useState("");

  const modeIcon = (mode: TransportModeType) => {
    switch (mode) {
      case "Road":
        return <Truck className="w-4 h-4 text-blue-600" />;
      case "Sea":
        return <Ship className="w-4 h-4 text-cyan-600" />;
      case "Air":
        return <Plane className="w-4 h-4 text-sky-600" />;
      case "Rail":
        return <Train className="w-4 h-4 text-amber-600" />;
    }
  };

  const filteredCarriers = useMemo(() => {
    return carriers.filter((c) => {
      if (activeTab !== "All" && c.primaryMode !== activeTab) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        return (
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          c.dispatchContact.name.toLowerCase().includes(q) ||
          c.headquarters.toLowerCase().includes(q) ||
          c.operatingLanes.some((lane) => lane.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [carriers, activeTab, search]);

  const isInsuranceExpiringSoon = (expiryDate: string) => {
    const expiry = new Date(expiryDate).getTime();
    const now = new Date().getTime();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    return expiry - now < thirtyDaysMs;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden space-y-0">
      {/* Category Tabs & Search */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Mode Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(["All", "Road", "Sea", "Air", "Rail"] as const).map((mode) => {
            const count =
              mode === "All"
                ? carriers.length
                : carriers.filter((c) => c.primaryMode === mode).length;
            const isActive = activeTab === mode;

            return (
              <button
                key={mode}
                type="button"
                onClick={() => setActiveTab(mode)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? "bg-[#0B2545] text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span>
                  {mode === "All" ? "All Modes" : `${mode}`}
                </span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search carrier, corridor, contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white border border-slate-200 focus:border-[#0B2545] rounded-xl pl-8 pr-3 py-2 text-xs text-slate-800 outline-none w-full sm:w-64 transition"
          />
        </div>
      </div>

      {/* Carrier Table (Preserved on Desktop) */}
      <div className="hidden md:block overflow-x-auto min-h-[300px]">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th className="py-3.5 px-4">Carrier Company &amp; SCAC</th>
              <th className="py-3.5 px-4">Primary Mode</th>
              <th className="py-3.5 px-4">Dispatch Contact</th>
              <th className="py-3.5 px-4">Operating Corridors</th>
              <th className="py-3.5 px-4">Reliability Rating</th>
              <th className="py-3.5 px-4">Insurance &amp; Compliance</th>
              <th className="py-3.5 px-4 text-right">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-slate-700">
            {filteredCarriers.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                  No logistics carriers match your filter criteria.
                </td>
              </tr>
            ) : (
              filteredCarriers.map((carrier) => {
                const expiringSoon = isInsuranceExpiringSoon(carrier.insurance.expiryDate);

                return (
                  <tr key={carrier.id} className="hover:bg-slate-50/80 transition group">
                    {/* Name & Code */}
                    <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                          {modeIcon(carrier.primaryMode)}
                        </div>
                        <div>
                          <span className="font-bold text-[#0B2545] block">{carrier.name}</span>
                          <span className="font-mono text-[10px] text-slate-500 block">
                            SCAC: {carrier.code} &bull; HQ: {carrier.headquarters}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Primary Mode */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 font-semibold text-slate-700 text-[11px] border border-slate-200">
                        {carrier.primaryMode} Freight
                      </span>
                    </td>

                    {/* Dispatch Contact */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div>
                        <span className="font-bold text-slate-900 block">
                          {carrier.dispatchContact.name}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span className="flex items-center gap-1 font-mono">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {carrier.dispatchContact.phone}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block truncate max-w-[160px]">
                          {carrier.dispatchContact.email}
                        </span>
                      </div>
                    </td>

                    {/* Operating Corridors */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {carrier.operatingLanes.map((lane, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium whitespace-nowrap"
                          >
                            {lane}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Reliability Rating */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center text-amber-500">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span className="ml-1 font-bold text-xs text-slate-800">
                            {carrier.rating.toFixed(1)}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({carrier.totalShipmentsCompleted} loads &bull; {carrier.onTimeDeliveryRate})
                        </span>
                      </div>
                    </td>

                    {/* Insurance & Compliance */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div>
                        {expiringSoon ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 font-bold text-[10px]">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>Expiring Soon ({carrier.insurance.expiryDate})</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[10px]">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>Compliant ({carrier.insurance.coverageAmount})</span>
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                          Pol: {carrier.insurance.policyNumber}
                        </span>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-right">
                      <button
                        type="button"
                        onClick={() => onEditCarrier(carrier)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-[#0B2545] hover:text-white text-slate-700 font-bold text-[11px] transition cursor-pointer inline-flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View for Carriers */}
      <div className="block md:hidden divide-y divide-slate-100">
        {filteredCarriers.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No carriers match your criteria.
          </div>
        ) : (
          filteredCarriers.map((carrier) => {
            const expiringSoon = isInsuranceExpiringSoon(carrier.insurance.expiryDate);

            return (
              <div key={carrier.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                      {modeIcon(carrier.primaryMode)}
                    </div>
                    <div>
                      <span className="font-bold text-[#0B2545] text-xs block">{carrier.name}</span>
                      <span className="font-mono text-[10px] text-slate-500">
                        SCAC: {carrier.code} &bull; {carrier.headquarters}
                      </span>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-full bg-slate-100 font-semibold text-slate-700 text-[10px] border border-slate-200">
                    {carrier.primaryMode}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center text-amber-500">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="ml-1 font-bold text-slate-800">{carrier.rating.toFixed(1)}</span>
                    <span className="text-[10px] text-slate-400 ml-1">({carrier.onTimeDeliveryRate})</span>
                  </div>

                  {expiringSoon ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 font-bold text-[10px]">
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      <span>Expiring Soon</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[10px]">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>Compliant</span>
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
                  <div className="font-semibold text-slate-900">{carrier.dispatchContact.name}</div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span>{carrier.dispatchContact.phone}</span>
                    <span>{carrier.dispatchContact.email}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {carrier.operatingLanes.map((lane, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium"
                    >
                      {lane}
                    </span>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => onEditCarrier(carrier)}
                    className="w-full justify-center px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-[#0B2545] hover:text-white text-slate-700 font-bold text-xs transition cursor-pointer inline-flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Carrier Partner</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

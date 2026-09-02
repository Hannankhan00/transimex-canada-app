"use client";

import React, { useState, useEffect, useCallback } from "react";
import { CarrierVendor, TransportModeType } from "@/lib/mockData";
import CarrierDataTable from "@/components/admin/carriers/CarrierDataTable";
import CarrierModal from "@/components/admin/carriers/CarrierModal";
import {
  Truck,
  Ship,
  Plane,
  Train,
  ShieldAlert,
  ShieldCheck,
  Plus,
  RefreshCw,
  Star,
  CheckCircle2,
} from "lucide-react";

export default function AdminCarriersPage() {
  const [carriers, setCarriers] = useState<CarrierVendor[]>([]);
  const [counts, setCounts] = useState({ all: 0, road: 0, sea: 0, air: 0, rail: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [carrierToEdit, setCarrierToEdit] = useState<CarrierVendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fetchCarriers = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch("/api/admin/carriers");
      const data = await res.json();
      if (res.ok && data.carriers) {
        setCarriers(data.carriers);
        if (data.counts) {
          setCounts(data.counts);
        }
      }
    } catch (err) {
      console.error("Error loading carriers:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCarriers();
  }, [fetchCarriers]);

  const handleOpenCreateModal = () => {
    setCarrierToEdit(null);
    setIsModalOpen(true);
  };

  const handleEditCarrier = (carrier: CarrierVendor) => {
    setCarrierToEdit(carrier);
    setIsModalOpen(true);
  };

  const handleCarrierSaved = (savedCarrier: CarrierVendor) => {
    setCarriers((prev) => {
      const exists = prev.findIndex((c) => c.id === savedCarrier.id);
      if (exists !== -1) {
        const copy = [...prev];
        copy[exists] = savedCarrier;
        return copy;
      }
      return [savedCarrier, ...prev];
    });

    setToastMsg(`Carrier ${savedCarrier.name} successfully updated.`);
    setTimeout(() => setToastMsg(null), 3500);
    fetchCarriers();
  };

  const expiringCount = carriers.filter((c) => {
    const expiry = new Date(c.insurance.expiryDate).getTime();
    const now = new Date().getTime();
    return expiry - now < 30 * 24 * 60 * 60 * 1000;
  }).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#d21f27]">
              Subcontractor Network &amp; Fleet Operations
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-mono font-bold">
              VERIFIED LOGISTICS PARTNERS
            </span>
          </div>
          <h1
            className="text-3xl sm:text-4xl font-bold text-[#0B2545] tracking-tight leading-tight mt-1"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Carrier &amp; Vendor Directory
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl">
            Directory of certified multi-modal carriers, dedicated freight sub-contractors, operating corridors, and regulatory insurance compliance audits.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchCarriers}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs transition cursor-pointer flex items-center gap-1.5"
            title="Refresh Directory"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-4 py-2 bg-[#0B2545] hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-[#d21f27]" />
            <span>Add Carrier Partner</span>
          </button>
        </div>
      </div>

      {toastMsg && (
        <div className="p-3.5 bg-[#0B2545] text-white rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 2. SUMMARY METRIC TILES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Carriers */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Contracted Partners
            </span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-[#0B2545] flex items-center justify-center">
              <Truck className="w-4 h-4 text-[#0B2545]" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#0B2545]">{carriers.length}</span>
            <span className="text-xs font-semibold text-emerald-600">Active Authorities</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Vetted road, rail, air, and marine fleets</p>
        </div>

        {/* Highway Road Carriers */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Highway Road Fleets
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#0B2545]">
              {carriers.filter((c) => c.primaryMode === "Road").length}
            </span>
            <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              Dry Van &amp; Reefer
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Cross-border highway linehaul capacity</p>
        </div>

        {/* Intermodal & Marine Carriers */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Rail &amp; Ocean Lines
            </span>
            <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <Train className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#0B2545]">
              {carriers.filter((c) => c.primaryMode === "Rail" || c.primaryMode === "Sea").length}
            </span>
            <span className="text-xs font-semibold text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-200">
              Heavy Freight
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Container rail terminals &amp; maritime shipping</p>
        </div>

        {/* Compliance Warning */}
        <div
          className={`rounded-2xl p-5 border shadow-2xs ${
            expiringCount > 0 ? "bg-amber-50/70 border-amber-300" : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
              Compliance Expiry Warnings
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-amber-900">{expiringCount}</span>
            <span className="text-xs font-semibold text-amber-700">Policies Expiring &lt; 30d</span>
          </div>
          <p className="text-[11px] text-slate-600 mt-1">Requires updated certificate of insurance</p>
        </div>
      </div>

      {/* 3. CARRIER DATA TABLE */}
      <CarrierDataTable carriers={carriers} onEditCarrier={handleEditCarrier} />

      {/* Create / Edit Modal */}
      <CarrierModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        carrierToEdit={carrierToEdit}
        onCarrierSaved={handleCarrierSaved}
      />
    </div>
  );
}

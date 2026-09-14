"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { CarrierVendor } from "@/lib/carrierTypes";
import CarrierDataTable from "@/components/admin/carriers/CarrierDataTable";
import CarrierModal from "@/components/admin/carriers/CarrierModal";
import PermissionGuard from "@/components/admin/PermissionGuard";
import {
  Truck,
  Train,
  ShieldAlert,
  Plus,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";

export default function AdminCarriersPage() {
  const { language } = useLanguage();
  const [carriers, setCarriers] = useState<CarrierVendor[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [carrierToEdit, setCarrierToEdit] = useState<CarrierVendor | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchCarriers = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch("/api/admin/carriers");
      const data = await res.json();
      if (res.ok && data.carriers) {
        setCarriers(data.carriers);
      }
    } catch (err) {
      console.error("Error loading carriers:", err);
    } finally {
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

    setToastMsg(
      language === "fr"
        ? `Transporteur ${savedCarrier.name} mis à jour avec succès.`
        : `Carrier ${savedCarrier.name} successfully updated.`
    );
    setTimeout(() => setToastMsg(null), 3500);
    fetchCarriers();
  };

  const handleDeleteCarrier = async (carrier: CarrierVendor) => {
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/admin/carriers/${encodeURIComponent(carrier.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete carrier");
      }

      setCarriers((prev) => prev.filter((c) => c.id !== carrier.id));
      setToastMsg(
        language === "fr"
          ? `Transporteur ${carrier.name} supprimé du répertoire.`
          : `Carrier ${carrier.name} removed from the directory.`
      );
      setTimeout(() => setToastMsg(null), 3500);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete carrier");
      setTimeout(() => setErrorMsg(null), 5000);
    }
  };

  const expiringCount = carriers.filter((c) => {
    const expiry = new Date(c.insurance.expiryDate).getTime();
    const now = new Date().getTime();
    return expiry - now < 30 * 24 * 60 * 60 * 1000;
  }).length;

  return (
    <PermissionGuard module="carriers">
      <div className="space-y-8 animate-in fade-in duration-200">
        {/* 1. HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#d21f27]">
              {language === "fr" ? "Réseau de Sous-Traitants et Opérations de Flotte" : "Subcontractor Network & Fleet Operations"}
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0B2545] tracking-tight leading-tight mt-1">
              {language === "fr" ? "Répertoire des Transporteurs et Fournisseurs" : "Carrier & Vendor Directory"}
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl">
              {language === "fr"
                ? "Répertoire des transporteurs multimodaux, sous-traitants de fret, corridors d'exploitation et audits de conformité d'assurance."
                : "Directory of certified multi-modal carriers, dedicated freight sub-contractors, operating corridors, and regulatory insurance compliance audits."}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={fetchCarriers}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs transition cursor-pointer flex items-center gap-1.5"
              title={language === "fr" ? "Actualiser le Répertoire" : "Refresh Directory"}
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? "animate-spin" : ""}`} />
              <span>{language === "fr" ? "Actualiser" : "Refresh"}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-4 py-2 bg-[#0B2545] hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-[#d21f27]" />
              <span>{language === "fr" ? "Ajouter un Partenaire Transporteur" : "Add Carrier Partner"}</span>
            </button>
          </div>
        </div>

        {toastMsg && (
          <div className="p-3.5 bg-[#0B2545] text-white rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
            <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 2. SUMMARY METRIC TILES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Carriers */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {language === "fr" ? "Partenaires Contractés" : "Contracted Partners"}
              </span>
              <div className="w-8 h-8 rounded-xl bg-slate-100 text-[#0B2545] flex items-center justify-center">
                <Truck className="w-4 h-4 text-[#0B2545]" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#0B2545]">{carriers.length}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {language === "fr" ? "Flottes routières, ferroviaires, aériennes et maritimes" : "Vetted road, rail, air, and marine fleets"}
            </p>
          </div>

          {/* Highway Road Carriers */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {language === "fr" ? "Flottes Routières" : "Highway Road Fleets"}
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
                {language === "fr" ? "Fourgon Sec et Frigo" : "Dry Van & Reefer"}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {language === "fr" ? "Capacité de transport routier transfrontalier" : "Cross-border highway linehaul capacity"}
            </p>
          </div>

          {/* Intermodal & Marine Carriers */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {language === "fr" ? "Lignes Ferroviaires et Maritimes" : "Rail & Ocean Lines"}
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
                {language === "fr" ? "Fret Lourd" : "Heavy Freight"}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {language === "fr" ? "Terminaux ferroviaires à conteneurs et transport maritime" : "Container rail terminals & maritime shipping"}
            </p>
          </div>

          {/* Compliance Warning */}
          <div
            className={`rounded-2xl p-5 border shadow-2xs ${
              expiringCount > 0 ? "bg-amber-50/70 border-amber-300" : "bg-white border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-[11px] font-bold uppercase tracking-wider ${
                  expiringCount > 0 ? "text-amber-800" : "text-slate-500"
                }`}
              >
                {language === "fr" ? "Alertes d'Expiration de Conformité" : "Compliance Expiry Warnings"}
              </span>
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  expiringCount > 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-400"
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className={`text-3xl font-bold ${expiringCount > 0 ? "text-amber-900" : "text-[#0B2545]"}`}>
                {expiringCount}
              </span>
              <span className={`text-xs font-semibold ${expiringCount > 0 ? "text-amber-700" : "text-slate-500"}`}>
                {language === "fr" ? "Polices Expirant < 30j" : "Policies Expiring < 30d"}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-1">
              {language === "fr" ? "Nécessite un certificat d'assurance mis à jour" : "Requires updated certificate of insurance"}
            </p>
          </div>
        </div>

        {/* 3. CARRIER DATA TABLE */}
        <CarrierDataTable
          carriers={carriers}
          onEditCarrier={handleEditCarrier}
          onDeleteCarrier={handleDeleteCarrier}
        />

        {/* Create / Edit Modal */}
        <CarrierModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          carrierToEdit={carrierToEdit}
          onCarrierSaved={handleCarrierSaved}
        />
      </div>
    </PermissionGuard>
  );
}

"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import CustomsStatusBadge from "@/components/admin/customs/CustomsStatusBadge";
import PermissionGuard from "@/components/admin/PermissionGuard";
import {
  Search,
  Shield,
  ArrowRight,
  MapPin,
  AlertTriangle,
} from "lucide-react";

interface AdminShipmentItem {
  id: string;
  origin: string;
  destination: string;
  equipment: string;
  driver: string;
  carrier: string;
  status: "in_transit" | "customs" | "delivered" | "pending" | "cancelled";
  customsStatus: "Pending" | "In Review" | "Released" | "Held";
  customsPars?: string;
  broker?: string;
  eta: string;
  date: string;
}

interface ShipmentCounts {
  total: number;
  activeInTransit: number;
  customsHolds: number;
  completedThisMonth: number;
  active: number;
}

export default function AdminShipmentsDirectoryPage() {
  const { language } = useLanguage();
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [shipments, setShipments] = useState<AdminShipmentItem[]>([]);
  const [counts, setCounts] = useState<ShipmentCounts>({
    total: 0,
    activeInTransit: 0,
    customsHolds: 0,
    completedThisMonth: 0,
    active: 0,
  });
  const [loading, setLoading] = useState(true);
  const tableRef = useRef<HTMLDivElement>(null);

  const loadShipments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/shipments");
      const data = await res.json();
      if (res.ok && data.success) {
        setShipments(
          (data.shipments || []).map((s: any) => ({
            id: s.id,
            origin: s.origin,
            destination: s.destination,
            equipment: s.equipment,
            driver: s.driver,
            carrier: s.carrier,
            status: s.status,
            customsStatus: s.customsStatus,
            customsPars: s.customsPars,
            broker: s.broker,
            eta: s.eta,
            date: s.date,
          }))
        );
        if (data.counts) setCounts(data.counts);
      }
    } catch {
      // Keep last known list on failure
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadShipments();
  }, [loadShipments]);

  const heldShipments = useMemo(
    () => shipments.filter((s) => s.customsStatus === "Held" || s.status === "customs"),
    [shipments]
  );

  const filteredShipments = useMemo(() => {
    return shipments.filter((s) => {
      if (filter === "customs" && s.customsStatus !== "Held" && s.status !== "customs") return false;
      if (filter === "in_transit" && s.status !== "in_transit") return false;
      if (filter === "delivered" && s.status !== "delivered") return false;

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        return (
          s.id.toLowerCase().includes(q) ||
          s.origin.toLowerCase().includes(q) ||
          s.destination.toLowerCase().includes(q) ||
          s.equipment.toLowerCase().includes(q) ||
          s.driver.toLowerCase().includes(q) ||
          (s.customsPars && s.customsPars.toLowerCase().includes(q)) ||
          (s.broker && s.broker.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [shipments, filter, search]);

  const handleReviewUrgentHold = () => {
    setFilter("customs");
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <PermissionGuard module="shipments">
      <div className="space-y-8 animate-in fade-in duration-200">
        {/* 1. HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#d21f27]">
              {language === "fr" ? "Gestion de la Flotte et de la Répartition" : "Fleet & Dispatch Management"}
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0B2545] tracking-tight leading-tight mt-1">
              {language === "fr" ? "Fret et Expéditions Actifs" : "Active Freight & Shipments"}
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              {language === "fr"
                ? "Suivi des unités routières actives, des trains intermodaux et des dédouanements frontaliers."
                : "Real-time tracking of active highway corridor units, intermodal trains, and border customs clearances."}
            </p>
          </div>

          {heldShipments.length > 0 && (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleReviewUrgentHold}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>
                  {language === "fr"
                    ? `Réviser ${heldShipments.length} Blocage(s) Douanier(s) Urgent(s)`
                    : `Review ${heldShipments.length} Urgent Customs Hold${heldShipments.length > 1 ? "s" : ""}`}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* 2. SUMMARY COUNTER TILES */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {language === "fr" ? "Fret Actif en Transit" : "Active Freight in Transit"}
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#0B2545]">{counts.activeInTransit}</span>
              <span className="text-xs font-semibold text-emerald-600">
                {language === "fr" ? "Route et Rail" : "On Highway & Rail"}
              </span>
            </div>
          </div>

          <div
            className={`bg-white p-5 rounded-2xl shadow-2xs ${
              counts.customsHolds > 0 ? "border-2 border-red-200" : "border border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  counts.customsHolds > 0 ? "text-red-700" : "text-slate-500"
                }`}
              >
                {language === "fr" ? "Blocages Douaniers Frontaliers" : "Border Customs Holds"}
              </span>
              {counts.customsHolds > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold">
                  {language === "fr" ? "URGENT" : "URGENT"}
                </span>
              )}
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className={`text-3xl font-bold ${counts.customsHolds > 0 ? "text-[#d21f27]" : "text-[#0B2545]"}`}>
                {counts.customsHolds}
              </span>
              <span className={`text-xs font-semibold ${counts.customsHolds > 0 ? "text-red-700" : "text-slate-500"}`}>
                {language === "fr" ? "Inspection Secondaire ASFC" : "CBSA Secondary Exam"}
              </span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {language === "fr" ? "Livraisons Complétées" : "Completed Deliveries"}
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-800">{counts.completedThisMonth}</span>
              <span className="text-xs font-semibold text-slate-500">
                {language === "fr" ? "Ce Mois-ci" : "This Month"}
              </span>
            </div>
          </div>
        </div>

        {/* 3. TABLE FILTER BAR */}
        <div ref={tableRef} className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  filter === "all" ? "bg-[#0B2545] text-white shadow-xs" : "bg-white text-slate-600 border border-slate-200"
                }`}
              >
                {language === "fr" ? "Tous les Manifestes" : "All Manifests"}
              </button>
              <button
                type="button"
                onClick={() => setFilter("customs")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  filter === "customs" ? "bg-red-600 text-white shadow-xs" : "bg-white text-red-600 border border-red-200"
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{language === "fr" ? "Inspection et Blocages Douaniers" : "Customs Inspection & Holds"}</span>
              </button>
              <button
                type="button"
                onClick={() => setFilter("in_transit")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  filter === "in_transit" ? "bg-[#0B2545] text-white shadow-xs" : "bg-white text-slate-600 border border-slate-200"
                }`}
              >
                {language === "fr" ? "En Transit" : "In Transit"}
              </button>
              <button
                type="button"
                onClick={() => setFilter("delivered")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  filter === "delivered" ? "bg-[#0B2545] text-white shadow-xs" : "bg-white text-slate-600 border border-slate-200"
                }`}
              >
                {language === "fr" ? "Livré" : "Delivered"}
              </button>
            </div>

            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder={
                  language === "fr"
                    ? "Rechercher manifeste, PARS, chauffeur, corridor..."
                    : "Search manifest, PARS, driver, corridor..."
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-slate-200 focus:border-[#0B2545] rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 outline-none transition"
              />
            </div>
          </div>

          {/* SHIPMENTS TABLE */}
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4">{language === "fr" ? "N° de Suivi" : "Tracking ID"}</th>
                  <th className="py-3.5 px-4">{language === "fr" ? "Corridor d'Itinéraire" : "Route Corridor"}</th>
                  <th className="py-3.5 px-4">{language === "fr" ? "Équipement et Transporteur" : "Equipment & Carrier"}</th>
                  <th className="py-3.5 px-4">{language === "fr" ? "Statut Douanier" : "Customs Status"}</th>
                  <th className="py-3.5 px-4">{language === "fr" ? "Entrée PARS / Courtier" : "PARS Entry / Broker"}</th>
                  <th className="py-3.5 px-4">{language === "fr" ? "ETA" : "ETA"}</th>
                  <th className="py-3.5 px-4 text-right">{language === "fr" ? "Action de Conformité" : "Compliance Action"}</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400 text-xs">
                      {language === "fr" ? "Chargement des expéditions..." : "Loading shipments..."}
                    </td>
                  </tr>
                ) : filteredShipments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400 text-xs">
                      {language === "fr" ? "Aucune expédition ne correspond à ce filtre." : "No shipments match this filter."}
                    </td>
                  </tr>
                ) : (
                  filteredShipments.map((shipment) => (
                    <tr key={shipment.id} className="hover:bg-slate-50/80 transition">
                      {/* Tracking ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <span className="text-[#0B2545] font-bold">{shipment.id}</span>
                      </td>

                      {/* Route Corridor */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-medium">
                          <span>{shipment.origin}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span>{shipment.destination}</span>
                        </div>
                      </td>

                      {/* Equipment & Carrier */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div>
                          <span className="font-semibold text-slate-900 block">{shipment.equipment}</span>
                          <span className="text-[11px] text-slate-500">{shipment.carrier}</span>
                        </div>
                      </td>

                      {/* Customs Clearance Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <CustomsStatusBadge status={shipment.customsStatus} size="sm" />
                      </td>

                      {/* PARS / Broker */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div>
                          {shipment.customsPars ? (
                            <span className="font-mono font-bold text-slate-800 text-[11px] block">
                              {shipment.customsPars}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px] block">
                              {language === "fr" ? "Non Assigné" : "Unassigned"}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500">{shipment.broker}</span>
                        </div>
                      </td>

                      {/* ETA */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 text-[11px]">
                        {shipment.eta}
                      </td>

                      {/* Compliance Action */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <Link
                          href={`/admin/shipments/${encodeURIComponent(shipment.id)}/customs`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0B2545] hover:bg-[#d21f27] text-white rounded-xl text-xs font-bold shadow-2xs transition"
                        >
                          <Shield className="w-3.5 h-3.5" />
                          <span>{language === "fr" ? "Centre Douanier" : "Customs Center"}</span>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List (Phones View) */}
          <div className="block md:hidden divide-y divide-slate-100">
            {loading ? (
              <div className="p-10 text-center text-slate-400 text-xs">
                {language === "fr" ? "Chargement des expéditions..." : "Loading shipments..."}
              </div>
            ) : filteredShipments.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs">
                {language === "fr" ? "Aucune expédition ne correspond à ce filtre." : "No shipments match this filter."}
              </div>
            ) : (
              filteredShipments.map((shipment) => (
                <div key={shipment.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-[#0B2545] text-sm">{shipment.id}</span>
                    <CustomsStatusBadge status={shipment.customsStatus} size="sm" />
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-800 font-semibold">
                    <MapPin className="w-3.5 h-3.5 text-[#d21f27] flex-shrink-0" />
                    <span>{shipment.origin}</span>
                    <span className="text-slate-400">→</span>
                    <span>{shipment.destination}</span>
                  </div>

                  <div className="text-[11px] text-slate-500">
                    <span className="font-medium text-slate-700">{shipment.equipment}</span> &bull; {shipment.carrier}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      PARS:{" "}
                      <strong className="font-mono text-slate-800">
                        {shipment.customsPars || (language === "fr" ? "Aucun" : "None")}
                      </strong>
                    </span>
                    <span>
                      ETA: <strong className="text-slate-800">{shipment.eta}</strong>
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                    <Link
                      href={`/admin/shipments/${encodeURIComponent(shipment.id)}/customs`}
                      className="w-full justify-center inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0B2545] hover:bg-[#d21f27] text-white rounded-xl text-xs font-bold shadow-2xs transition"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>{language === "fr" ? "Ouvrir le Centre Douanier" : "Open Customs Center"}</span>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </PermissionGuard>
  );
}

"use client";

import React, { useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  Truck,
  Search,
  Filter,
  ArrowUpRight,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Download,
} from "lucide-react";

export default function ShipmentsPage() {
  const { t, language } = useLanguage();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const shipments = [
    {
      id: "TMX-00847",
      origin: "Montreal Hub, QC",
      destination: "Toronto Distribution Center, ON",
      equipment: "53' Dry Van",
      driver: "Jean D. (Unit #402)",
      status: "in_transit",
      statusLabel: language === "fr" ? "En Transit" : "In Transit",
      date: "Today, 08:30 AM",
      eta: "Today, 04:15 PM",
      progress: 68,
      bol: "BOL-994821",
    },
    {
      id: "TMX-00842",
      origin: "Quebec City Port, QC",
      destination: "Detroit Corridor Hub, MI",
      equipment: "Refrigerated Reefer (-18°C)",
      driver: "Marc V. (Unit #118)",
      status: "in_transit",
      statusLabel: language === "fr" ? "En Transit" : "In Transit",
      date: "Yesterday",
      eta: "Tomorrow, 09:00 AM",
      progress: 42,
      bol: "BOL-994815",
    },
    {
      id: "TMX-00839",
      origin: "Dorval Terminal, QC",
      destination: "Calgary Logistics Center, AB",
      equipment: "Intermodal Rail",
      driver: "Canadian Pacific Rail Line",
      status: "customs",
      statusLabel: language === "fr" ? "Dédouanement" : "CBSA Customs Inspection",
      date: "Sep 01, 2026",
      eta: "Sep 04, 2026",
      progress: 25,
      bol: "BOL-994801",
    },
    {
      id: "TMX-00810",
      origin: "Ottawa Valley Hub, ON",
      destination: "Montreal Port Berth 42, QC",
      equipment: "53' Flatbed Heavy",
      driver: "Robert L. (Unit #509)",
      status: "delivered",
      statusLabel: language === "fr" ? "Livré" : "Delivered",
      date: "Aug 30, 2026",
      eta: "Delivered",
      progress: 100,
      bol: "BOL-994760",
    },
  ];

  const filteredShipments = shipments.filter((s) => {
    if (filter !== "all" && s.status !== filter) return false;
    if (search && !s.id.toLowerCase().includes(search.toLowerCase()) && !s.destination.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#d21f27]">
            {language === "fr" ? "Gestion de Fret" : "Freight Manifests"}
          </span>
          <h1
            className="text-2xl sm:text-3xl font-bold text-[#0B2545] tracking-tight leading-tight mt-1"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {t.nav.shipments}
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            {language === "fr"
              ? "Suivi télématique par satellite GPS et connaissements en direct."
              : "Live GPS telematics tracking, driver dispatch, and digital Bill of Lading (BOL)."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>{language === "fr" ? "Exporter Manifeste" : "Export Manifest"}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={language === "fr" ? "Rechercher TMX-#, ville, connaissement..." : "Search TMX-#, city, BOL..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {[
            { id: "all", label: language === "fr" ? "Tous" : "All" },
            { id: "in_transit", label: language === "fr" ? "En Transit" : "In Transit" },
            { id: "customs", label: language === "fr" ? "Douanes" : "Customs Hold" },
            { id: "delivered", label: language === "fr" ? "Livrées" : "Delivered" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                filter === tab.id
                  ? "bg-[#0B2545] text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Shipments List */}
      <div className="space-y-3.5">
        {filteredShipments.map((shipment) => (
          <div
            key={shipment.id}
            className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition flex flex-col lg:flex-row lg:items-center justify-between gap-4"
          >
            {/* Left: ID & Route */}
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-[#0B2545] font-mono">{shipment.id}</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    shipment.status === "in_transit"
                      ? "bg-blue-100 text-blue-800"
                      : shipment.status === "customs"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {shipment.statusLabel}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">BOL: {shipment.bol}</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-xs text-slate-700">
                <div className="flex items-center gap-1.5 font-semibold">
                  <MapPin className="w-3.5 h-3.5 text-[#d21f27]" />
                  <span>{shipment.origin}</span>
                  <span className="text-slate-400">→</span>
                  <span className="text-slate-900">{shipment.destination}</span>
                </div>
                <div className="text-slate-500 flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-slate-400" />
                  <span>{shipment.equipment}</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full max-w-md pt-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                  <span>Transit Progress ({shipment.progress}%)</span>
                  <span>ETA: {shipment.eta}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      shipment.status === "delivered" ? "bg-emerald-500" : "bg-[#d21f27]"
                    }`}
                    style={{ width: `${shipment.progress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Right: Driver & Actions */}
            <div className="flex items-center justify-between lg:justify-end gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
              <div className="text-right text-xs hidden sm:block">
                <div className="font-semibold text-slate-900">{shipment.driver}</div>
                <div className="text-[11px] text-slate-400">{shipment.date}</div>
              </div>
              <button
                type="button"
                onClick={() => alert(`Showing telemetry details for ${shipment.id}`)}
                className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1"
              >
                <span>Details</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

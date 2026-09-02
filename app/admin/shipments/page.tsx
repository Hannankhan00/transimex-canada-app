"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import CustomsStatusBadge from "@/components/admin/customs/CustomsStatusBadge";
import {
  Truck,
  Search,
  Filter,
  Shield,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  MapPin,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Plus,
} from "lucide-react";

interface AdminShipmentItem {
  id: string;
  origin: string;
  destination: string;
  equipment: string;
  driver: string;
  carrier: string;
  status: "in_transit" | "customs" | "delivered" | "pending";
  customsStatus: "Pending" | "In Review" | "Released" | "Held";
  customsPars?: string;
  broker?: string;
  eta: string;
  date: string;
  progress: number;
}

export default function AdminShipmentsDirectoryPage() {
  const { language } = useLanguage();
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const shipments: AdminShipmentItem[] = [
    {
      id: "TMX-00839",
      origin: "Dorval Terminal, QC",
      destination: "Calgary Logistics Center, AB",
      equipment: "Intermodal Rail (Container)",
      driver: "Canadian Pacific Rail Line",
      carrier: "CP Rail Freight Corridors",
      status: "customs",
      customsStatus: "Held",
      customsPars: "PARS-8849-QC",
      broker: "Livingston International",
      eta: "Sep 04, 2026",
      date: "Sep 01, 2026",
      progress: 25,
    },
    {
      id: "TMX-00847",
      origin: "Montreal Hub, QC",
      destination: "Toronto Distribution Center, ON",
      equipment: "53' Tandem Dry Van",
      driver: "Jean D. (Unit #402)",
      carrier: "Transimex Dedicated Highway Fleet",
      status: "in_transit",
      customsStatus: "Released",
      customsPars: "PARS-9948-ON",
      broker: "Transimex In-House Brokerage",
      eta: "Today, 04:15 PM",
      date: "Today, 08:30 AM",
      progress: 68,
    },
    {
      id: "TMX-00842",
      origin: "Quebec City Port, QC",
      destination: "Detroit Corridor Hub, MI",
      equipment: "53' Temp-Controlled Reefer (-18°C)",
      driver: "Marc V. (Unit #118)",
      carrier: "Transimex Cold-Chain Logistics",
      status: "customs",
      customsStatus: "In Review",
      customsPars: "PARS-7721-NY",
      broker: "FedEx Trade Networks",
      eta: "Tomorrow, 09:00 AM",
      date: "Yesterday",
      progress: 42,
    },
    {
      id: "TMX-00810",
      origin: "Ottawa Valley Hub, ON",
      destination: "Montreal Port Berth 42, QC",
      equipment: "53' Flatbed Heavy Haul",
      driver: "Robert L. (Unit #509)",
      carrier: "Transimex Heavy Equipment Transport",
      status: "delivered",
      customsStatus: "Released",
      customsPars: "PARS-4410-QC",
      broker: "Cole International",
      eta: "Delivered",
      date: "Aug 30, 2026",
      progress: 100,
    },
    {
      id: "TMX-00855",
      origin: "Dorval Terminal, QC",
      destination: "Halifax Port, NS",
      equipment: "48' Stepdeck Heavy Haul",
      driver: "Assigned Dispatch Fleet #302",
      carrier: "Swift Canadian Haulers",
      status: "in_transit",
      customsStatus: "Pending",
      broker: "Transimex In-House Brokerage",
      eta: "Sep 05, 2026",
      date: "Sep 02, 2026",
      progress: 15,
    },
  ];

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

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#d21f27]">
              Fleet &amp; Dispatch Management
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-mono font-bold">
              BORDER EDI ACTIVE
            </span>
          </div>
          <h1
            className="text-3xl sm:text-4xl font-bold text-[#0B2545] tracking-tight leading-tight mt-1"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Active Freight &amp; Shipments
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Real-time tracking of active highway corridor units, intermodal trains, and border customs clearances.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/shipments/TMX-00839/customs"
            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5 animate-pulse"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Review Urgent Customs Hold (TMX-00839)</span>
          </Link>
        </div>
      </div>

      {/* 2. SUMMARY COUNTER TILES */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active Freight in Transit</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#0B2545]">24</span>
            <span className="text-xs font-semibold text-emerald-600">On Highway &amp; Rail</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border-2 border-red-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider">Border Customs Holds</span>
            <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold">URGENT</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#d21f27]">3</span>
            <span className="text-xs font-semibold text-red-700">CBSA Secondary Exam</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Completed Deliveries</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-800">182</span>
            <span className="text-xs font-semibold text-slate-500">This Month</span>
          </div>
        </div>
      </div>

      {/* 3. TABLE FILTER BAR */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                filter === "all" ? "bg-[#0B2545] text-white shadow-xs" : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              All Manifests
            </button>
            <button
              type="button"
              onClick={() => setFilter("customs")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                filter === "customs" ? "bg-red-600 text-white shadow-xs" : "bg-white text-red-600 border border-red-200"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Customs Inspection &amp; Holds</span>
            </button>
            <button
              type="button"
              onClick={() => setFilter("in_transit")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                filter === "in_transit" ? "bg-[#0B2545] text-white shadow-xs" : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              In Transit
            </button>
            <button
              type="button"
              onClick={() => setFilter("delivered")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                filter === "delivered" ? "bg-[#0B2545] text-white shadow-xs" : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              Delivered
            </button>
          </div>

          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search manifest, PARS, driver, corridor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-200 focus:border-[#0B2545] rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 outline-none transition"
            />
          </div>
        </div>

        {/* SHIPMENTS TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4">Tracking ID</th>
                <th className="py-3.5 px-4">Route Corridor</th>
                <th className="py-3.5 px-4">Equipment &amp; Carrier</th>
                <th className="py-3.5 px-4">Customs Status</th>
                <th className="py-3.5 px-4">PARS Entry / Broker</th>
                <th className="py-3.5 px-4">ETA</th>
                <th className="py-3.5 px-4 text-right">Compliance Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredShipments.map((shipment) => (
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
                        <span className="text-slate-400 italic text-[11px] block">Unassigned</span>
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
                      <span>Customs Center</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

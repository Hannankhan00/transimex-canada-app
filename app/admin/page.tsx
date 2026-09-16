"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  Truck,
  FileText,
  AlertTriangle,
  Mail,
  LifeBuoy,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  TrendingUp,
  ChevronRight,
  Shield,
  Users,
  RefreshCw,
  X,
} from "lucide-react";

import { getRolePreset } from "@/lib/rbac";
import CarrierAssignModal from "@/components/admin/shipments/CarrierAssignModal";
import { CarrierVendor, FleetUnit } from "@/lib/carrierTypes";

interface MetricData {
  newQuotesCount: number;
  newQuotesToday: number;
  newQuotesValueCad: number;
  activeShipmentsCount: number;
  activeCorridorsCount: number;
  customsHoldsCount: number;
  customsHoldPorts: string[];
  unreadInquiriesCount: number;
  unreadFreightQuoteCount: number;
  openTicketsCount: number;
  urgentTicketsCount: number;
}

interface ActivityItem {
  id: string;
  category: "shipment" | "quote" | "customs" | "inquiry" | "ticket";
  title: string;
  titleFr: string;
  detail: string;
  detailFr: string;
  time: string;
  timestamp: string;
  actor: string;
  statusText: string;
  statusType: "success" | "warning" | "danger" | "info" | "neutral";
  actionLink?: string;
  referenceId?: string;
}

interface StaffDutyItem {
  id: string;
  name: string;
  email: string;
  role: string;
  jobTitle?: string;
  department?: string;
  permissions?: string[];
  status?: string;
}

export default function AdminOperationsPage() {
  const router = useRouter();
  const { language } = useLanguage();

  // Metrics State
  const [metrics, setMetrics] = useState<MetricData>({
    newQuotesCount: 0,
    newQuotesToday: 0,
    newQuotesValueCad: 0,
    activeShipmentsCount: 0,
    activeCorridorsCount: 0,
    customsHoldsCount: 0,
    customsHoldPorts: [],
    unreadInquiriesCount: 0,
    unreadFreightQuoteCount: 0,
    openTicketsCount: 0,
    urgentTicketsCount: 0,
  });

  // Activity Feed Filter
  const [activityFilter, setActivityFilter] = useState<
    "all" | "shipment" | "quote" | "customs" | "inquiry" | "ticket"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Active Staff Roster
  const [staffList, setStaffList] = useState<StaffDutyItem[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  // Quick New Shipment Modal
  const [isShipmentModalOpen, setIsShipmentModalOpen] = useState(false);
  const [shipmentSuccess, setShipmentSuccess] = useState(false);
  const [shipmentSubmitting, setShipmentSubmitting] = useState(false);
  const [shipmentError, setShipmentError] = useState<string | null>(null);
  const [newOrigin, setNewOrigin] = useState("Montreal, QC (Hub)");
  const [newDestination, setNewDestination] = useState("Detroit, MI (Cross-Border)");
  const [newFreightMode, setNewFreightMode] = useState("53' Temperature-Controlled Reefer");
  const [newCarrier, setNewCarrier] = useState("Transimex Express Fleet #402");
  const [newCarrierId, setNewCarrierId] = useState("");
  const [newUnitId, setNewUnitId] = useState("");
  const [newDriverName, setNewDriverName] = useState("");
  const [newVehicleType, setNewVehicleType] = useState("");
  const [newPlateNumber, setNewPlateNumber] = useState("");
  const [isCarrierPickerOpen, setIsCarrierPickerOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientCompany, setNewClientCompany] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newCommodity, setNewCommodity] = useState("");
  const [newWeight, setNewWeight] = useState("");
  const [newRateCad, setNewRateCad] = useState("");

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  const loadStaff = useCallback(async () => {
    setLoadingStaff(true);
    try {
      const res = await fetch("/api/admin/staff");
      const data = await res.json();
      if (res.ok && data.staff) {
        setStaffList(data.staff);
      }
    } catch {
      // Fallback
    } finally {
      setLoadingStaff(false);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoadingDashboard(true);
    try {
      const res = await fetch("/api/admin/dashboard/metrics");
      const data = await res.json();
      if (res.ok && data.success) {
        setMetrics(data.metrics);
        setActivities(data.activities || []);
      }
    } catch {
      // Keep last known metrics/activities on failure
    } finally {
      setLoadingDashboard(false);
    }
  }, []);

  useEffect(() => {
    loadStaff();
    loadDashboard();
  }, [loadStaff, loadDashboard]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    Promise.all([loadDashboard(), loadStaff()]).finally(() => {
      setIsRefreshing(false);
    });
  };

  const handleQuickShipmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShipmentError(null);
    setShipmentSubmitting(true);

    try {
      const res = await fetch("/api/admin/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: newClientName,
          clientCompany: newClientCompany,
          clientEmail: newClientEmail,
          origin: newOrigin,
          destination: newDestination,
          transportMode: newFreightMode,
          equipment: newFreightMode,
          weight: newWeight,
          commodity: newCommodity,
          rateCad: newRateCad,
          carrierId: newCarrierId || undefined,
          unitId: newUnitId || undefined,
          assignedCarrier: newCarrier,
          driverName: newDriverName || undefined,
          vehicleType: newVehicleType || undefined,
          plateNumber: newPlateNumber || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create shipment");
      }

      setShipmentSuccess(true);
      // Refresh real metrics/activity feed now that the shipment exists in the DB
      await loadDashboard();

      setTimeout(() => {
        setShipmentSuccess(false);
        setIsShipmentModalOpen(false);
        setNewClientName("");
        setNewClientCompany("");
        setNewClientEmail("");
        setNewCommodity("");
        setNewWeight("");
        setNewRateCad("");
        setNewCarrierId("");
        setNewUnitId("");
        setNewDriverName("");
        setNewVehicleType("");
        setNewPlateNumber("");
      }, 1200);
    } catch (err: any) {
      setShipmentError(err.message || "Failed to create shipment");
    } finally {
      setShipmentSubmitting(false);
    }
  };

  // Filtered activities
  const filteredActivities = activities.filter((act) => {
    const matchesCategory = activityFilter === "all" || act.category === activityFilter;
    const matchesSearch =
      searchQuery === "" ||
      act.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      act.detail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      act.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (act.referenceId && act.referenceId.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 1. OPERATIONS OVERVIEW HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#d21f27]">
              {language === "fr" ? "Centre de Commandement & Répartition" : "Operations Command & Dispatch Center"}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-mono font-bold">
              EST 24/7
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0B2545] tracking-tight leading-tight mt-1">
            {language === "fr" ? "Aperçu des Opérations" : "Operations Overview"}
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            {language === "fr"
              ? "Supervision en direct de la flotte transfrontalière, tarification des soumissions et conformité douanière ASFC."
              : "Live real-time command of active freight corridors, quote pricing pipeline, and CBSA customs clearance."}
          </p>
        </div>

        {/* Quick Actions Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loadingDashboard}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            title={language === "fr" ? "Actualiser les Indicateurs" : "Refresh Live Metrics"}
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing || loadingDashboard ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{language === "fr" ? "Actualiser" : "Refresh"}</span>
          </button>

          <button
            type="button"
            onClick={() => router.push("/admin/staff")}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#0B2545] shadow-2xs transition cursor-pointer flex items-center gap-1.5"
          >
            <Shield className="w-3.5 h-3.5 text-[#d21f27]" />
            <span>{language === "fr" ? "Gestion du Personnel (RBAC)" : "Manage Staff (RBAC)"}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsShipmentModalOpen(true)}
            className="px-4 py-2 bg-[#d21f27] hover:bg-[#b51a21] text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{language === "fr" ? "Nouveau Fret Express" : "Create Shipment"}</span>
          </button>
        </div>
      </div>

      {/* 2. REAL-TIME 5 HIGH-LEVEL OPERATIONAL METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {/* Card 1: New Quotes */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs hover:shadow-md transition group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {language === "fr" ? "Nouvelles Soumissions" : "New Quotes"}
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <FileText className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-[#0B2545]">{metrics.newQuotesCount}</span>
            {metrics.newQuotesToday > 0 && (
              <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" /> +{metrics.newQuotesToday}
              </span>
            )}
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px]">
            <span className="text-slate-500 truncate min-w-0">
              {metrics.newQuotesValueCad > 0
                ? `$${metrics.newQuotesValueCad.toLocaleString("en-US", { maximumFractionDigits: 0 })} CAD`
                : language === "fr"
                ? "Aucune valeur"
                : "No priced value"}
            </span>
            <Link
              href="/admin/quotes"
              className="text-[#d21f27] font-bold hover:underline flex items-center gap-0.5 flex-shrink-0"
            >
              {language === "fr" ? "Voir" : "Review"} <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Card 2: Active Shipments */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs hover:shadow-md transition group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {language === "fr" ? "Fret en Transit" : "Active Shipments"}
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <Truck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-[#0B2545]">{metrics.activeShipmentsCount}</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px]">
            <span className="text-slate-500 truncate min-w-0">
              {metrics.activeCorridorsCount} {language === "fr" ? "corridors" : "corridors"}
            </span>
            <Link
              href="/admin/shipments"
              className="text-[#0B2545] font-bold hover:underline flex items-center gap-0.5 flex-shrink-0"
            >
              {language === "fr" ? "Suivi" : "Track"} <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Card 3: Customs Holds */}
        <div
          className={`bg-white rounded-xl p-4 shadow-xs hover:shadow-md transition group ${
            metrics.customsHoldsCount > 0 ? "border border-red-200" : "border border-slate-200/90"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider ${
                metrics.customsHoldsCount > 0 ? "text-red-700" : "text-slate-500"
              }`}
            >
              {language === "fr" ? "Blocages Douanes" : "Customs Holds"}
            </span>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                metrics.customsHoldsCount > 0 ? "bg-red-100 text-[#d21f27]" : "bg-slate-100 text-slate-400"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className={`text-2xl font-bold ${metrics.customsHoldsCount > 0 ? "text-[#d21f27]" : "text-[#0B2545]"}`}>
              {metrics.customsHoldsCount}
            </span>
            {metrics.customsHoldsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-bold">
                {language === "fr" ? "ACTION REQUISE" : "ACTION REQUIRED"}
              </span>
            )}
          </div>
          <div
            className={`mt-2 pt-2 border-t flex items-center justify-between gap-2 text-[11px] ${
              metrics.customsHoldsCount > 0 ? "border-red-100" : "border-slate-100"
            }`}
          >
            <span
              className={`truncate min-w-0 ${metrics.customsHoldsCount > 0 ? "text-red-700" : "text-slate-500"}`}
              title={metrics.customsHoldPorts.join(" & ")}
            >
              {metrics.customsHoldPorts.length > 0
                ? metrics.customsHoldPorts.slice(0, 2).join(" & ")
                : language === "fr"
                ? "Aucun blocage"
                : "No active holds"}
            </span>
            <Link
              href="/admin/shipments?filter=customs"
              className={`font-bold hover:underline flex items-center gap-0.5 flex-shrink-0 ${
                metrics.customsHoldsCount > 0 ? "text-red-700" : "text-[#0B2545]"
              }`}
            >
              {language === "fr" ? "Résoudre" : "Resolve"} <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Card 4: Unread Inquiries */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs hover:shadow-md transition group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {language === "fr" ? "Demandes Non Lues" : "Unread Inquiries"}
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
              <Mail className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-[#0B2545]">{metrics.unreadInquiriesCount}</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px]">
            <span className="text-slate-500 truncate min-w-0">
              {metrics.unreadFreightQuoteCount}{" "}
              {language === "fr" ? "demandes de fret" : "freight RFQs"}
            </span>
            <Link
              href="/admin/messages"
              className="text-[#0B2545] font-bold hover:underline flex items-center gap-0.5 flex-shrink-0"
            >
              {language === "fr" ? "Ouvrir" : "View"} <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Card 5: Open Tickets */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs hover:shadow-md transition group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {language === "fr" ? "Billets de Support" : "Open Tickets"}
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
              <LifeBuoy className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-[#0B2545]">{metrics.openTicketsCount}</span>
            {metrics.urgentTicketsCount > 0 && (
              <span className="text-[11px] font-semibold text-amber-600">
                {metrics.urgentTicketsCount} {language === "fr" ? "urgent(s)" : "urgent"}
              </span>
            )}
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <Link
              href="/admin/support"
              className="text-[#0B2545] font-bold hover:underline flex items-center gap-0.5 ml-auto"
            >
              {language === "fr" ? "Répondre" : "Respond"} <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* 3. RECENT ACTIVITY FEED & LIVE DISPATCH LOG */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Feed Column (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6">
            {/* Feed Header with Filter Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-[#0B2545]">
                  {language === "fr" ? "Journal d'Activité en Temps Réel" : "Recent Operational Activity"}
                </h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  {language === "fr"
                    ? "Historique chronologique des actions et statuts sur l'ensemble du système."
                    : "Chronological audit trail of all dispatch events, quote decisions, and carrier actions."}
                </p>
              </div>
            </div>

            {/* Search & Category Filter Pills */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 pt-3 pb-1">
              <div className="relative flex-1 min-w-0 sm:max-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={language === "fr" ? "Rechercher l'activité..." : "Search activity..."}
                  className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-[#0B2545] rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                {(
                  [
                    { key: "all", label: language === "fr" ? "Tous" : "All" },
                    { key: "shipment", label: language === "fr" ? "Expéditions" : "Shipments" },
                    { key: "quote", label: language === "fr" ? "Soumissions" : "Quotes" },
                    { key: "customs", label: language === "fr" ? "Douanes" : "Customs" },
                    { key: "inquiry", label: language === "fr" ? "Demandes" : "Inquiries" },
                    { key: "ticket", label: language === "fr" ? "Billets" : "Tickets" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActivityFilter(tab.key)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      activityFilter === tab.key
                        ? "bg-[#0B2545] text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Activities List */}
            <div className="divide-y divide-slate-100 mt-2">
              {filteredActivities.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  {language === "fr" ? "Aucune activité trouvée pour ce filtre." : "No activity logs match this filter."}
                </div>
              ) : (
                filteredActivities.map((act) => {
                  const isDanger = act.statusType === "danger";
                  const isWarning = act.statusType === "warning";
                  const isSuccess = act.statusType === "success";

                  return (
                    <div
                      key={act.id}
                      className="py-4 flex items-start justify-between gap-4 hover:bg-slate-50/70 transition px-2 rounded-xl"
                    >
                      <div className="flex items-start gap-3.5">
                        {/* Status Icon Marker */}
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            isDanger
                              ? "bg-red-100 text-[#d21f27]"
                              : isWarning
                              ? "bg-amber-100 text-amber-700"
                              : isSuccess
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {act.category === "customs" ? (
                            <AlertTriangle className="w-4 h-4" />
                          ) : act.category === "quote" ? (
                            <FileText className="w-4 h-4" />
                          ) : act.category === "ticket" ? (
                            <LifeBuoy className="w-4 h-4" />
                          ) : act.category === "inquiry" ? (
                            <Mail className="w-4 h-4" />
                          ) : (
                            <Truck className="w-4 h-4" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-900">
                              {language === "fr" ? act.titleFr : act.title}
                            </span>
                            {act.referenceId && (
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                                {act.referenceId}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            {language === "fr" ? act.detailFr : act.detail}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                            <span className="flex items-center gap-1 font-medium text-slate-500">
                              <Users className="w-3 h-3" /> {act.actor}
                            </span>
                            <span>&bull;</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {act.time}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Status Pill */}
                      <div className="flex-shrink-0 text-right">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            isDanger
                              ? "bg-red-100 text-red-800 border border-red-200"
                              : isWarning
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : isSuccess
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-blue-100 text-blue-800 border border-blue-200"
                          }`}
                        >
                          {act.statusText}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Operations Side Column (1 col) */}
        <div className="space-y-6">
          {/* Operations & Dispatch Staff On Duty */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <h3 className="font-bold text-[#0B2545] text-sm">
                    {language === "fr" ? "Équipe des Opérations en Service" : "Dispatch Staff on Duty"}
                  </h3>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {staffList.filter((s) => s.status !== "revoked").length}{" "}
                  {language === "fr" ? "personnels autorisés actifs" : "active operational staff"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push("/admin/staff")}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-[#0B2545] hover:text-white text-slate-700 transition cursor-pointer"
                title={language === "fr" ? "Gérer le Personnel & RBAC" : "Manage Staff & RBAC"}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              {staffList.filter((s) => s.status !== "revoked").length === 0 && !loadingStaff && (
                <p className="text-[11px] text-slate-400 text-center py-2">
                  {language === "fr" ? "Aucun personnel actif enregistré." : "No active staff on record yet."}
                </p>
              )}
              {staffList
                .filter((adm) => adm.status !== "revoked")
                .slice(0, 5)
                .map((adm) => {
                  const preset = getRolePreset(adm.role);
                  return (
                    <div
                      key={adm.id || adm.email}
                      className="p-2.5 bg-slate-50/70 hover:bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-[#0B2545] text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                          {adm.name
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 leading-tight truncate">{adm.name}</p>
                          <p className="text-[10px] text-slate-500 truncate">{adm.department || adm.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${preset.badgeClass}`}
                        >
                          {language === "fr" ? preset.titleFr : preset.titleEn}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>

            <Link
              href="/admin/staff"
              className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs font-bold text-[#0B2545] hover:text-[#d21f27] transition group"
            >
              <span>{language === "fr" ? "Gérer les Accès & Rôles (RBAC) →" : "Manage All Staff & Access (RBAC) →"}</span>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#d21f27] transition" />
            </Link>
          </div>
        </div>
      </div>

      {/* Modal: Create New Shipment */}
      {isShipmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-100 text-[#d21f27] flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[#0B2545] text-base">
                    {language === "fr" ? "Créer un Nouvel Envoi de Fret" : "Dispatch New Freight Shipment"}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {language === "fr" ? "Saisie rapide de répartition" : "Quick dispatch entry"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsShipmentModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {shipmentSuccess ? (
              <div className="p-6 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
                <h4 className="font-bold text-slate-900">
                  {language === "fr" ? "Envoi Répartis avec Succès" : "Shipment Dispatched Successfully"}
                </h4>
                <p className="text-xs text-slate-500">
                  {language === "fr"
                    ? "Manifeste généré et assigné à la flotte de transporteurs."
                    : "Manifest generated and assigned to carrier fleet."}
                </p>
              </div>
            ) : (
              <form onSubmit={handleQuickShipmentSubmit} className="space-y-4 text-xs">
                {shipmentError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
                    {shipmentError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      {language === "fr" ? "Nom du Client" : "Client Name"}
                    </label>
                    <input
                      type="text"
                      required
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#0B2545] focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      {language === "fr" ? "Entreprise du Client" : "Client Company"}
                    </label>
                    <input
                      type="text"
                      required
                      value={newClientCompany}
                      onChange={(e) => setNewClientCompany(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#0B2545] focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    {language === "fr" ? "Courriel du Client" : "Client Email"}
                  </label>
                  <input
                    type="email"
                    required
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#0B2545] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    {language === "fr" ? "Terminal d'Origine" : "Origin Terminal"}
                  </label>
                  <input
                    type="text"
                    required
                    value={newOrigin}
                    onChange={(e) => setNewOrigin(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#0B2545] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    {language === "fr" ? "Installation de Destination" : "Destination Facility"}
                  </label>
                  <input
                    type="text"
                    required
                    value={newDestination}
                    onChange={(e) => setNewDestination(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#0B2545] focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      {language === "fr" ? "Équipement / Mode" : "Equipment / Mode"}
                    </label>
                    <select
                      value={newFreightMode}
                      onChange={(e) => setNewFreightMode(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#0B2545] focus:bg-white"
                    >
                      <option value="53' Temperature-Controlled Reefer">53' Temp Reefer (-18°C)</option>
                      <option value="53' Tandem Dry Van">53' Tandem Dry Van</option>
                      <option value="48' Stepdeck Heavy Haul">48' Stepdeck Heavy Haul</option>
                      <option value="53' Intermodal Rail">53' Intermodal Rail</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      {language === "fr" ? "Transporteur / Flotte Assigné" : "Assigned Carrier / Fleet"}
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCarrierPickerOpen(true)}
                      className="w-full text-left bg-slate-50 border border-slate-200 hover:border-[#0B2545] rounded-xl px-3 py-2 text-xs text-slate-800 outline-none transition cursor-pointer"
                    >
                      <span className="font-semibold">{newCarrier || (language === "fr" ? "Sélectionner un transporteur..." : "Select a saved carrier...")}</span>
                      {(newDriverName || newVehicleType || newPlateNumber) && (
                        <span className="block text-[10px] text-slate-500 mt-0.5">
                          {[newDriverName, newVehicleType, newPlateNumber].filter(Boolean).join(" • ")}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      {language === "fr" ? "Marchandise" : "Commodity"}
                    </label>
                    <input
                      type="text"
                      required
                      value={newCommodity}
                      onChange={(e) => setNewCommodity(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#0B2545] focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      {language === "fr" ? "Poids" : "Weight"}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={language === "fr" ? "ex. 12 500 kg" : "e.g. 12,500 kg"}
                      value={newWeight}
                      onChange={(e) => setNewWeight(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#0B2545] focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      {language === "fr" ? "Tarif (CAD)" : "Rate (CAD)"}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={language === "fr" ? "ex. 4 200" : "e.g. 4,200"}
                      value={newRateCad}
                      onChange={(e) => setNewRateCad(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#0B2545] focus:bg-white"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsShipmentModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  >
                    {language === "fr" ? "Annuler" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    disabled={shipmentSubmitting}
                    className="px-4 py-2 bg-[#d21f27] hover:bg-[#b51a21] text-white rounded-xl font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {shipmentSubmitting
                      ? language === "fr"
                        ? "Répartition..."
                        : "Dispatching..."
                      : language === "fr"
                      ? "Répartir l'Envoi"
                      : "Dispatch Load"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <CarrierAssignModal
        isOpen={isCarrierPickerOpen}
        onClose={() => setIsCarrierPickerOpen(false)}
        onAssign={(carrier: CarrierVendor, unit: FleetUnit) => {
          setNewCarrier(carrier.name);
          setNewCarrierId(carrier.id);
          setNewUnitId(unit.id);
          setNewDriverName(unit.driverName || "");
          setNewVehicleType(unit.vehicleType || "");
          setNewPlateNumber(unit.plateNumber || "");
        }}
      />
    </div>
  );
}

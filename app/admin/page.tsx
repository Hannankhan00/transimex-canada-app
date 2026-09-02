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
  ArrowUpRight,
  TrendingUp,
  ChevronRight,
  Shield,
  Users,
  Building2,
  Lock,
  Sparkles,
  RefreshCw,
  ExternalLink,
  MapPin,
  Calendar,
  Filter,
  DollarSign,
  Layers,
  X,
  UserPlus,
  Send,
  Check,
} from "lucide-react";

interface MetricData {
  newQuotesCount: number;
  activeShipmentsCount: number;
  customsHoldsCount: number;
  unreadInquiriesCount: number;
  openTicketsCount: number;
}

interface ActivityItem {
  id: string;
  category: "quote" | "shipment" | "customs" | "inquiry" | "ticket";
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

interface SubAdminItem {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  role: string;
  companyName: string;
  createdAt: string;
}

export default function AdminOperationsPage() {
  const router = useRouter();
  const { language } = useLanguage();

  // Metrics State
  const [metrics, setMetrics] = useState<MetricData>({
    newQuotesCount: 8,
    activeShipmentsCount: 24,
    customsHoldsCount: 3,
    unreadInquiriesCount: 14,
    openTicketsCount: 6,
  });

  // Activity Feed Filter
  const [activityFilter, setActivityFilter] = useState<"all" | "shipment" | "quote" | "customs" | "inquiry" | "ticket">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sub-Admins Management State
  const [isSubAdminModalOpen, setIsSubAdminModalOpen] = useState(false);
  const [subAdminName, setSubAdminName] = useState("");
  const [subAdminEmail, setSubAdminEmail] = useState("");
  const [subAdminPassword, setSubAdminPassword] = useState("");
  const [subAdminRole, setSubAdminRole] = useState<"subadmin" | "admin">("subadmin");
  const [subAdminDept, setSubAdminDept] = useState("Dispatch & Operations");
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);
  const [subAdminsList, setSubAdminsList] = useState<SubAdminItem[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);

  // Quick New Shipment Modal
  const [isShipmentModalOpen, setIsShipmentModalOpen] = useState(false);
  const [shipmentSuccess, setShipmentSuccess] = useState(false);
  const [newOrigin, setNewOrigin] = useState("Montreal, QC (Hub)");
  const [newDestination, setNewDestination] = useState("Detroit, MI (Cross-Border)");
  const [newFreightMode, setNewFreightMode] = useState("53' Temperature-Controlled Reefer");
  const [newCarrier, setNewCarrier] = useState("Transimex Express Fleet #402");

  // Chronological Activity Feed Data
  const initialActivities: ActivityItem[] = [
    {
      id: "ACT-01",
      category: "quote",
      title: "Quote QT-2026-00124 Accepted & Dispatched",
      titleFr: "Soumission QT-2026-00124 Acceptée et Assignée",
      detail: "Marc Tremblay (Laurentian Logistics) approved $6,200 CAD Reefer load to Detroit.",
      detailFr: "Marc Tremblay a approuvé le chargement frigorifique de 6 200 $ CAD vers Détroit.",
      time: "12 mins ago",
      timestamp: "2026-09-02T16:45:00Z",
      actor: "Marc Tremblay",
      statusText: "Booking Confirmed",
      statusType: "success",
      referenceId: "QT-2026-00124",
    },
    {
      id: "ACT-02",
      category: "customs",
      title: "Customs Hold: CBSA Inspection Staged at Dorval",
      titleFr: "Blocage Douanier: Inspection ASFC Programmée à Dorval",
      detail: "Shipment TMX-00839 flagged for random container inspection. PARS Entry #8849-QC attached.",
      detailFr: "Expédition TMX-00839 signalée pour vérification. Entrée PARS #8849-QC jointe.",
      time: "28 mins ago",
      timestamp: "2026-09-02T16:30:00Z",
      actor: "CBSA Broker Gateway",
      statusText: "Urgent Customs Action",
      statusType: "danger",
      referenceId: "TMX-00839",
    },
    {
      id: "ACT-03",
      category: "shipment",
      title: "Shipment TMX-00847 Delivered & POD Signed",
      titleFr: "Expédition TMX-00847 Livrée & Preuve Signée",
      detail: "Receiver verified delivery of 26 pallets dry freight at Toronto Cross-Dock Facility.",
      detailFr: "Réception confirmée de 26 palettes de marchandises au quai de Toronto.",
      time: "1 hour ago",
      timestamp: "2026-09-02T15:45:00Z",
      actor: "Driver Jean D. (Unit #402)",
      statusText: "Delivered",
      statusType: "success",
      referenceId: "TMX-00847",
    },
    {
      id: "ACT-04",
      category: "inquiry",
      title: "New Enterprise RFQ: Bombardier Aerospace Cargo",
      titleFr: "Nouvelle Demande RFQ: Fret Aéronautique Bombardier",
      detail: "Public web inquiry submitted for weekly oversized engine transport Montreal to Wichita.",
      detailFr: "Demande reçue pour transport récurrent de turbines Montréal vers Wichita.",
      time: "2 hours ago",
      timestamp: "2026-09-02T14:30:00Z",
      actor: "Public Contact Gateway",
      statusText: "Unread Lead",
      statusType: "info",
      referenceId: "INQ-2026-089",
    },
    {
      id: "ACT-05",
      category: "ticket",
      title: "Ticket #TKT-2026-0042: Reefer Telemetry Requested",
      titleFr: "Billet #TKT-2026-0042: Télémétrie Frigorifique Demandée",
      detail: "Client requesting continuous calibrated -18°C temperature logs for pharmaceutical audit.",
      detailFr: "Demande de journaux de température calibrés à -18°C pour audit pharmaceutique.",
      time: "3 hours ago",
      timestamp: "2026-09-02T13:15:00Z",
      actor: "Laurentian Global Pharma",
      statusText: "Awaiting Reply",
      statusType: "warning",
      referenceId: "TKT-2026-0042",
    },
    {
      id: "ACT-06",
      category: "shipment",
      title: "Carrier Assigned: Swift Canadian Haulers on Load TMX-00855",
      titleFr: "Transporteur Assigné: Swift Canadian Haulers sur TMX-00855",
      detail: "53' Flatbed heavy machinery route dispatched from Dorval Terminal to Halifax Port.",
      detailFr: "Plateforme 53' avec machinerie lourde expédiée de Dorval vers le Port d'Halifax.",
      time: "4 hours ago",
      timestamp: "2026-09-02T12:00:00Z",
      actor: "Dispatcher Hamza K.",
      statusText: "In Transit",
      statusType: "info",
      referenceId: "TMX-00855",
    },
  ];

  const [activities, setActivities] = useState<ActivityItem[]>(initialActivities);

  const loadSubAdmins = useCallback(async () => {
    setLoadingAdmins(true);
    try {
      const res = await fetch("/api/admin/subadmins");
      const data = await res.json();
      if (res.ok && data.admins) {
        setSubAdminsList(data.admins);
      }
    } catch {
      // Fallback
    } finally {
      setLoadingAdmins(false);
    }
  }, []);

  useEffect(() => {
    loadSubAdmins();
  }, [loadSubAdmins]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const handleCreateSubAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setModalSuccess(null);
    setModalLoading(true);

    try {
      const res = await fetch("/api/admin/subadmins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: subAdminName,
          email: subAdminEmail,
          password: subAdminPassword,
          role: subAdminRole,
          companyName: `Transimex - ${subAdminDept}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create staff account");
      }

      setModalSuccess(`Successfully created staff account for ${subAdminName}`);
      setSubAdminName("");
      setSubAdminEmail("");
      setSubAdminPassword("");
      loadSubAdmins();
    } catch (err: any) {
      setModalError(err.message || "Failed to create staff account");
    } finally {
      setModalLoading(false);
    }
  };

  const handleQuickShipmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShipmentSuccess(true);
    setTimeout(() => {
      setShipmentSuccess(false);
      setIsShipmentModalOpen(false);
      // Increment active shipments metric
      setMetrics((prev) => ({
        ...prev,
        activeShipmentsCount: prev.activeShipmentsCount + 1,
      }));
      // Add new activity
      const newAct: ActivityItem = {
        id: `ACT-${Date.now()}`,
        category: "shipment",
        title: `Shipment TMX-${Math.floor(10000 + Math.random() * 90000)} Created`,
        titleFr: `Expédition TMX-${Math.floor(10000 + Math.random() * 90000)} Créée`,
        detail: `${newFreightMode} dispatched: ${newOrigin} to ${newDestination}.`,
        detailFr: `${newFreightMode} expédié: ${newOrigin} vers ${newDestination}.`,
        time: "Just now",
        timestamp: new Date().toISOString(),
        actor: "Staff Dispatcher",
        statusText: "Dispatched",
        statusType: "success",
      };
      setActivities((prev) => [newAct, ...prev]);
    }, 1000);
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
          <h1
            className="text-3xl sm:text-4xl font-bold text-[#0B2545] tracking-tight leading-tight mt-1"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
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
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs transition cursor-pointer flex items-center gap-1.5"
            title="Refresh Live Metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{language === "fr" ? "Actualiser" : "Refresh"}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSubAdminModalOpen(true)}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#0B2545] shadow-2xs transition cursor-pointer flex items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5 text-[#0B2545]" />
            <span>{language === "fr" ? "Équipe Staff" : "Manage Staff"}</span>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Card 1: New Quotes */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-md transition group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {language === "fr" ? "Nouvelles Soumissions" : "New Quotes"}
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#0B2545]">{metrics.newQuotesCount}</span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> +3 today
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {language === "fr" ? "En attente de révision tarifaire" : "Awaiting pricing & dispatch review"}
          </p>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-600">$142.5k Value</span>
            <Link
              href="/admin/quotes"
              className="text-[#d21f27] font-bold hover:underline flex items-center gap-0.5"
            >
              {language === "fr" ? "Voir" : "Review"} <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Card 2: Active Shipments */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-md transition group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {language === "fr" ? "Fret en Transit" : "Active Shipments"}
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#0B2545]">{metrics.activeShipmentsCount}</span>
            <span className="text-xs font-semibold text-emerald-600">98.4% on-time</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {language === "fr" ? "Chargements actifs sur autoroutes" : "Loads in transit across corridors"}
          </p>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-600">6 Corridors</span>
            <Link
              href="/admin/shipments"
              className="text-[#0B2545] font-bold hover:underline flex items-center gap-0.5"
            >
              {language === "fr" ? "Suivi" : "Track"} <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Card 3: Customs Holds (URGENT RED ALERT) */}
        <div className="bg-white rounded-2xl p-5 border-2 border-red-200 shadow-xs hover:shadow-md transition group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/10 rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-700">
              {language === "fr" ? "Blocages Douanes" : "Customs Holds"}
            </span>
            <div className="w-9 h-9 rounded-xl bg-red-100 text-[#d21f27] flex items-center justify-center group-hover:scale-105 transition-transform">
              <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#d21f27]">{metrics.customsHoldsCount}</span>
            <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold animate-pulse">
              ACTION REQUIRED
            </span>
          </div>
          <p className="text-[11px] text-red-600/90 font-medium mt-1">
            {language === "fr" ? "Signalements ASFC & PARS" : "CBSA & PARS inspection flags"}
          </p>
          <div className="mt-3 pt-3 border-t border-red-100 flex items-center justify-between text-[11px]">
            <span className="font-semibold text-red-700">Dorval & Detroit Port</span>
            <Link
              href="/admin/shipments?filter=customs"
              className="text-red-700 font-bold hover:underline flex items-center gap-0.5"
            >
              {language === "fr" ? "Résoudre" : "Resolve"} <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Card 4: Unread Inquiries */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-md transition group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {language === "fr" ? "Demandes Non Lues" : "Unread Inquiries"}
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Mail className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#0B2545]">{metrics.unreadInquiriesCount}</span>
            <span className="text-xs font-semibold text-purple-600">5 High Priority</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {language === "fr" ? "Formulaires du site public" : "New public site contact leads"}
          </p>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-600">Enterprise RFQs</span>
            <Link
              href="/admin/inbox"
              className="text-[#0B2545] font-bold hover:underline flex items-center gap-0.5"
            >
              {language === "fr" ? "Ouvrir" : "View"} <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Card 5: Open Tickets */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-md transition group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {language === "fr" ? "Billets de Support" : "Open Tickets"}
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <LifeBuoy className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#0B2545]">{metrics.openTicketsCount}</span>
            <span className="text-xs font-semibold text-amber-600">2 Critical SLA</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {language === "fr" ? "Requêtes clients en attente" : "Client requests awaiting reply"}
          </p>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-600">&lt; 30m Avg Response</span>
            <Link
              href="/admin/support"
              className="text-[#0B2545] font-bold hover:underline flex items-center gap-0.5"
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
                <h2
                  className="text-xl font-bold text-[#0B2545]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {language === "fr" ? "Journal d'Activité en Temps Réel" : "Recent Operational Activity"}
                </h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  {language === "fr"
                    ? "Historique chronologique des actions et statuts sur l'ensemble du système."
                    : "Chronological audit trail of all dispatch events, quote decisions, and carrier actions."}
                </p>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                {(
                  [
                    { key: "all", label: "All" },
                    { key: "shipment", label: "Shipments" },
                    { key: "quote", label: "Quotes" },
                    { key: "customs", label: "Customs" },
                    { key: "ticket", label: "Tickets" },
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
          {/* Quick Dispatch Corridor Status Card */}
          <div className="bg-[#0B2545] rounded-2xl p-5 text-white shadow-md border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Corridor Telematics
              </span>
              <span className="text-[10px] font-mono text-amber-400">HQ MONTREAL</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
                <div>
                  <p className="font-bold text-white">Montreal &harr; Toronto (Hwy 401)</p>
                  <p className="text-[11px] text-slate-300">12 Active units &bull; Average speed 94 km/h</p>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                  NORMAL
                </span>
              </div>

              <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
                <div>
                  <p className="font-bold text-white">Montreal &harr; Detroit (Cross-Border)</p>
                  <p className="text-[11px] text-slate-300">6 Active units &bull; CBSA delay 25m</p>
                </div>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                  HOLD ALERT
                </span>
              </div>

              <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
                <div>
                  <p className="font-bold text-white">Toronto &harr; Vancouver (Trans-Canada)</p>
                  <p className="text-[11px] text-slate-300">4 Intermodal rail units in transit</p>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                  ON TIME
                </span>
              </div>
            </div>
          </div>

          {/* Sub-Admins & Operations Team Summary */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[#0B2545] text-sm">
                  {language === "fr" ? "Équipe de Répartition" : "Dispatch Staff on Duty"}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {subAdminsList.length + 1} {language === "fr" ? "personnels autorisés" : "authorized staff members"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSubAdminModalOpen(true)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                title="Add Staff"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              {/* Primary Admin */}
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-[#0B2545] text-white flex items-center justify-center font-bold text-[10px]">
                    JP
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 leading-tight">Jean-Philippe Tremblay</p>
                    <p className="text-[10px] text-slate-500">admin@transimex.ca</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-red-100 text-[#d21f27] text-[10px] font-bold">
                  SUPER ADMIN
                </span>
              </div>

              {/* Sub Admins list */}
              {subAdminsList.map((adm) => (
                <div
                  key={adm._id || adm.id || adm.email}
                  className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                      {adm.name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 leading-tight">{adm.name}</p>
                      <p className="text-[10px] text-slate-500">{adm.email}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold">
                    {(adm.role || "subadmin").toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. MODAL: CREATE NEW SHIPMENT */}
      {isShipmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-100 text-[#d21f27] flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[#0B2545] text-base">
                    {language === "fr" ? "Créer un Nouvel Envoi de Fret" : "Dispatch New Freight Shipment"}
                  </h3>
                  <p className="text-[11px] text-slate-500">Transimex Institutional Dispatch Gateway</p>
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
                <h4 className="font-bold text-slate-900">Shipment Dispatched Successfully</h4>
                <p className="text-xs text-slate-500">Manifest generated and assigned to carrier fleet.</p>
              </div>
            ) : (
              <form onSubmit={handleQuickShipmentSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Origin Terminal</label>
                  <input
                    type="text"
                    required
                    value={newOrigin}
                    onChange={(e) => setNewOrigin(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#0B2545] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Destination Facility</label>
                  <input
                    type="text"
                    required
                    value={newDestination}
                    onChange={(e) => setNewDestination(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#0B2545] focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Equipment / Mode</label>
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
                    <label className="font-semibold text-slate-700 block mb-1">Assigned Carrier / Fleet</label>
                    <input
                      type="text"
                      required
                      value={newCarrier}
                      onChange={(e) => setNewCarrier(e.target.value)}
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
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#d21f27] hover:bg-[#b51a21] text-white rounded-xl font-bold shadow-xs transition cursor-pointer"
                  >
                    Dispatch Load
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 5. MODAL: MANAGE SUB-ADMIN STAFF */}
      {isSubAdminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#0B2545] flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[#0B2545] text-base">
                    {language === "fr" ? "Créer un Compte Staff" : "Add Staff Dispatcher"}
                  </h3>
                  <p className="text-[11px] text-slate-500">Transimex Admin Privilege Control</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSubAdminModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
                {modalError}
              </div>
            )}

            {modalSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs">
                {modalSuccess}
              </div>
            )}

            <form onSubmit={handleCreateSubAdmin} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Staff Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Marc Tremblay"
                  value={subAdminName}
                  onChange={(e) => setSubAdminName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#0B2545] focus:bg-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Corporate Staff Email</label>
                <input
                  type="email"
                  required
                  placeholder="name@transimex.ca"
                  value={subAdminEmail}
                  onChange={(e) => setSubAdminEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#0B2545] focus:bg-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Initial Temporary Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={subAdminPassword}
                  onChange={(e) => setSubAdminPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#0B2545] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Role Level</label>
                  <select
                    value={subAdminRole}
                    onChange={(e) => setSubAdminRole(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#0B2545] focus:bg-white"
                  >
                    <option value="subadmin">Sub-Admin (Dispatcher)</option>
                    <option value="admin">Full Admin</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Department</label>
                  <input
                    type="text"
                    value={subAdminDept}
                    onChange={(e) => setSubAdminDept(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#0B2545] focus:bg-white"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSubAdminModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-4 py-2 bg-[#0B2545] hover:bg-slate-800 text-white rounded-xl font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {modalLoading ? "Creating..." : "Save Staff Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

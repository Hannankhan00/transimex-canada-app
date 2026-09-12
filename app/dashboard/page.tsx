"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { api } from "@/lib/api";
import { QuoteItem } from "@/lib/quoteTypes";
import NewQuoteModal from "@/components/portal/NewQuoteModal";
import {
  Truck,
  FileSpreadsheet,
  CheckCircle2,
  FileText,
  FolderOpen,
  HelpCircle,
  Plus,
  Search,
  ArrowUpRight,
  Clock,
  X,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";

interface ActivityItem {
  kind: "shipment" | "quote";
  id: string;
  title: string;
  detail: string;
  time: string;
  badge: string;
  badgeClass: string;
  icon: "truck" | "quote" | "doc";
}

export default function DashboardPage() {
  const { t, language } = useLanguage();
  const [user, setUser] = useState<{
    name?: string;
    companyName?: string;
    email?: string;
    role?: string;
  } | null>(null);

  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [trackNumber, setTrackNumber] = useState("");
  const [trackResult, setTrackResult] = useState<string | null>(null);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [tracking, setTracking] = useState(false);

  const [activeShipments, setActiveShipments] = useState(0);
  const [pendingQuotes, setPendingQuotes] = useState(0);
  const [deliveredTotal, setDeliveredTotal] = useState(0);
  const [documentsCount, setDocumentsCount] = useState(0);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [customsHoldShipments, setCustomsHoldShipments] = useState<any[]>([]);

  useEffect(() => {
    api.auth.me().then((res) => {
      if (res.user) {
        setUser(res.user);
      }
    });

    Promise.all([
      fetch("/api/shipments").then((r) => r.json()),
      fetch("/api/quotes").then((r) => r.json()),
      fetch("/api/documents").then((r) => r.json()),
    ]).then(([shipmentsRes, quotesRes, documentsRes]) => {
      const shipments = shipmentsRes.success ? shipmentsRes.shipments : [];
      const quotes: QuoteItem[] = quotesRes.success ? quotesRes.quotes : [];

      setActiveShipments(shipments.filter((s: any) => s.status !== "delivered" && s.status !== "cancelled").length);
      setDeliveredTotal(shipments.filter((s: any) => s.status === "delivered").length);
      setPendingQuotes(quotes.filter((q) => q.status === "under_review" || q.status === "reviewing").length);
      setDocumentsCount(documentsRes.success ? documentsRes.documents.length : 0);

      const holdShipments = shipments.filter(
        (s: any) =>
          (s.status === "customs" || s.customsStatus === "Held") &&
          s.duties?.status === "Notice Dispatched"
      );
      setCustomsHoldShipments(holdShipments);

      const shipmentActivity: ActivityItem[] = shipments.slice(0, 3).map((s: any) => ({
        kind: "shipment",
        id: s.id,
        title: `Shipment #${s.id}`,
        detail: `${s.origin} → ${s.destination}`,
        time: s.date,
        badge: s.statusLabel,
        badgeClass:
          s.status === "delivered"
            ? "bg-emerald-100 text-emerald-800"
            : s.status === "customs" && s.duties?.status === "Notice Dispatched"
            ? "bg-red-100 text-red-800 border border-red-200 font-bold"
            : s.status === "customs"
            ? "bg-amber-100 text-amber-800"
            : "bg-blue-100 text-blue-800",
        icon: "truck",
      }));

      const quoteActivity: ActivityItem[] = quotes.slice(0, 3).map((q) => ({
        kind: "quote",
        id: q.id,
        title: `Quote #${q.id}`,
        detail: `${q.origin} → ${q.destination}`,
        time: q.submittedDate,
        badge: language === "fr" ? q.statusLabelFr : q.statusLabelEn,
        badgeClass:
          q.status === "accepted"
            ? "bg-emerald-100 text-emerald-800"
            : q.status === "rejected"
            ? "bg-red-100 text-red-800"
            : "bg-slate-200 text-slate-800",
        icon: "quote",
      }));

      setActivity([...shipmentActivity, ...quoteActivity].slice(0, 3));
    }).catch(() => {});
  }, [language]);

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackNumber.trim()) return;
    setTracking(true);
    setTrackResult(null);
    setTrackError(null);
    try {
      const res = await fetch(`/api/shipments/track?number=${encodeURIComponent(trackNumber.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setTrackError(data.error || "Shipment not found");
        return;
      }
      const s = data.shipment;
      setTrackResult(
        `Shipment ${s.trackingNumber} is ${s.status.toUpperCase()}: ${s.origin} → ${s.destination}. ETA: ${s.eta}.` +
          (s.lastEvent ? ` Latest: ${s.lastEvent.title} (${s.lastEvent.location}).` : "")
      );
    } catch {
      setTrackError("Failed to reach tracking service. Please try again.");
    } finally {
      setTracking(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B2545] tracking-tight leading-tight">
            {language === "fr" ? "Bienvenue," : "Welcome back,"}{" "}
            <span className="text-slate-900">
              {user?.companyName || user?.name || (language === "fr" ? "Portail Client" : "Client Portal")}
            </span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {language === "fr"
              ? "Suivez vos expéditions, gérez vos soumissions et accédez à vos documents douaniers."
              : "Track your shipments, manage quotes, and access customs documents."}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsTrackModalOpen(true)}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#0B2545] shadow-xs transition cursor-pointer flex items-center gap-1.5"
          >
            <Search className="w-3.5 h-3.5 text-[#d21f27]" />
            <span>{language === "fr" ? "Suivre un Envoi" : "Track Shipment"}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsQuoteModalOpen(true)}
            className="px-4 py-2.5 bg-[#d21f27] hover:bg-[#b51a21] text-white rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{t.topBar.newQuote}</span>
          </button>
        </div>
      </div>

      {/* Red Alert Banner: Customs Duties & Cargo Hold Warning */}
      {customsHoldShipments.length > 0 && (
        <div className="space-y-3">
          {customsHoldShipments.map((s) => (
            <div
              key={s.id}
              className="bg-red-50 border border-[#d21f27] rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#d21f27] text-white flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#d21f27] text-white text-[10px] font-bold uppercase tracking-wider">
                      {language === "fr" ? "Alerte de Paiement Douanier" : "Customs Duties Alert"}
                    </span>
                    <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm">
                      #{s.id}
                    </span>
                    {s.portOfEntry && (
                      <span className="text-[11px] text-slate-500">
                        • {s.portOfEntry}
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-red-950 leading-snug">
                    {language === "fr"
                      ? `Les droits de douane de ${s.duties?.totalOwed || s.duties?.amountCad || "montant requis"} sont requis pour libérer la cargaison. Veuillez contacter l'équipe Transimex.`
                      : `Customs duties of ${s.duties?.totalOwed || s.duties?.amountCad || "payment required"} are required to release cargo. Please contact the Transimex team.`}
                  </p>
                  <div className="text-[11px] text-slate-600 flex items-center gap-3 flex-wrap pt-0.5">
                    {s.duties?.amountCad && (
                      <span>
                        <strong className="text-slate-800">{language === "fr" ? "Droits:" : "Tariff Duties:"}</strong> {s.duties.amountCad}
                      </span>
                    )}
                    {s.duties?.taxGstHst && (
                      <span>
                        <strong className="text-slate-800">GST/HST:</strong> {s.duties.taxGstHst}
                      </span>
                    )}
                    {s.duties?.brokerageFeeCad && (
                      <span>
                        <strong className="text-slate-800">{language === "fr" ? "Frais de dossier:" : "Brokerage:"}</strong> {s.duties.brokerageFeeCad}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 flex-shrink-0 self-end md:self-center">
                <Link
                  href={`/dashboard/shipments?id=${encodeURIComponent(s.id)}`}
                  className="px-4 py-2.5 bg-[#d21f27] hover:bg-[#b51a21] text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{language === "fr" ? "Examiner & Débloquer" : "Review & Clear Duties"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4 Primary Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* 1. Active Shipments */}
        <Link
          href="/dashboard/shipments"
          className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-slate-300 hover:shadow-sm transition flex flex-col justify-between h-28 group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              {language === "fr" ? "EXPÉDITIONS ACTIVES" : "ACTIVE SHIPMENTS"}
            </span>
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-[#d21f27]">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold text-[#0B2545] tracking-tight">{activeShipments}</span>
            <span className="text-xs text-slate-400">
              {language === "fr" ? "En transit" : "In transit"}
            </span>
          </div>
        </Link>

        {/* 2. Pending Quotes */}
        <Link
          href="/dashboard/quotes"
          className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-slate-300 hover:shadow-sm transition flex flex-col justify-between h-28 group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              {language === "fr" ? "SOUMISSIONS EN COURS" : "PENDING QUOTES"}
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold text-[#0B2545] tracking-tight">{pendingQuotes}</span>
            <span className="text-xs text-slate-400">
              {pendingQuotes > 0
                ? language === "fr" ? "En attente" : "Awaiting review"
                : language === "fr" ? "À jour" : "All caught up"}
            </span>
          </div>
        </Link>

        {/* 3. Delivered Total */}
        <Link
          href="/dashboard/shipments?status=delivered"
          className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-slate-300 hover:shadow-sm transition flex flex-col justify-between h-28 group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              {language === "fr" ? "TOTAL LIVRAISONS" : "DELIVERED TOTAL"}
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold text-[#0B2545] tracking-tight">{deliveredTotal}</span>
            <span className="text-xs text-slate-400">{language === "fr" ? "Total" : "All time"}</span>
          </div>
        </Link>

        {/* 4. Documents Available */}
        <Link
          href="/dashboard/documents"
          className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-slate-300 hover:shadow-sm transition flex flex-col justify-between h-28 group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              {language === "fr" ? "DOCUMENTS DOUANIERS" : "CBSA DOCUMENTS"}
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold text-[#0B2545] tracking-tight">{documentsCount}</span>
            <span className="text-xs text-slate-400">
              {language === "fr" ? "Disponibles" : "Available"}
            </span>
          </div>
        </Link>
      </div>

      {/* 2-Column Split: Activity Stream & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Activity Feed */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-[#0B2545]">
              {language === "fr" ? "Activité Récente" : "Recent Activity"}
            </h2>
            <Link
              href="/dashboard/shipments"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#d21f27] hover:underline"
            >
              <span>{t.common.viewDetails}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3.5">
            {activity.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-xs text-slate-500">
                  {language === "fr"
                    ? "Aucune activité récente. Vos expéditions et soumissions apparaîtront ici."
                    : "No recent activity yet. Your shipments and quotes will appear here."}
                </p>
              </div>
            ) : (
              activity.map((item) => (
                <div
                  key={`${item.kind}-${item.id}`}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 font-bold text-xs ${
                        item.kind === "shipment" ? "bg-red-100 text-[#d21f27]" : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {item.kind === "shipment" ? <Truck className="w-4 h-4" /> : <FileSpreadsheet className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        {item.title} &bull; <span className="font-medium text-slate-600">{item.detail}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <Clock className="w-3 h-3" />
                        <span>{item.time}</span>
                      </div>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider self-start sm:self-auto ${item.badgeClass}`}>
                    {item.badge}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right 1 Col: Quick Actions */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <h2 className="text-lg font-bold text-[#0B2545] mb-4">
            {language === "fr" ? "Actions Rapides" : "Quick Actions"}
          </h2>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setIsQuoteModalOpen(true)}
              className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border border-slate-200 hover:border-[#d21f27]/40 hover:bg-red-50/40 transition text-left cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-lg bg-red-50 text-[#d21f27] flex items-center justify-center flex-shrink-0">
                <Plus className="w-4 h-4 stroke-[3]" />
              </div>
              <span className="text-sm font-semibold text-slate-800 group-hover:text-[#0B2545]">
                {language === "fr" ? "Nouvelle Soumission" : "Request a Quote"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setIsTrackModalOpen(true)}
              className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border border-slate-200 hover:border-[#0B2545]/30 hover:bg-slate-50 transition text-left cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-lg bg-slate-100 text-[#0B2545] flex items-center justify-center flex-shrink-0">
                <Search className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold text-slate-800">
                {language === "fr" ? "Suivre un Envoi" : "Track a Shipment"}
              </span>
            </button>

            <Link
              href="/dashboard/documents"
              className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border border-slate-200 hover:border-[#0B2545]/30 hover:bg-slate-50 transition text-left cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-lg bg-slate-100 text-[#0B2545] flex items-center justify-center flex-shrink-0">
                <FolderOpen className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold text-slate-800">
                {language === "fr" ? "Voir les Documents" : "View Documents"}
              </span>
            </Link>

            <Link
              href="/dashboard/support"
              className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border border-slate-200 hover:border-[#0B2545]/30 hover:bg-slate-50 transition text-left cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-lg bg-slate-100 text-[#0B2545] flex items-center justify-center flex-shrink-0">
                <HelpCircle className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold text-slate-800">
                {language === "fr" ? "Contacter le Support" : "Contact Support"}
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Quote Request Modal (shared with the Quotes page) */}
      <NewQuoteModal isOpen={isQuoteModalOpen} onClose={() => setIsQuoteModalOpen(false)} />

      {/* Track Shipment Modal */}
      {isTrackModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-xl font-bold text-[#0B2545]">
                {language === "fr" ? "Suivi Télématique en Direct" : "Track Active Shipment"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsTrackModalOpen(false);
                  setTrackResult(null);
                  setTrackError(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleTrackSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  BOL / Container / Tracking #
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    required
                    placeholder="e.g. TMX-00847"
                    value={trackNumber}
                    onChange={(e) => setTrackNumber(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-[#0B2545]"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={tracking}
                className="w-full py-2.5 bg-[#0B2545] hover:bg-[#123661] text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-sm transition cursor-pointer disabled:opacity-60"
              >
                {tracking
                  ? language === "fr"
                    ? "Recherche..."
                    : "Searching..."
                  : language === "fr"
                  ? "Interroger le Système"
                  : "Query Telematics Status"}
              </button>
            </form>

            {trackResult && (
              <div className="mt-4 p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs flex items-start gap-2.5 animate-in fade-in">
                <Truck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{trackResult}</span>
              </div>
            )}
            {trackError && (
              <div className="mt-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-start gap-2.5 animate-in fade-in">
                <Search className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{trackError}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

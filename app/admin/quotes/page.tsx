"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { QuoteItem, QuoteStatus } from "@/lib/quoteTypes";
import QuoteDataTable from "@/components/admin/quotes/QuoteDataTable";
import QuoteReviewDrawer from "@/components/admin/quotes/QuoteReviewDrawer";
import {
  FileSpreadsheet,
  Plus,
  RefreshCw,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  DollarSign,
  Download,
  AlertCircle,
  Truck,
  Layers,
} from "lucide-react";

export default function AdminQuotesPage() {
  const { language } = useLanguage();
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [counts, setCounts] = useState({
    all: 0,
    under_review: 0,
    reviewing: 0,
    accepted: 0,
    rejected: 0,
  });
  const [activeTab, setActiveTab] = useState<"all" | QuoteStatus>("all");
  const [selectedQuote, setSelectedQuote] = useState<QuoteItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch quotes from API
  const fetchQuotes = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch(`/api/admin/quotes?status=${activeTab}`);
      const data = await res.json();
      if (res.ok && data.quotes) {
        setQuotes(data.quotes);
        if (data.counts) {
          setCounts(data.counts);
        }
      }
    } catch (err) {
      console.error("Error fetching quotes:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  // Handle row click
  const handleSelectQuote = (quote: QuoteItem) => {
    setSelectedQuote(quote);
    setIsDrawerOpen(true);
  };

  // Handle quote updated from drawer (accept / reject / notes)
  const handleQuoteUpdated = (updatedQuote: QuoteItem) => {
    setQuotes((prev) =>
      prev.map((q) => (q.id === updatedQuote.id ? updatedQuote : q))
    );
    setSelectedQuote(updatedQuote);
    // Refresh counts and list
    fetchQuotes();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#d21f27]">
              {language === "fr" ? "Gestion des Soumissions" : "Commercial Freight Intake"}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-mono font-bold">
              PIPELINE v2.0
            </span>
          </div>
          <h1
            className="text-3xl sm:text-4xl font-bold text-[#0B2545] tracking-tight leading-tight mt-1"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {language === "fr"
              ? "Registre des Soumissions & Tarification"
              : "Quote Pipeline & Rate Assignment"}
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl">
            {language === "fr"
              ? "Évaluez les demandes de fret en temps réel, assignez les tarifs et convertissez automatiquement les soumissions en expéditions actives."
              : "Evaluate incoming shipper requests, assign binding freight tariffs, dispatch client decisions, and spin up active tracking manifests."}
          </p>
        </div>

        {/* Header Action Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={fetchQuotes}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs transition cursor-pointer flex items-center gap-1.5"
            title="Refresh Pipeline"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => {
              // Quick export simulation
              const csvContent =
                "data:text/csv;charset=utf-8," +
                ["Ref,Client,Origin,Destination,Status,Rate"]
                  .concat(
                    quotes.map(
                      (q) =>
                        `"${q.id}","${q.clientCompany || q.clientName}","${q.origin}","${q.destination}","${q.status}","${q.priceCad || ""}"`
                    )
                  )
                  .join("\n");
              const encodedUri = encodeURI(csvContent);
              const link = document.createElement("a");
              link.setAttribute("href", encodedUri);
              link.setAttribute("download", `Transimex_Quotes_${Date.now()}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#0B2545] shadow-2xs transition cursor-pointer flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-[#0B2545]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 2. PIPELINE HIGH-LEVEL METRIC TILES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Pending Rate Assignment */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Awaiting Review
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-[#0B2545]">
              {counts.under_review}
            </span>
            <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
              Immediate Priority
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            New requests submitted by commercial shippers
          </p>
        </div>

        {/* Metric 2: Currently In Review */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              In Staff Review
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-[#0B2545]">
              {counts.reviewing}
            </span>
            <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60">
              Carrier Pricing
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Rates currently being calculated by dispatch
          </p>
        </div>

        {/* Metric 3: Accepted & Converted */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Accepted &amp; Dispatched
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-[#0B2545]">
              {counts.accepted}
            </span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
              Shipments Live
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Active highway loads spun up from quotes
          </p>
        </div>

        {/* Metric 4: Declined Quotes */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Declined Requests
            </span>
            <div className="w-8 h-8 rounded-xl bg-red-50 text-[#d21f27] flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-[#0B2545]">
              {counts.rejected}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              Logged &amp; Notified
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Capacity/restriction declines with reason
          </p>
        </div>
      </div>

      {/* 3. MAIN QUOTE DATA TABLE */}
      <QuoteDataTable
        quotes={quotes}
        counts={counts}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        onSelectQuote={handleSelectQuote}
        onRefresh={fetchQuotes}
        isRefreshing={isRefreshing}
      />

      {/* 4. SLIDING REVIEW & RATE DRAWER */}
      <QuoteReviewDrawer
        quote={selectedQuote}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onQuoteUpdated={handleQuoteUpdated}
      />
    </div>
  );
}

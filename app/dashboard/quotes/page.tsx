"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { QuoteItem, getStoredQuotes, QuoteStatus } from "@/lib/mockData";
import QuoteDetailsModal from "@/components/portal/QuoteDetailsModal";
import NewQuoteModal from "@/components/portal/NewQuoteModal";
import {
  FileSpreadsheet,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowUpRight,
  DollarSign,
  Calendar,
  AlertCircle,
  Truck,
  Filter,
  Eye,
  Info,
  ShieldAlert,
  Sparkles,
  MapPin,
} from "lucide-react";

function QuotesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, language } = useLanguage();
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<QuoteItem | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [newQuoteModalOpen, setNewQuoteModalOpen] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setQuotes(getStoredQuotes());
    if (searchParams.get("action") === "new" || searchParams.get("new") === "true") {
      setNewQuoteModalOpen(true);
    }
  }, [searchParams]);

  const handleOpenDetails = (quote: QuoteItem) => {
    setSelectedQuote(quote);
    setDetailsModalOpen(true);
  };

  const handleQuoteCreated = (newQuote: QuoteItem) => {
    setQuotes((prev) => [newQuote, ...prev.filter((q) => q.id !== newQuote.id)]);
  };

  const filteredQuotes = quotes.filter((q) => {
    if (filter !== "all" && q.status !== filter) return false;
    if (
      search &&
      !q.id.toLowerCase().includes(search.toLowerCase()) &&
      !q.origin.toLowerCase().includes(search.toLowerCase()) &&
      !q.destination.toLowerCase().includes(search.toLowerCase()) &&
      !q.transportMode.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#d21f27]">
            {language === "fr" ? "Tarification & Réservations" : "Freight Pricing & Quotations"}
          </span>
          <h1
            className="text-2xl sm:text-3xl font-bold text-[#0B2545] tracking-tight leading-tight mt-1"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {t.nav.quotes}
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            {language === "fr"
              ? "Historique centralisé de vos soumissions de fret, approbations et tarifs garantis."
              : "Centralized history of all freight quotes, carrier approvals, and dispatch bookings."}
          </p>
        </div>

        {/* Action Button opening the interactive blurred popup modal */}
        <button
          type="button"
          onClick={() => setNewQuoteModalOpen(true)}
          className="px-4 py-2.5 bg-[#d21f27] hover:bg-[#b51a21] active:scale-[0.98] text-white rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>{language === "fr" ? "Demander une Soumission" : "Request New Freight Quote"}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={
              language === "fr"
                ? "Rechercher par no QT-, ville, équipement..."
                : "Search quote ID, route, transport mode..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {[
            { id: "all", label: language === "fr" ? "Toutes" : "All Quotes" },
            { id: "under_review", label: language === "fr" ? "En Révision" : "Under Review" },
            { id: "accepted", label: language === "fr" ? "Acceptées" : "Accepted" },
            { id: "rejected", label: language === "fr" ? "Refusées" : "Rejected" },
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

      {/* Quotes Table / Card Layout */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredQuotes.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">
              {language === "fr" ? "Aucune soumission trouvée" : "No Freight Quotes Found"}
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {language === "fr"
                ? "Aucune soumission ne correspond à vos filtres de recherche."
                : "No quote records match your filter criteria or search query."}
            </p>
            <button
              type="button"
              onClick={() => setNewQuoteModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0B2545] text-white rounded-xl text-xs font-bold hover:bg-[#123661] transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{language === "fr" ? "Créer une demande" : "Request First Quote"}</span>
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table (Preserved 100%) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500 select-none">
                    <th className="py-3 px-4 sm:px-6">Quote Reference</th>
                    <th className="py-3 px-4">Transport Mode</th>
                    <th className="py-3 px-4">Logistics Route</th>
                    <th className="py-3 px-4">Submitted</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Price (CAD)</th>
                    <th className="py-3 px-4 sm:px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredQuotes.map((quote) => {
                    const isAccepted = quote.status === "accepted";
                    const isRejected = quote.status === "rejected";
                    const isPending = quote.status === "under_review";

                    return (
                      <tr
                        key={quote.id}
                        className="hover:bg-slate-50/80 transition group"
                      >
                        {/* Quote Reference */}
                        <td className="py-4 px-4 sm:px-6 font-mono font-bold text-[#0B2545] whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span>{quote.id}</span>
                          </div>
                        </td>

                        {/* Transport Mode & Equipment */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-900">{quote.transportMode}</div>
                          <div className="text-[11px] text-slate-400">{quote.equipment}</div>
                        </td>

                        {/* Route */}
                        <td className="py-4 px-4">
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <span>{quote.origin}</span>
                            <span className="text-slate-400">→</span>
                            <span>{quote.destination}</span>
                          </div>
                          <div className="text-[11px] text-slate-400">{quote.commodity} ({quote.weight})</div>
                        </td>

                        {/* Submission Date */}
                        <td className="py-4 px-4 text-slate-500 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{quote.submittedDate}</span>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isPending
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : isAccepted
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : isRejected
                                ? "bg-red-100 text-red-800 border border-red-200"
                                : "bg-slate-100 text-slate-500 border border-slate-200"
                            }`}
                          >
                            {isPending && <Clock className="w-3 h-3 text-amber-700" />}
                            {isAccepted && <CheckCircle2 className="w-3 h-3 text-emerald-700" />}
                            {isRejected && <AlertCircle className="w-3 h-3 text-red-700" />}
                            {language === "fr" ? quote.statusLabelFr : quote.statusLabelEn}
                          </span>
                        </td>

                        {/* Price CAD */}
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <div className="font-bold text-[#0B2545]">
                            {quote.priceCad}
                          </div>
                          {quote.priceCad !== "Pending Dispatch Calculation" && quote.priceCad !== "N/A" && (
                            <div className="text-[10px] text-slate-400 font-semibold">Guaranteed</div>
                          )}
                        </td>

                        {/* Actions: Accepted -> View Shipment, Rejected -> View Reason, Pending -> View Details */}
                        <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                          {isAccepted && quote.shipmentId ? (
                            <Link
                              href={`/dashboard/shipments?id=${quote.shipmentId}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0B2545] hover:bg-[#123661] text-white text-xs font-bold rounded-lg shadow-xs transition cursor-pointer"
                            >
                              <span>{language === "fr" ? "Voir Expédition" : "View Shipment"}</span>
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </Link>
                          ) : isRejected ? (
                            <button
                              type="button"
                              onClick={() => handleOpenDetails(quote)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-[#d21f27] border border-red-200 text-xs font-bold rounded-lg transition cursor-pointer"
                            >
                              <ShieldAlert className="w-3.5 h-3.5 text-[#d21f27]" />
                              <span>{language === "fr" ? "Motif du Refus" : "View Reason"}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenDetails(quote)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-500" />
                              <span>{language === "fr" ? "Détails" : "View Details"}</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List (Responsive View for Phones) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredQuotes.map((quote) => {
                const isAccepted = quote.status === "accepted";
                const isRejected = quote.status === "rejected";
                const isPending = quote.status === "under_review";

                return (
                  <div key={quote.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-sm text-[#0B2545]">{quote.id}</span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isPending
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : isAccepted
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : isRejected
                            ? "bg-red-100 text-red-800 border border-red-200"
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}
                      >
                        {isPending && <Clock className="w-3 h-3 text-amber-700" />}
                        {isAccepted && <CheckCircle2 className="w-3 h-3 text-emerald-700" />}
                        {isRejected && <AlertCircle className="w-3 h-3 text-red-700" />}
                        {language === "fr" ? quote.statusLabelFr : quote.statusLabelEn}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#d21f27] flex-shrink-0" />
                        <span>{quote.origin}</span>
                        <span className="text-slate-400">→</span>
                        <span>{quote.destination}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 pl-5">
                        {quote.transportMode} &bull; {quote.equipment} &bull; {quote.commodity} ({quote.weight})
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-xs border-t border-slate-100">
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rate CAD</div>
                        <div className="font-bold text-[#0B2545] text-sm">{quote.priceCad}</div>
                      </div>

                      {isAccepted && quote.shipmentId ? (
                        <Link
                          href={`/dashboard/shipments?id=${quote.shipmentId}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0B2545] hover:bg-[#123661] text-white text-xs font-bold rounded-lg shadow-xs transition"
                        >
                          <span>{language === "fr" ? "Expédition" : "Shipment"}</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                      ) : isRejected ? (
                        <button
                          type="button"
                          onClick={() => handleOpenDetails(quote)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-[#d21f27] border border-red-200 text-xs font-bold rounded-lg transition"
                        >
                          <ShieldAlert className="w-3.5 h-3.5 text-[#d21f27]" />
                          <span>{language === "fr" ? "Motif" : "Reason"}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenDetails(quote)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>{language === "fr" ? "Détails" : "Details"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Quote Details & Rejection Dialog */}
      <QuoteDetailsModal
        quote={selectedQuote}
        isOpen={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setSelectedQuote(null);
        }}
      />

      {/* Interactive New Quote Modal with Blurred Corridor Diagram */}
      <NewQuoteModal
        isOpen={newQuoteModalOpen}
        onClose={() => setNewQuoteModalOpen(false)}
        onQuoteCreated={handleQuoteCreated}
      />
    </div>
  );
}

export default function QuotesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-slate-400">Loading quotes...</div>}>
      <QuotesContent />
    </Suspense>
  );
}

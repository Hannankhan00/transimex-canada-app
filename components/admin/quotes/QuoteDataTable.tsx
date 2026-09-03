"use client";

import React, { useState, useMemo } from "react";
import { QuoteItem, QuoteStatus } from "@/lib/mockData";
import StatusBadge from "./StatusBadge";
import {
  Search,
  Truck,
  Ship,
  Plane,
  Train,
  ArrowRight,
  ArrowUpDown,
  Filter,
  Calendar,
  Building2,
  ChevronRight,
  ExternalLink,
  DollarSign,
  AlertCircle,
  Eye,
  RefreshCw,
  MapPin,
} from "lucide-react";

interface QuoteDataTableProps {
  quotes: QuoteItem[];
  counts: {
    all: number;
    under_review: number;
    reviewing: number;
    accepted: number;
    rejected: number;
  };
  activeTab: "all" | QuoteStatus;
  onTabChange: (tab: "all" | QuoteStatus) => void;
  onSelectQuote: (quote: QuoteItem) => void;
  selectedQuoteId?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export default function QuoteDataTable({
  quotes,
  counts,
  activeTab,
  onTabChange,
  onSelectQuote,
  selectedQuoteId,
  onRefresh,
  isRefreshing = false,
}: QuoteDataTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"date" | "ref" | "client">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Filter quotes by search
  const filteredQuotes = useMemo(() => {
    let result = quotes;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((item) => {
        return (
          item.id.toLowerCase().includes(q) ||
          (item.clientName && item.clientName.toLowerCase().includes(q)) ||
          (item.clientCompany && item.clientCompany.toLowerCase().includes(q)) ||
          item.origin.toLowerCase().includes(q) ||
          item.destination.toLowerCase().includes(q) ||
          item.commodity.toLowerCase().includes(q) ||
          item.transportMode.toLowerCase().includes(q) ||
          (item.shipmentId && item.shipmentId.toLowerCase().includes(q))
        );
      });
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (sortField === "date") {
        const d1 = new Date(a.submittedDate).getTime() || 0;
        const d2 = new Date(b.submittedDate).getTime() || 0;
        return sortOrder === "desc" ? d2 - d1 : d1 - d2;
      }
      if (sortField === "ref") {
        return sortOrder === "desc"
          ? b.id.localeCompare(a.id)
          : a.id.localeCompare(b.id);
      }
      if (sortField === "client") {
        const c1 = a.clientCompany || a.clientName || "";
        const c2 = b.clientCompany || b.clientName || "";
        return sortOrder === "desc" ? c2.localeCompare(c1) : c1.localeCompare(c2);
      }
      return 0;
    });

    return result;
  }, [quotes, searchQuery, sortField, sortOrder]);

  // Paginated quotes
  const totalPages = Math.ceil(filteredQuotes.length / pageSize) || 1;
  const paginatedQuotes = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredQuotes.slice(start, start + pageSize);
  }, [filteredQuotes, currentPage]);

  const handleSortToggle = (field: "date" | "ref" | "client") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // Mode icon helper
  const getModeIcon = (mode: string) => {
    const lower = mode.toLowerCase();
    if (lower.includes("air")) return <Plane className="w-4 h-4 text-sky-600" />;
    if (lower.includes("sea") || lower.includes("ocean") || lower.includes("vessel"))
      return <Ship className="w-4 h-4 text-cyan-600" />;
    if (lower.includes("rail") || lower.includes("train") || lower.includes("intermodal"))
      return <Train className="w-4 h-4 text-amber-600" />;
    return <Truck className="w-4 h-4 text-[#d21f27]" />;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
      {/* 1. STATUS TABS BAR */}
      <div className="p-4 sm:p-5 border-b border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => {
              onTabChange("all");
              setCurrentPage(1);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 flex-shrink-0 ${
              activeTab === "all"
                ? "bg-[#0B2545] text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <span>All Quotes</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                activeTab === "all" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              {counts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              onTabChange("under_review");
              setCurrentPage(1);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 flex-shrink-0 ${
              activeTab === "under_review"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <span>New (Awaiting Review)</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === "under_review" ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800"
              }`}
            >
              {counts.under_review}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              onTabChange("reviewing");
              setCurrentPage(1);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 flex-shrink-0 ${
              activeTab === "reviewing"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <span>Reviewing</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === "reviewing" ? "bg-white/20 text-white" : "bg-blue-100 text-blue-800"
              }`}
            >
              {counts.reviewing}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              onTabChange("accepted");
              setCurrentPage(1);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 flex-shrink-0 ${
              activeTab === "accepted"
                ? "bg-emerald-700 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <span>Accepted</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === "accepted" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {counts.accepted}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              onTabChange("rejected");
              setCurrentPage(1);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 flex-shrink-0 ${
              activeTab === "rejected"
                ? "bg-[#d21f27] text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <span>Rejected</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === "rejected" ? "bg-white/20 text-white" : "bg-red-100 text-red-800"
              }`}
            >
              {counts.rejected}
            </span>
          </button>
        </div>

        {/* Search Bar & Refresh */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search reference, client, corridor..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-slate-200 focus:border-[#0B2545] rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 outline-none transition"
            />
          </div>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
              title="Refresh Quotes"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
          )}
        </div>
      </div>

      {/* 2. HIGH-DENSITY DATA TABLE (Preserved on Desktop) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th
                onClick={() => handleSortToggle("ref")}
                className="py-3.5 px-4 cursor-pointer hover:text-slate-900 transition select-none"
              >
                <div className="flex items-center gap-1.5">
                  <span>Ref Number</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th
                onClick={() => handleSortToggle("client")}
                className="py-3.5 px-4 cursor-pointer hover:text-slate-900 transition select-none"
              >
                <div className="flex items-center gap-1.5">
                  <span>Client / Enterprise</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th className="py-3.5 px-4">Mode &amp; Cargo</th>
              <th className="py-3.5 px-4">Route (Corridor)</th>

              <th
                onClick={() => handleSortToggle("date")}
                className="py-3.5 px-4 cursor-pointer hover:text-slate-900 transition select-none"
              >
                <div className="flex items-center gap-1.5">
                  <span>Submitted</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th className="py-3.5 px-4">Rate / Quote</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {paginatedQuotes.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                  <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p>No quote requests match your current search and filter criteria.</p>
                </td>
              </tr>
            ) : (
              paginatedQuotes.map((quote) => (
                <tr
                  key={quote.id}
                  onClick={() => onSelectQuote(quote)}
                  className={`hover:bg-slate-50/80 transition cursor-pointer ${
                    selectedQuoteId === quote.id ? "bg-red-50/40 font-medium" : ""
                  }`}
                >
                  {/* Ref Number */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#0B2545] group-hover:text-[#d21f27] transition-colors">
                        {quote.id}
                      </span>
                      {quote.shipmentId && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono font-semibold" title={`Shipment ${quote.shipmentId}`}>
                          &rarr; {quote.shipmentId}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Client / Enterprise */}
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900">
                        {quote.clientCompany || "Commercial Enterprise"}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {quote.clientName || "Marc Tremblay"} &bull; {quote.clientEmail}
                      </span>
                    </div>
                  </td>

                  {/* Mode & Cargo */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                        {getModeIcon(quote.transportMode)}
                      </div>
                      <div>
                        <span className="font-medium text-slate-800 block text-xs truncate max-w-[140px]">
                          {quote.equipment}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {quote.weight} {quote.palletCount ? `(${quote.palletCount} Plts)` : ""}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Route (Corridor) */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 font-medium">
                      <span className="text-slate-900 font-semibold">{quote.origin}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-slate-900 font-semibold">{quote.destination}</span>
                    </div>
                  </td>

                  {/* Submitted Date */}
                  <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{quote.submittedDate}</span>
                    </div>
                  </td>

                  {/* Rate / Quoted */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {quote.priceCad && !quote.priceCad.includes("Pending") && !quote.priceCad.includes("Calculating") ? (
                      <span className="font-mono font-bold text-slate-900">
                        {quote.priceCad}
                      </span>
                    ) : (
                      <span className="text-[11px] text-amber-600 font-semibold italic">
                        Unquoted
                      </span>
                    )}
                  </td>

                  {/* Status Badge */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <StatusBadge status={quote.status} size="sm" />
                  </td>

                  {/* Quick Action */}
                  <td className="py-3.5 px-4 whitespace-nowrap text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectQuote(quote);
                      }}
                      className="px-3 py-1.5 bg-[#0B2545] hover:bg-[#d21f27] text-white rounded-xl text-xs font-bold transition shadow-2xs flex items-center gap-1.5 ml-auto cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Review</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View for Dispatchers on Phones */}
      <div className="block md:hidden divide-y divide-slate-100">
        {paginatedQuotes.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            <AlertCircle className="w-7 h-7 text-slate-300 mx-auto mb-1.5" />
            <p>No quotes matching current criteria.</p>
          </div>
        ) : (
          paginatedQuotes.map((quote) => (
            <div
              key={quote.id}
              onClick={() => onSelectQuote(quote)}
              className={`p-4 space-y-3 cursor-pointer hover:bg-slate-50 transition ${
                selectedQuoteId === quote.id ? "bg-red-50/40" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-bold text-[#0B2545] text-sm">{quote.id}</span>
                <StatusBadge status={quote.status} size="sm" />
              </div>

              <div>
                <div className="font-bold text-slate-900 text-xs">{quote.clientName}</div>
                <div className="text-[11px] text-slate-500">{quote.clientEmail}</div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-800 font-semibold">
                <MapPin className="w-3.5 h-3.5 text-[#d21f27] flex-shrink-0" />
                <span>{quote.origin}</span>
                <span className="text-slate-400">→</span>
                <span>{quote.destination}</span>
              </div>

              <div className="text-[11px] text-slate-500">
                {quote.transportMode} &bull; {quote.equipment} &bull; {quote.commodity}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400">Rate Quoted</div>
                  <div className="font-mono font-bold text-slate-900">
                    {quote.priceCad && !quote.priceCad.includes("Pending") && !quote.priceCad.includes("Calculating") ? (
                      quote.priceCad
                    ) : (
                      <span className="text-amber-600 font-semibold italic text-xs">Unquoted</span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectQuote(quote);
                  }}
                  className="px-3.5 py-1.5 bg-[#0B2545] hover:bg-[#d21f27] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Review</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 3. PAGINATION & SUMMARY FOOTER */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
        <div>
          Showing{" "}
          <strong className="text-slate-800">
            {filteredQuotes.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
          </strong>{" "}
          to{" "}
          <strong className="text-slate-800">
            {Math.min(currentPage * pageSize, filteredQuotes.length)}
          </strong>{" "}
          of <strong className="text-slate-800">{filteredQuotes.length}</strong> quotes
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer font-semibold"
            >
              Previous
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition cursor-pointer ${
                  currentPage === page
                    ? "bg-[#0B2545] text-white"
                    : "border border-slate-200 bg-white hover:bg-slate-100 text-slate-700"
                }`}
              >
                {page}
              </button>
            ))}

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer font-semibold"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

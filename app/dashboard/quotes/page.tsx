"use client";

import React, { useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  FileSpreadsheet,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  DollarSign,
  Calendar,
  X,
} from "lucide-react";

export default function QuotesPage() {
  const { t, language } = useLanguage();
  const [showModal, setShowModal] = useState(false);

  const quotes = [
    {
      id: "QT-2026-089",
      origin: "Montreal (QC)",
      destination: "Detroit (MI)",
      equipment: "Refrigerated Reefer",
      weight: "42,000 lbs",
      price: "$4,850.00 CAD",
      validUntil: "Sep 05, 2026",
      status: "pending",
      statusLabel: language === "fr" ? "En Attente de Confirmation" : "Action Required",
    },
    {
      id: "QT-2026-085",
      origin: "Toronto (ON)",
      destination: "Vancouver (BC)",
      equipment: "53' Dry Van",
      weight: "36,500 lbs",
      price: "$6,200.00 CAD",
      validUntil: "Sep 02, 2026",
      status: "accepted",
      statusLabel: language === "fr" ? "Acceptée" : "Accepted",
    },
    {
      id: "QT-2026-077",
      origin: "Quebec City (QC)",
      destination: "Halifax (NS)",
      equipment: "Flatbed / Stepdeck",
      weight: "44,000 lbs",
      price: "$3,150.00 CAD",
      validUntil: "Expired",
      status: "expired",
      statusLabel: language === "fr" ? "Expirée" : "Expired",
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#d21f27]">
            {language === "fr" ? "Tarification Commerciale" : "Freight Pricing"}
          </span>
          <h1
            className="text-2xl sm:text-3xl font-bold text-[#0B2545] tracking-tight leading-tight mt-1"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {t.nav.quotes}
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            {language === "fr"
              ? "Générez des estimations de fret instantanées et confirmez vos réservations de camions."
              : "Generate instant freight estimates and confirm carrier bookings."}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-[#d21f27] hover:bg-[#b51a21] text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>{t.topBar.newQuote}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {quotes.map((quote) => (
          <div
            key={quote.id}
            className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-[#0B2545] font-mono">{quote.id}</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    quote.status === "pending"
                      ? "bg-red-50 text-[#d21f27] border border-red-200"
                      : quote.status === "accepted"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {quote.statusLabel}
                </span>
              </div>
              <div className="text-xs text-slate-700 font-semibold">
                {quote.origin} → {quote.destination} &bull;{" "}
                <span className="text-slate-500 font-normal">{quote.equipment} ({quote.weight})</span>
              </div>
              <div className="text-[11px] text-slate-400">Valid until: {quote.validUntil}</div>
            </div>

            <div className="flex items-center justify-between md:justify-end gap-4 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
              <div className="text-right">
                <div className="text-lg font-bold text-[#0B2545]">{quote.price}</div>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">All-Inclusive CAD</div>
              </div>
              {quote.status === "pending" && (
                <button
                  type="button"
                  onClick={() => alert(`Quote ${quote.id} confirmed and dispatched!`)}
                  className="px-4 py-2 bg-[#0B2545] hover:bg-[#123661] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  {language === "fr" ? "Accepter et Réserver" : "Accept & Book Load"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-xl font-bold text-[#0B2545]">
                {language === "fr" ? "Nouvelle Soumission de Fret" : "Request Instant Freight Quote"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                alert("Quote submitted! Transimex Dispatch will send guaranteed pricing within 15 minutes.");
                setShowModal(false);
              }}
              className="space-y-4 mt-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Origin City</label>
                  <input required placeholder="Montreal, QC" className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-[#0B2545]" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Destination City</label>
                  <input required placeholder="Toronto, ON" className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-[#0B2545]" />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-[#d21f27] hover:bg-[#b51a21] text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-md transition cursor-pointer mt-2"
              >
                Submit Quote Request
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

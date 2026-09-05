"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { QuoteItem } from "@/lib/quoteTypes";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  X,
  Truck,
  MapPin,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  Package,
  FileSpreadsheet,
} from "lucide-react";

interface QuoteDetailsModalProps {
  quote: QuoteItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function QuoteDetailsModal({
  quote,
  isOpen,
  onClose,
}: QuoteDetailsModalProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const [expediting, setExpediting] = useState(false);

  if (!isOpen || !quote) return null;

  const isRejected = quote.status === "rejected";
  const isAccepted = quote.status === "accepted";
  const isPending = quote.status === "under_review";

  return (
    <div className="fixed inset-0 bg-[#0B2545]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-mono font-bold text-[#0B2545] bg-slate-100 px-2.5 py-1 rounded-lg">
                {quote.id}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                  quote.status === "under_review"
                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                    : quote.status === "accepted"
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : quote.status === "rejected"
                    ? "bg-red-100 text-red-800 border border-red-200"
                    : "bg-slate-100 text-slate-600 border border-slate-200"
                }`}
              >
                {language === "fr" ? quote.statusLabelFr : quote.statusLabelEn}
              </span>
            </div>
            <h3
              className="text-xl sm:text-2xl font-bold text-[#0B2545] mt-2"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {language === "fr" ? "Détails de la Soumission" : "Freight Quote Details"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-5 mt-5">
          {/* Rejection Alert Box (if rejected) */}
          {isRejected && (
            <div className="p-4 bg-red-50/80 border-l-4 border-[#d21f27] rounded-xl text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-red-900">
                <ShieldAlert className="w-4 h-4 text-[#d21f27]" />
                <span>
                  {language === "fr"
                    ? "Motif de Refus de l'Administration Transimex"
                    : "Transimex Dispatch Rejection Notice"}
                </span>
              </div>
              <p className="text-red-800 leading-relaxed pl-6 font-medium">
                {quote.rejectionReason || "No reason was provided."}
              </p>
            </div>
          )}

          {/* Route Overview */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {language === "fr" ? "Itinéraire & Adresses" : "Route & Logistics Corridor"}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{language === "fr" ? "Origine" : "Origin"}</span>
                </div>
                <p className="text-slate-600 pl-5 leading-relaxed font-medium">
                  {quote.originDetail || quote.origin}
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <MapPin className="w-4 h-4 text-[#d21f27] flex-shrink-0" />
                  <span>{language === "fr" ? "Destination" : "Destination"}</span>
                </div>
                <p className="text-slate-600 pl-5 leading-relaxed font-medium">
                  {quote.destinationDetail || quote.destination}
                </p>
              </div>
            </div>
          </div>

          {/* Freight & Equipment Specs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                {language === "fr" ? "Mode" : "Mode"}
              </span>
              <span className="font-bold text-slate-900 mt-0.5 block truncate">
                {quote.transportMode}
              </span>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                {language === "fr" ? "Équipement" : "Equipment"}
              </span>
              <span className="font-bold text-slate-900 mt-0.5 block truncate">
                {quote.equipment}
              </span>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                {language === "fr" ? "Poids" : "Weight"}
              </span>
              <span className="font-bold text-slate-900 mt-0.5 block">
                {quote.weight}
              </span>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                {language === "fr" ? "Marchandise" : "Commodity"}
              </span>
              <span className="font-bold text-slate-900 mt-0.5 block truncate">
                {quote.commodity}
              </span>
            </div>
          </div>

          {/* Pricing & Financials (if calculated) */}
          {quote.breakdown ? (
            <div className="p-4 bg-[#0B2545]/5 border border-[#0B2545]/10 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold text-[#0B2545]">
                <span>{language === "fr" ? "Ventilation des Coûts" : "Guaranteed Freight Breakdown"}</span>
                <span className="text-base text-[#d21f27]">{quote.priceCad}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 pt-2 border-t border-slate-200/60 text-[11px]">
                <div>Line Haul Rate: <span className="font-semibold text-slate-900">{quote.breakdown.lineHaul}</span></div>
                <div>Fuel Surcharge (FSC): <span className="font-semibold text-slate-900">{quote.breakdown.fuelSurcharge}</span></div>
                {quote.breakdown.crossBorderFee && (
                  <div>Cross-Border Bond: <span className="font-semibold text-slate-900">{quote.breakdown.crossBorderFee}</span></div>
                )}
                {quote.breakdown.accessorials && (
                  <div>Accessorials: <span className="font-semibold text-slate-900">{quote.breakdown.accessorials}</span></div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-600">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>
                  {language === "fr"
                    ? "Tarif en cours de calcul par la répartition"
                    : "Tariff calculation in progress by Transimex dispatch"}
                </span>
              </div>
              <span className="font-mono font-bold text-slate-800">{quote.priceCad}</span>
            </div>
          )}

          {/* Admin / Dispatch Notes */}
          {quote.adminNotes && (
            <div className="text-xs text-slate-500 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
              <span className="font-bold text-slate-700 block mb-0.5">
                {language === "fr" ? "Notes de Répartition :" : "Dispatch Note:"}
              </span>
              <p>{quote.adminNotes}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-5 mt-5 border-t border-slate-100">
          <div className="text-[11px] text-slate-400">
            {language === "fr" ? "Soumis le :" : "Submitted:"} {quote.submittedDate} &bull; {language === "fr" ? "Validité :" : "Valid until:"} {quote.validUntil}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              {language === "fr" ? "Fermer" : "Close"}
            </button>

            {isAccepted && quote.shipmentId && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.push(`/dashboard/shipments?id=${quote.shipmentId}`);
                }}
                className="px-4 py-2 bg-[#0B2545] hover:bg-[#123661] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <span>{language === "fr" ? "Voir l'Expédition" : "View Shipment"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {isPending && (
              <button
                type="button"
                disabled={expediting}
                onClick={async () => {
                  setExpediting(true);
                  try {
                    await fetch("/api/support", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        subject: `Priority expedite request for quote ${quote.id}`,
                        category: "General Logistics Inquiry",
                        linkedShipmentId: "",
                        priority: "High",
                        message: `Please expedite pricing review for freight quote ${quote.id} (${quote.origin} → ${quote.destination}).`,
                      }),
                    });
                    onClose();
                  } catch {
                    // Non-critical: user can retry from the Support page.
                  } finally {
                    setExpediting(false);
                  }
                }}
                className="px-4 py-2 bg-[#d21f27] hover:bg-[#b51a21] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-60"
              >
                {expediting
                  ? language === "fr"
                    ? "Envoi..."
                    : "Sending..."
                  : language === "fr"
                  ? "Accélérer la Réponse"
                  : "Expedite Quote"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

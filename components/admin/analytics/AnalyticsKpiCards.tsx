"use client";

import React from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { ArrowUpRight } from "lucide-react";

interface AnalyticsKpiCardsProps {
  kpis: {
    totalFreightVolume?: {
      value: number;
      mtd: number;
      lastMonth: number;
      growthPercent: string;
    };
    quoteConversionRate?: {
      value: string;
      accepted: number;
      total: number;
    };
    onTimeDeliveryRate?: {
      value: string | null;
      status: string;
      completedLoads: number;
    };
    activeCustomsHolds?: {
      value: number;
      severity: string;
      inReview: number;
    };
  };
  loading?: boolean;
}

export default function AnalyticsKpiCards({ kpis, loading }: AnalyticsKpiCardsProps) {
  const { language } = useLanguage();
  const placeholder = "—";

  const freight = kpis.totalFreightVolume;
  const conversion = kpis.quoteConversionRate;
  const onTime = kpis.onTimeDeliveryRate;
  const hasOnTimeData = !!onTime?.value;
  const customs = kpis.activeCustomsHolds;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Freight Volume */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {language === "fr" ? "Volume de Fret Total" : "Total Freight Volume"}
          </span>
          {freight && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold flex items-center gap-0.5 border border-emerald-200">
              <ArrowUpRight className="w-3 h-3" />
              <span>{freight.growthPercent} {language === "fr" ? "M/M" : "MoM"}</span>
            </span>
          )}
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl sm:text-4xl font-bold text-[#0B2545] tracking-tight">
            {loading ? placeholder : freight?.value ?? 0}
          </span>
          <span className="text-xs font-semibold text-slate-500">{language === "fr" ? "Chargements Actifs" : "Loads Active"}</span>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>{language === "fr" ? "Mois en Cours :" : "MTD:"} <strong>{loading ? placeholder : freight?.mtd ?? 0}</strong></span>
          <span>{language === "fr" ? "Mois Précédent :" : "Prior Month:"} <strong>{loading ? placeholder : freight?.lastMonth ?? 0}</strong></span>
        </div>
      </div>

      {/* 2. Quote Conversion Rate */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {language === "fr" ? "Taux de Conversion des Soumissions" : "Quote Conversion Rate"}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
            {language === "fr" ? "Rendement du Pipeline" : "Pipeline Yield"}
          </span>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl sm:text-4xl font-bold text-[#0B2545] tracking-tight">
            {loading ? placeholder : conversion?.value ?? "0%"}
          </span>
          <span className="text-xs font-semibold text-slate-500">{language === "fr" ? "Acceptées" : "Accepted"}</span>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>
            {loading ? placeholder : conversion?.accepted ?? 0} {language === "fr" ? "sur" : "of"}{" "}
            {loading ? placeholder : conversion?.total ?? 0} {language === "fr" ? "soumissions converties" : "quotes converted"}
          </span>
        </div>
      </div>

      {/* 3. On-Time Delivery Rate */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {language === "fr" ? "Taux de Livraison à Temps" : "On-Time Delivery Rate"}
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              hasOnTimeData
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-slate-100 text-slate-600 border-slate-200"
            }`}
          >
            {hasOnTimeData
              ? onTime!.status
              : language === "fr"
              ? "Non Suivi Actuellement"
              : "Not Currently Tracked"}
          </span>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className={`text-3xl sm:text-4xl font-bold tracking-tight ${hasOnTimeData ? "text-emerald-700" : "text-slate-400"}`}>
            {loading ? placeholder : onTime?.value ?? "N/A"}
          </span>
          <span className="text-xs font-semibold text-slate-500">{language === "fr" ? "à temps / avant l'ETA" : "at / before ETA"}</span>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>
            {loading ? placeholder : onTime?.completedLoads ?? 0} {language === "fr" ? "Manifestes Complétés" : "Completed Manifests"}
          </span>
        </div>
      </div>

      {/* 4. Active Customs Holds */}
      <div
        className={`bg-white rounded-2xl p-5 border shadow-2xs hover:shadow-xs transition ${
          (customs?.value ?? 0) > 0 ? "border-amber-200" : "border-slate-200/90"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {language === "fr" ? "Blocages Douaniers Actifs" : "Active Customs Holds"}
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              (customs?.value ?? 0) > 2
                ? "bg-red-50 text-red-700 border border-red-200"
                : "bg-amber-50 text-amber-800 border border-amber-200"
            }`}
          >
            {(customs?.value ?? 0) > 0
              ? language === "fr"
                ? "Révision ASFC / CBP"
                : "CBSA / CBP Review"
              : language === "fr"
              ? "Passage Dégagé"
              : "Clear Passage"}
          </span>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span
            className={`text-3xl sm:text-4xl font-bold tracking-tight ${
              (customs?.value ?? 0) > 0 ? "text-[#d21f27]" : "text-slate-800"
            }`}
          >
            {loading ? placeholder : customs?.value ?? 0}
          </span>
          <span className="text-xs font-semibold text-slate-500">{language === "fr" ? "Arrêts Frontaliers" : "Border Stalls"}</span>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>
            {loading ? placeholder : customs?.inReview ?? 0} {language === "fr" ? "en documentation du courtier" : "under broker documentation"}
          </span>
        </div>
      </div>
    </div>
  );
}

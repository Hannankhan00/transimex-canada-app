"use client";

import React from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { formatDateTimeLabel } from "@/lib/formatDate";
import { Ship, Anchor, Clock } from "lucide-react";

/** Mirrors ClientVesselView (lib/tracking/clientView.ts) — carries no carrier name or booking reference. */
export interface VesselView {
  vesselName?: string;
  imoNumber?: string;
  voyageNumber?: string;
  originPort?: { unLocationCode: string; portName: string };
  destinationPort?: { unLocationCode: string; portName: string };
  legs: {
    role: "ORIGIN" | "TRANSSHIPMENT" | "DESTINATION";
    portName?: string;
    unLocationCode?: string;
    vesselName?: string;
    voyageNumber?: string;
  }[];
  status: "PENDING" | "IN_TRANSIT" | "DELIVERED";
  arrival?: { dateTime: string; actual: boolean };
  lastSyncedAt: string | null;
}

const ROLE_LABEL: Record<string, { en: string; fr: string }> = {
  ORIGIN: { en: "Port of loading", fr: "Port de chargement" },
  TRANSSHIPMENT: { en: "Transshipment", fr: "Transbordement" },
  DESTINATION: { en: "Port of discharge", fr: "Port de déchargement" },
};

export default function VesselInfoCard({ vessel }: { vessel: VesselView }) {
  const { language } = useLanguage();
  const fr = language === "fr";

  return (
    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
        <Ship className="w-3.5 h-3.5 text-[#0B2545]" />
        <span>{fr ? "Navire" : "Vessel"}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="col-span-2 sm:col-span-1 min-w-0">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            {fr ? "Nom du navire" : "Vessel name"}
          </span>
          <span className="font-bold text-[#0B2545] block truncate">{vessel.vesselName || "—"}</span>
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            {fr ? "N° OMI" : "IMO number"}
          </span>
          <span className="font-mono text-slate-800">{vessel.imoNumber || "—"}</span>
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Voyage</span>
          <span className="font-mono text-slate-800">{vessel.voyageNumber || "—"}</span>
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            {vessel.arrival?.actual ? (fr ? "Arrivé" : "Arrived") : fr ? "Arrivée prévue" : "Estimated arrival"}
          </span>
          <span className="text-slate-800">
            {vessel.arrival ? formatDateTimeLabel(vessel.arrival.dateTime) : fr ? "À confirmer" : "To be confirmed"}
          </span>
        </div>
      </div>

      {vessel.originPort && vessel.destinationPort && (
        <div className="text-xs text-slate-700 flex items-center gap-1.5 flex-wrap">
          <Anchor className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className="font-semibold">{vessel.originPort.portName}</span>
          <span className="text-slate-400">→</span>
          <span className="font-semibold">{vessel.destinationPort.portName}</span>
        </div>
      )}

      {vessel.legs.length > 1 && (
        <ol className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100 text-xs">
          {vessel.legs.map((leg, i) => (
            <li key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-3 py-2">
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  {fr ? ROLE_LABEL[leg.role]?.fr : ROLE_LABEL[leg.role]?.en}
                </span>
                <span className="font-semibold text-slate-800">{leg.portName || leg.unLocationCode}</span>
              </div>
              {leg.vesselName && (
                <span className="text-[11px] text-slate-600 flex items-center gap-1">
                  <Ship className="w-3 h-3 text-slate-400 flex-shrink-0" />
                  {leg.vesselName}
                  {leg.voyageNumber ? <span className="font-mono text-slate-400">({leg.voyageNumber})</span> : null}
                </span>
              )}
            </li>
          ))}
        </ol>
      )}

      {vessel.lastSyncedAt && (
        <div className="text-[10px] text-slate-400 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>
            {fr ? "Dernière mise à jour : " : "Last updated: "}
            {formatDateTimeLabel(vessel.lastSyncedAt)}
          </span>
        </div>
      )}
    </div>
  );
}

"use client";

import React from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { formatDateTimeLabel } from "@/lib/formatDate";
import {
  Ship,
  PackageCheck,
  Container as ContainerIcon,
  Anchor,
  Repeat,
  Warehouse,
  DoorOpen,
  Truck,
  Clock,
  CheckCircle2,
} from "lucide-react";

/**
 * Reads only the internal DCSA-modeled schema (lib/tracking/schema.ts) — it
 * has no idea whether the data came from a mock fixture or a live carrier
 * call, which is the point: it renders identically either way.
 */
export interface TimelineEvent {
  eventType: string;
  eventClassifierCode: "PLN" | "EST" | "ACT";
  eventDateTime: string;
  location: { unLocationCode: string; portName: string; facility?: string };
  vesselName?: string;
  voyageNumber?: string;
  description?: string;
}

export interface ContainerTrackingView {
  containerNumber: string;
  containerSizeType?: string;
  containerSizeLabel?: string;
  blNumber?: string;
  bookingNumber?: string;
  carrier: string;
  carrierDetectionSource: "explicit" | "prefix";
  vesselName?: string;
  voyageNumber?: string;
  originPort?: { unLocationCode: string; portName: string };
  destinationPort?: { unLocationCode: string; portName: string };
  events: TimelineEvent[];
  status: "PENDING" | "IN_TRANSIT" | "DELIVERED";
  lastSyncedAt: string | null;
}

const EVENT_ICON: Record<string, React.ElementType> = {
  BOOKING: PackageCheck,
  GATE_IN: Warehouse,
  LOADED: ContainerIcon,
  VESSEL_DEPARTURE: Ship,
  TRANSSHIPMENT: Repeat,
  DISCHARGE: Anchor,
  GATE_OUT: DoorOpen,
  DELIVERED: Truck,
};

const EVENT_LABEL: Record<string, { en: string; fr: string }> = {
  BOOKING: { en: "Booking Confirmed", fr: "Réservation Confirmée" },
  GATE_IN: { en: "Gate In", fr: "Entrée au Terminal" },
  LOADED: { en: "Loaded on Vessel", fr: "Chargé sur le Navire" },
  VESSEL_DEPARTURE: { en: "Vessel Departure", fr: "Départ du Navire" },
  TRANSSHIPMENT: { en: "Transshipment", fr: "Transbordement" },
  DISCHARGE: { en: "Discharged", fr: "Déchargé" },
  GATE_OUT: { en: "Gate Out", fr: "Sortie du Terminal" },
  DELIVERED: { en: "Delivered", fr: "Livré" },
};

const CARRIER_LABEL: Record<string, string> = {
  MAERSK: "Maersk",
  CMA_CGM: "CMA CGM",
  MSC: "MSC",
};

const STATUS_BADGE: Record<string, { en: string; fr: string; className: string }> = {
  PENDING: { en: "Pending", fr: "En Attente", className: "bg-slate-100 text-slate-700" },
  IN_TRANSIT: { en: "In Transit", fr: "En Transit", className: "bg-blue-100 text-blue-800" },
  DELIVERED: { en: "Delivered", fr: "Livré", className: "bg-emerald-100 text-emerald-800" },
};

interface Props {
  tracking: ContainerTrackingView | null;
  loading?: boolean;
  error?: string | null;
}

export default function ContainerMilestoneTimeline({ tracking, loading, error }: Props) {
  const { language } = useLanguage();

  if (loading) {
    return (
      <div className="p-6 text-center text-slate-400 text-xs">
        {language === "fr" ? "Chargement du suivi du conteneur..." : "Loading container tracking..."}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
        {error}
      </div>
    );
  }

  if (!tracking) {
    return (
      <div className="p-6 text-center text-slate-400 text-xs">
        {language === "fr"
          ? "Aucune donnée de suivi disponible pour ce conteneur pour le moment."
          : "No tracking data available for this container yet."}
      </div>
    );
  }

  const sortedEvents = [...tracking.events].sort(
    (a, b) => new Date(a.eventDateTime).getTime() - new Date(b.eventDateTime).getTime()
  );

  const statusBadge = STATUS_BADGE[tracking.status];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-[#0B2545] text-sm">{tracking.containerNumber}</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
              {CARRIER_LABEL[tracking.carrier] || tracking.carrier}
            </span>
            {statusBadge && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadge.className}`}>
                {language === "fr" ? statusBadge.fr : statusBadge.en}
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
            {tracking.originPort && tracking.destinationPort && (
              <span>
                {tracking.originPort.portName} → {tracking.destinationPort.portName}
              </span>
            )}
            {tracking.vesselName && (
              <span>
                • {tracking.vesselName}
                {tracking.voyageNumber ? ` (${tracking.voyageNumber})` : ""}
              </span>
            )}
          </div>
        </div>
        {tracking.lastSyncedAt && (
          <div className="text-[10px] text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>
              {language === "fr" ? "Dernière synchronisation : " : "Last synced: "}
              {formatDateTimeLabel(tracking.lastSyncedAt)}
            </span>
          </div>
        )}
      </div>

      {/* Milestone steps */}
      {sortedEvents.length === 0 ? (
        <div className="p-6 text-center text-slate-400 text-xs">
          {language === "fr" ? "Aucun jalon signalé pour le moment." : "No milestones reported yet."}
        </div>
      ) : (
        <ol className="space-y-0">
          {sortedEvents.map((event, i) => {
            const Icon = EVENT_ICON[event.eventType] || Ship;
            const isActual = event.eventClassifierCode === "ACT";
            const isLast = i === sortedEvents.length - 1;
            const label = EVENT_LABEL[event.eventType];

            return (
              <li key={`${event.eventType}-${event.eventDateTime}-${i}`} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                      isActual
                        ? "bg-[#0B2545] border-[#0B2545] text-white"
                        : "bg-white border-slate-200 text-slate-400"
                    }`}
                  >
                    {isActual ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  {!isLast && <div className={`w-px flex-1 min-h-6 ${isActual ? "bg-[#0B2545]/30" : "bg-slate-200"}`} />}
                </div>
                <div className="flex-1 min-w-0 pb-5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-bold ${isActual ? "text-[#0B2545]" : "text-slate-500"}`}>
                      {label ? (language === "fr" ? label.fr : label.en) : event.eventType}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${
                        isActual ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {isActual
                        ? language === "fr"
                          ? "Réel"
                          : "Actual"
                        : language === "fr"
                        ? "Estimé"
                        : "Estimated"}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {formatDateTimeLabel(event.eventDateTime)} · {event.location.portName}
                    {event.vesselName ? ` · ${event.vesselName}${event.voyageNumber ? ` (${event.voyageNumber})` : ""}` : ""}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

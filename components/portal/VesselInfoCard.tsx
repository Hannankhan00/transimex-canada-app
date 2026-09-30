"use client";

import React from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { formatDateLabel, formatDateTimeLabel } from "@/lib/formatDate";
import {
  computeVoyageProgress,
  formatPortName,
  PortMoment,
  VoyageEvent,
  VoyageLeg,
  VoyagePhase,
} from "@/lib/tracking/voyageProgress";
import { Ship, Check, Clock, CalendarClock, MapPin } from "lucide-react";

/** Mirrors ClientVesselView (lib/tracking/clientView.ts) — carries no carrier name or booking reference. */
export interface VesselView {
  vesselName?: string;
  imoNumber?: string;
  voyageNumber?: string;
  originPort?: { unLocationCode: string; portName: string };
  destinationPort?: { unLocationCode: string; portName: string };
  legs: VoyageLeg[];
  events: VoyageEvent[];
  status: "PENDING" | "IN_TRANSIT" | "DELIVERED";
  arrival?: { dateTime: string; actual: boolean };
  lastSyncedAt: string | null;
}

const PHASE_BADGE: Record<VoyagePhase, { en: string; fr: string; className: string }> = {
  AWAITING_DEPARTURE: { en: "Awaiting departure", fr: "En attente de départ", className: "bg-slate-100 text-slate-700" },
  AT_SEA: { en: "At sea", fr: "En mer", className: "bg-blue-50 text-blue-800" },
  AT_PORT: { en: "At transshipment port", fr: "Au port de transbordement", className: "bg-amber-50 text-amber-800" },
  ARRIVED: { en: "Arrived", fr: "Arrivé", className: "bg-emerald-50 text-emerald-800" },
};

const ROLE_LABEL: Record<string, { en: string; fr: string }> = {
  ORIGIN: { en: "Port of loading", fr: "Port de chargement" },
  TRANSSHIPMENT: { en: "Transshipment", fr: "Transbordement" },
  DESTINATION: { en: "Port of discharge", fr: "Port de déchargement" },
};

function daysUntil(dateTime: string): number {
  return Math.ceil((new Date(dateTime).getTime() - Date.now()) / 86_400_000);
}

function momentLabel(m: PortMoment | undefined, fr: boolean): string {
  if (!m) return fr ? "Date à confirmer" : "Date to be confirmed";
  const date = formatDateLabel(m.dateTime);
  if (m.kind === "departure") {
    return m.actual ? `${fr ? "Parti le" : "Departed"} ${date}` : `${fr ? "Départ prévu le" : "Est. departure"} ${date}`;
  }
  return m.actual ? `${fr ? "Arrivé le" : "Arrived"} ${date}` : `${fr ? "Arrivée prévue le" : "Est. arrival"} ${date}`;
}

function VesselDetails({ leg, fr }: { leg: VoyageLeg; fr: boolean }) {
  const details = [
    leg.imoNumber ? `${fr ? "OMI" : "IMO"} ${leg.imoNumber}` : null,
    leg.voyageNumber ? `${fr ? "Voyage" : "Voyage"} ${leg.voyageNumber}` : null,
  ].filter(Boolean);
  return (
    <div className="min-w-0">
      <div className="font-semibold text-slate-800 text-xs truncate">{leg.vesselName}</div>
      {details.length > 0 && <div className="font-mono text-[10px] text-slate-500">{details.join(" · ")}</div>}
    </div>
  );
}

export default function VesselInfoCard({ vessel }: { vessel: VesselView }) {
  const { language } = useLanguage();
  const fr = language === "fr";

  const progress = computeVoyageProgress(vessel.legs, vessel.events || []);
  const { phase, ports, lastReached, sailingLeg, featuredVessel } = progress;
  const badge = PHASE_BADGE[phase];
  const origin = formatPortName(vessel.originPort?.portName || vessel.legs[0]?.portName);
  const destination = formatPortName(vessel.destinationPort?.portName || vessel.legs[vessel.legs.length - 1]?.portName);

  // One plain-language sentence on where the cargo is.
  const next = ports[lastReached + 1];
  const nextLabel = next
    ? `${fr ? "Prochaine escale" : "Next stop"}: ${formatPortName(next.leg.portName)}${
        next.moment ? ` (${fr ? "prévue le" : "est."} ${formatDateLabel(next.moment.dateTime)})` : ""
      }`
    : "";
  let summary = "";
  if (phase === "ARRIVED") {
    const m = ports[ports.length - 1]?.moment;
    summary = `${fr ? "Arrivé à" : "Arrived at"} ${destination}${m ? ` ${fr ? "le" : "on"} ${formatDateLabel(m.dateTime)}` : ""}.`;
  } else if (phase === "AWAITING_DEPARTURE") {
    const m = ports[0]?.moment;
    summary = m
      ? `${fr ? "Départ prévu de" : "Scheduled to depart"} ${origin} ${fr ? "le" : "on"} ${formatDateLabel(m.dateTime)}.`
      : `${fr ? "En attente de départ de" : "Awaiting departure from"} ${origin}.`;
  } else if (phase === "AT_SEA") {
    const from = ports[sailingLeg];
    const leftAt = from.departure ?? from.moment;
    summary = `${fr ? "Parti de" : "Departed"} ${formatPortName(from.leg.portName)}${
      leftAt ? ` ${fr ? "le" : "on"} ${formatDateLabel(leftAt.dateTime)}` : ""
    }. ${nextLabel}`;
  } else {
    const at = ports[lastReached];
    summary = `${fr ? "Au port de" : "At"} ${formatPortName(at.leg.portName)} ${
      fr ? "pour transbordement" : "for transshipment"
    }${at.departure ? `. ${momentLabel(at.departure, fr)}` : ""}.`;
  }

  const featuredLabel =
    phase === "AT_SEA"
      ? fr ? "À bord de" : "On board"
      : phase === "AT_PORT"
      ? fr ? "Prochain navire" : "Next vessel"
      : phase === "ARRIVED"
      ? fr ? "Arrivé à bord de" : "Arrived on"
      : fr ? "Navire prévu" : "Scheduled vessel";

  const days = vessel.arrival && !vessel.arrival.actual ? daysUntil(vessel.arrival.dateTime) : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* Summary */}
      <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 bg-slate-50/60 border-b border-slate-200">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {fr ? "Fret maritime" : "Ocean freight"}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.className}`}>
              {fr ? badge.fr : badge.en}
            </span>
          </div>

          {featuredVessel?.vesselName && (
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0B2545] flex items-center justify-center flex-shrink-0">
                <Ship className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold text-slate-500">{featuredLabel}</div>
                <div className="text-base font-extrabold text-[#0B2545] leading-tight truncate">
                  {featuredVessel.vesselName}
                </div>
                <div className="font-mono text-[11px] text-slate-500">
                  {[
                    featuredVessel.imoNumber && `IMO ${featuredVessel.imoNumber}`,
                    featuredVessel.voyageNumber && `${fr ? "Voyage" : "Voyage"} ${featuredVessel.voyageNumber}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </div>
            </div>
          )}

          <p className="text-xs text-slate-600">{summary}</p>
        </div>

        {/* Arrival */}
        <div className="md:w-56 rounded-xl bg-white border border-slate-200 p-3.5 flex md:flex-col items-center md:items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <CalendarClock className="w-3.5 h-3.5 text-[#d21f27]" />
            {vessel.arrival?.actual ? (fr ? "Arrivé à" : "Arrived at") : fr ? "Arrivée prévue à" : "Arriving at"}{" "}
            {destination}
          </div>
          <div className="text-right md:text-left">
            <div className="text-lg font-extrabold text-[#0B2545] leading-tight">
              {vessel.arrival ? formatDateLabel(vessel.arrival.dateTime) : fr ? "À confirmer" : "To be confirmed"}
            </div>
            {days !== null && (
              <div className="text-[11px] font-semibold text-slate-500">
                {days > 1
                  ? fr ? `dans ${days} jours` : `in ${days} days`
                  : days === 1
                  ? fr ? "demain" : "tomorrow"
                  : fr ? "imminente" : "due now"}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Route */}
      {ports.length > 0 && (
        <ol className="p-4 sm:p-5">
          {ports.map((port, i) => {
            const isLast = i === ports.length - 1;
            const done = i <= lastReached;
            const isNext = i === lastReached + 1;
            const legStarted = port.departed || i < lastReached;
            const onBoardNow = i === sailingLeg;

            return (
              <li key={i} className="grid grid-cols-[24px_1fr] gap-x-3">
                {/* Port node */}
                <div className="flex justify-center">
                  <span
                    className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${
                      done
                        ? "bg-[#0B2545] border-[#0B2545]"
                        : isNext
                        ? "bg-white border-[#d21f27]"
                        : "bg-white border-slate-300"
                    }`}
                  >
                    {done ? (
                      <Check className="w-3.5 h-3.5 text-white" />
                    ) : isLast ? (
                      <MapPin className={`w-3 h-3 ${isNext ? "text-[#d21f27]" : "text-slate-400"}`} />
                    ) : null}
                  </span>
                </div>
                <div className="pb-1 min-w-0 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-x-3">
                  <div className="min-w-0">
                    <span className="font-bold text-sm text-slate-900">{formatPortName(port.leg.portName)}</span>
                    <span className="ml-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {fr ? ROLE_LABEL[port.leg.role]?.fr : ROLE_LABEL[port.leg.role]?.en}
                    </span>
                  </div>
                  <span
                    className={`text-[11px] whitespace-nowrap ${
                      port.moment?.actual ? "text-slate-700 font-semibold" : "text-slate-500"
                    }`}
                  >
                    {momentLabel(port.moment, fr)}
                  </span>
                </div>

                {/* Leg to the next port, with the vessel that sails it */}
                {!isLast && (
                  <>
                    <div className="flex justify-center">
                      <span
                        className={`my-1 min-h-12 ${
                          legStarted ? "w-0.5 bg-[#0B2545]" : "border-l-2 border-dashed border-slate-300"
                        }`}
                      />
                    </div>
                    <div className="py-2.5">
                      {port.leg.vesselName ? (
                        <div
                          className={`inline-flex items-center gap-2.5 max-w-full rounded-lg border px-3 py-2 ${
                            onBoardNow ? "border-[#0B2545] bg-[#0B2545]/5" : "border-slate-200 bg-slate-50"
                          }`}
                        >
                          <Ship className={`w-4 h-4 flex-shrink-0 ${onBoardNow ? "text-[#0B2545]" : "text-slate-400"}`} />
                          <VesselDetails leg={port.leg} fr={fr} />
                          {onBoardNow && (
                            <span className="ml-1 px-1.5 py-0.5 rounded bg-[#0B2545] text-white text-[9px] font-bold uppercase tracking-wider whitespace-nowrap">
                              {fr ? "En cours" : "Current"}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          {fr ? "Navire à confirmer" : "Vessel to be confirmed"}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {vessel.lastSyncedAt && (
        <div className="px-4 sm:px-5 py-2.5 border-t border-slate-100 text-[10px] text-slate-400 flex items-center gap-1">
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

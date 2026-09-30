"use client";

import React, { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import ContainerMilestoneTimeline, {
  ContainerTrackingView,
  TimelineEvent,
} from "@/components/portal/ContainerMilestoneTimeline";
import { Ship, RefreshCw, Trash2, AlertTriangle, ChevronDown, ChevronUp, FileText } from "lucide-react";

type Location = { unLocationCode?: string; portName?: string; facility?: string };

export interface CarrierBookingView {
  carrier: string;
  reference: string;
  vesselName?: string;
  imoNumber?: string;
  voyageNumber?: string;
  originPort?: Location;
  destinationPort?: Location;
  portRotation: {
    sequence: number;
    role: "ORIGIN" | "TRANSSHIPMENT" | "DESTINATION";
    unLocationCode?: string;
    portName?: string;
    vesselName?: string;
    voyageNumber?: string;
  }[];
  events: TimelineEvent[];
  status: "PENDING" | "IN_TRANSIT" | "DELIVERED";
  containerNumbers: string[];
  lastSyncedAt: string | null;
  lastError?: string;
}

// Only carriers whose adapter implements a booking/B/L lookup are offered.
const BOOKING_CARRIERS = [{ value: "CMA_CGM", label: "CMA CGM" }];

const ROLE_LABEL: Record<string, { en: string; fr: string }> = {
  ORIGIN: { en: "Loading port", fr: "Port de chargement" },
  TRANSSHIPMENT: { en: "Transshipment", fr: "Transbordement" },
  DESTINATION: { en: "Discharge port", fr: "Port de déchargement" },
};

interface CarrierBookingPanelProps {
  shipmentId: string;
  booking: CarrierBookingView | null;
  onChanged: () => Promise<void> | void;
}

export default function CarrierBookingPanel({ shipmentId, booking, onChanged }: CarrierBookingPanelProps) {
  const { language } = useLanguage();
  const fr = language === "fr";

  const [carrier, setCarrier] = useState(booking?.carrier || "CMA_CGM");
  const [reference, setReference] = useState(booking?.reference || "");
  const [editing, setEditing] = useState(!booking);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "warn" | "ok"; text: string } | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);

  useEffect(() => {
    setCarrier(booking?.carrier || "CMA_CGM");
    setReference(booking?.reference || "");
    setEditing(!booking);
  }, [booking]);

  const endpoint = `/api/admin/shipments/${encodeURIComponent(shipmentId)}/booking`;

  const track = async (ref: string, car: string) => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carrier: car, reference: ref.trim() }),
      });
      const data = await res.json();
      if (res.status === 207 || data.warning) {
        setMessage({ tone: "warn", text: data.warning });
      } else if (!res.ok) {
        setMessage({ tone: "warn", text: data.error || "Failed to track booking" });
        return;
      } else if (data.containersAdded?.length) {
        setMessage({
          tone: "ok",
          text: fr
            ? `${data.containersAdded.length} conteneur(s) ajouté(s) : ${data.containersAdded.join(", ")}`
            : `${data.containersAdded.length} container(s) added: ${data.containersAdded.join(", ")}`,
        });
      }
      await onChanged();
    } catch {
      setMessage({ tone: "warn", text: fr ? "Échec du suivi de la réservation." : "Failed to track booking." });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    const ok = window.confirm(
      fr
        ? "Arrêter le suivi de cette réservation ? Les conteneurs déjà ajoutés restent sur l'expédition."
        : "Stop tracking this booking? Containers already added stay on the shipment."
    );
    if (!ok) return;
    setBusy(true);
    try {
      await fetch(endpoint, { method: "DELETE" });
      setMessage(null);
      await onChanged();
    } finally {
      setBusy(false);
    }
  };

  const timelineView: ContainerTrackingView | null = booking
    ? {
        containerNumber: booking.reference,
        bookingNumber: booking.reference,
        carrier: booking.carrier,
        carrierDetectionSource: "explicit",
        vesselName: booking.vesselName,
        voyageNumber: booking.voyageNumber,
        originPort: booking.originPort?.portName
          ? { unLocationCode: booking.originPort.unLocationCode || "", portName: booking.originPort.portName }
          : undefined,
        destinationPort: booking.destinationPort?.portName
          ? { unLocationCode: booking.destinationPort.unLocationCode || "", portName: booking.destinationPort.portName }
          : undefined,
        events: booking.events,
        status: booking.status,
        lastSyncedAt: booking.lastSyncedAt,
      }
    : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-[#0B2545] flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#d21f27]" />
          {fr ? "Réservation du Transporteur" : "Carrier Booking"}
        </h2>
        {booking && !editing && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => track(booking.reference, booking.carrier)}
              title={fr ? "Synchroniser" : "Sync now"}
              className="p-1.5 rounded-lg text-slate-500 hover:text-[#0B2545] hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${busy ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setEditing(true)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              {fr ? "Modifier" : "Change"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={remove}
              title={fr ? "Retirer" : "Remove"}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              track(reference, carrier);
            }}
            className="flex flex-col sm:flex-row gap-2.5"
          >
            <select
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className="bg-slate-50 border border-slate-200 focus:border-[#0B2545] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none transition"
            >
              {BOOKING_CARRIERS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              required
              placeholder="CAN1028600"
              value={reference}
              onChange={(e) => setReference(e.target.value.toUpperCase())}
              className="flex-1 min-w-0 bg-slate-50 border border-slate-200 focus:border-[#0B2545] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-800 outline-none transition"
            />
            <div className="flex gap-2">
              {booking && (
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-3 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  {fr ? "Annuler" : "Cancel"}
                </button>
              )}
              <button
                type="submit"
                disabled={busy || !reference.trim()}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-[#0B2545] hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                {busy ? (fr ? "Recherche..." : "Looking up...") : fr ? "Suivre la Réservation" : "Track Booking"}
              </button>
            </div>
          </form>
          <p className="text-[10px] text-slate-400">
            {fr
              ? "Numéro de réservation ou de connaissement tel qu'indiqué par le transporteur. Le navire et les conteneurs assignés sont récupérés automatiquement. Maersk et MSC : ajoutez les numéros de conteneur ci-dessous."
              : "The booking or B/L number exactly as the carrier shows it. The vessel and any assigned containers are picked up automatically. For Maersk and MSC, add container numbers below instead."}
          </p>
        </>
      ) : (
        booking && (
          <div className="space-y-4">
            {/* Vessel */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  {fr ? "Référence" : "Reference"}
                </span>
                <span className="font-mono font-bold text-[#0B2545]">{booking.reference}</span>
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  {fr ? "Navire" : "Vessel"}
                </span>
                <span className="font-semibold text-slate-800 flex items-center gap-1 min-w-0">
                  <Ship className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span className="truncate">{booking.vesselName || "—"}</span>
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  {fr ? "N° OMI" : "IMO Number"}
                </span>
                <span className="font-mono text-slate-800">{booking.imoNumber || "—"}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  {fr ? "Voyage" : "Voyage"}
                </span>
                <span className="font-mono text-slate-800">{booking.voyageNumber || "—"}</span>
              </div>
            </div>

            {/* Route with the vessel on each leg */}
            {booking.portRotation.length > 0 && (
              <ol className="rounded-xl border border-slate-200 divide-y divide-slate-100 text-xs">
                {booking.portRotation.map((p) => (
                  <li key={p.sequence} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-3 py-2">
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        {fr ? ROLE_LABEL[p.role]?.fr : ROLE_LABEL[p.role]?.en}
                      </span>
                      <span className="font-semibold text-slate-800">
                        {p.portName || p.unLocationCode}
                        {p.unLocationCode && p.portName ? (
                          <span className="font-mono text-[10px] text-slate-400 ml-1">{p.unLocationCode}</span>
                        ) : null}
                      </span>
                    </div>
                    {p.vesselName && (
                      <span className="text-[11px] text-slate-600 flex items-center gap-1">
                        <Ship className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        {p.vesselName}
                        {p.voyageNumber ? <span className="font-mono text-slate-400">({p.voyageNumber})</span> : null}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            )}

            <p className="text-[11px] text-slate-500">
              {booking.containerNumbers.length > 0
                ? `${fr ? "Conteneurs sur cette réservation" : "Containers on this booking"}: ${booking.containerNumbers.join(", ")}`
                : fr
                ? "Aucun conteneur assigné par le transporteur pour le moment — ils seront ajoutés automatiquement."
                : "The carrier hasn't assigned a container yet — it will be added automatically once it does."}
            </p>

            {booking.events.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowTimeline((v) => !v)}
                  className="text-[11px] font-bold text-[#0B2545] flex items-center gap-1 cursor-pointer"
                >
                  {showTimeline ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {fr ? "Mouvements du navire" : "Vessel movements"}
                </button>
                {showTimeline && timelineView && (
                  <div className="mt-3">
                    <ContainerMilestoneTimeline tracking={timelineView} />
                  </div>
                )}
              </div>
            )}
          </div>
        )
      )}

      {(message || (booking?.lastError && !editing)) && (
        <div
          className={`p-2.5 rounded-lg text-[11px] font-medium flex items-center gap-2 border ${
            message?.tone === "ok"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-amber-50 border-amber-200 text-amber-800"
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{message ? message.text : booking?.lastError}</span>
        </div>
      )}
    </div>
  );
}

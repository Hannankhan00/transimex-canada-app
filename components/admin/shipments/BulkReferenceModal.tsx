"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { X, Ship, AlertTriangle, CheckCircle2 } from "lucide-react";

export interface BulkTargetShipment {
  id: string;
  origin: string;
  destination: string;
  booking: { carrier: string; reference: string; vesselName?: string } | null;
}

interface ItemResult {
  id: string;
  status: "updated" | "unchanged" | "skipped" | "failed";
  containersAdded: string[];
  error?: string;
}

interface BulkReferenceModalProps {
  isOpen: boolean;
  shipments: BulkTargetShipment[];
  onClose: () => void;
  /** Called after a successful assignment so the directory can reload. */
  onDone: () => void;
}

type Mode = "booking" | "container";

const CARRIER_LABEL: Record<string, string> = { MAERSK: "Maersk", CMA_CGM: "CMA CGM", MSC: "MSC" };
const BOOKING_CARRIERS = ["CMA_CGM", "MAERSK"];
const CONTAINER_CARRIERS = ["", "MAERSK", "CMA_CGM", "MSC"];

export default function BulkReferenceModal({ isOpen, shipments, onClose, onDone }: BulkReferenceModalProps) {
  const { language } = useLanguage();
  const fr = language === "fr";

  const [mode, setMode] = useState<Mode>("booking");
  const [carrier, setCarrier] = useState("CMA_CGM");
  const [reference, setReference] = useState("");
  const [overwrite, setOverwrite] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<{ items: ItemResult[]; warning?: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setMode("booking");
    setCarrier("CMA_CGM");
    setReference("");
    setOverwrite(new Set());
    setError(null);
    setOutcome(null);
  }, [isOpen]);

  const changeMode = (next: Mode) => {
    setMode(next);
    setCarrier(next === "booking" ? "CMA_CGM" : "");
    setReference("");
    setError(null);
  };

  const ref = reference.trim().toUpperCase();

  // Shipments already tracking a different booking need an explicit decision.
  const conflicts = useMemo(
    () =>
      mode !== "booking"
        ? []
        : shipments.filter((s) => s.booking && (s.booking.reference !== ref || s.booking.carrier !== carrier)),
    [mode, shipments, ref, carrier]
  );

  if (!isOpen) return null;

  // Reload the directory once the admin has seen the results.
  const close = () => {
    if (outcome) onDone();
    onClose();
  };

  const toggleOverwrite = (id: string) =>
    setOverwrite((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/shipments/bulk-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          carrier,
          reference: ref,
          shipmentIds: shipments.map((s) => s.id),
          overwriteIds: conflicts.filter((s) => overwrite.has(s.id)).map((s) => s.id),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || (fr ? "Échec de l'assignation." : "Failed to assign."));
        return;
      }
      setOutcome({ items: data.items, warning: data.warning });
    } catch {
      setError(fr ? "Échec de l'assignation." : "Failed to assign.");
    } finally {
      setBusy(false);
    }
  };

  const statusLabel = (s: ItemResult["status"]) =>
    ({
      updated: fr ? "Mis à jour" : "Updated",
      unchanged: fr ? "Déjà à jour" : "Already set",
      skipped: fr ? "Ignoré" : "Skipped",
      failed: fr ? "Échec" : "Failed",
    })[s];

  const inputCls =
    "bg-slate-50 border border-slate-200 focus:border-[#0B2545] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none transition";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[#0B2545] flex items-center gap-2">
              <Ship className="w-4 h-4 text-[#d21f27]" />
              {fr ? "Assigner une référence du transporteur" : "Assign carrier reference"}
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {fr
                ? `${shipments.length} expédition(s) sélectionnée(s) — une seule recherche chez le transporteur.`
                : `${shipments.length} shipment(s) selected — one carrier lookup for all of them.`}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {outcome ? (
          <div className="space-y-3">
            {outcome.warning && (
              <div className="p-2.5 rounded-lg text-[11px] font-medium flex items-start gap-2 border bg-amber-50 border-amber-200 text-amber-800">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{outcome.warning}</span>
              </div>
            )}
            <ul className="rounded-xl border border-slate-200 divide-y divide-slate-100 text-xs">
              {outcome.items.map((item) => (
                <li key={item.id} className="px-3 py-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-mono font-bold text-[#0B2545]">{item.id}</span>
                    {item.containersAdded.length > 0 && (
                      <span className="block text-[10px] text-slate-500 font-mono">
                        + {item.containersAdded.join(", ")}
                      </span>
                    )}
                    {item.error && <span className="block text-[10px] text-slate-500">{item.error}</span>}
                  </div>
                  <span
                    className={`flex items-center gap-1 text-[10px] font-bold flex-shrink-0 ${
                      item.status === "updated" || item.status === "unchanged"
                        ? "text-emerald-700"
                        : item.status === "skipped"
                        ? "text-amber-700"
                        : "text-red-700"
                    }`}
                  >
                    {(item.status === "updated" || item.status === "unchanged") && <CheckCircle2 className="w-3 h-3" />}
                    {statusLabel(item.status)}
                  </span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={close}
              className="w-full px-4 py-2.5 bg-[#0B2545] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              {fr ? "Terminé" : "Done"}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
              {(["booking", "container"] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => changeMode(m)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                    mode === m ? "bg-white text-[#0B2545] shadow-xs" : "text-slate-500"
                  }`}
                >
                  {m === "booking"
                    ? fr
                      ? "Référence de réservation / B/L"
                      : "Booking / B/L reference"
                    : fr
                    ? "Numéro de conteneur"
                    : "Container number"}
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <select value={carrier} onChange={(e) => setCarrier(e.target.value)} className={inputCls}>
                {(mode === "booking" ? BOOKING_CARRIERS : CONTAINER_CARRIERS).map((c) => (
                  <option key={c} value={c}>
                    {c ? CARRIER_LABEL[c] : fr ? "Détection auto (préfixe)" : "Auto-detect from prefix"}
                  </option>
                ))}
              </select>
              <input
                type="text"
                required
                autoFocus
                placeholder={mode === "booking" ? "CAN1028600" : "MSCU1234567"}
                value={reference}
                onChange={(e) => setReference(e.target.value.toUpperCase())}
                className={`${inputCls} flex-1 min-w-0 font-mono`}
              />
            </div>
            <p className="text-[10px] text-slate-400">
              {mode === "booking"
                ? fr
                  ? "Le navire et les conteneurs sont récupérés une seule fois, puis appliqués à toutes les expéditions."
                  : "The vessel and containers are fetched once, then applied to every selected shipment."
                : fr
                ? "Format ISO 6346 : 4 lettres + 7 chiffres. Pour MSC, ou quand le numéro est déjà connu."
                : "ISO 6346 format: 4 letters + 7 digits. Use this for MSC, or when you already have the container number."}
            </p>

            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                {fr ? "Expéditions" : "Shipments"}
              </span>
              <ul className="rounded-xl border border-slate-200 divide-y divide-slate-100 text-xs max-h-56 overflow-y-auto">
                {shipments.map((s) => {
                  const conflict = conflicts.some((c) => c.id === s.id);
                  return (
                    <li key={s.id} className="px-3 py-2 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-[#0B2545]">{s.id}</span>
                        <span className="text-[10px] text-slate-500 truncate">
                          {s.origin} → {s.destination}
                        </span>
                      </div>
                      {conflict && s.booking && (
                        <label className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={overwrite.has(s.id)}
                            onChange={() => toggleOverwrite(s.id)}
                            className="mt-0.5 cursor-pointer"
                          />
                          <span>
                            {fr ? "Suit déjà " : "Already tracking "}
                            <strong>
                              {CARRIER_LABEL[s.booking.carrier] || s.booking.carrier} {s.booking.reference}
                            </strong>
                            {s.booking.vesselName ? ` (${s.booking.vesselName})` : ""}.{" "}
                            {overwrite.has(s.id)
                              ? fr
                                ? "Sera remplacé."
                                : "Will be replaced."
                              : fr
                              ? "Cochez pour remplacer — sinon ignoré."
                              : "Tick to replace — otherwise skipped."}
                          </span>
                        </label>
                      )}
                    </li>
                  );
                })}
              </ul>
              {conflicts.length > 0 && (
                <p className="text-[10px] text-slate-400 mt-1.5">
                  {fr
                    ? "Les conteneurs déjà ajoutés par l'ancienne réservation restent sur l'expédition."
                    : "Containers already added by the old booking stay on the shipment."}
                </p>
              )}
            </div>

            {error && (
              <div className="p-2.5 rounded-lg text-[11px] font-medium flex items-center gap-2 border bg-red-50 border-red-200 text-red-700">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                {fr ? "Annuler" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={busy || !ref}
                className="px-4 py-2.5 bg-[#0B2545] hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {busy
                  ? fr
                    ? "Recherche..."
                    : "Looking up..."
                  : fr
                  ? `Assigner à ${shipments.length}`
                  : `Assign to ${shipments.length}`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

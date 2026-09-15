"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import PermissionGuard from "@/components/admin/PermissionGuard";
import ContainerMilestoneTimeline, {
  ContainerTrackingView,
} from "@/components/portal/ContainerMilestoneTimeline";
import {
  ArrowLeft,
  Ship,
  Plus,
  RefreshCw,
  Trash2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FlaskConical,
} from "lucide-react";

interface ContainerRow {
  containerNumber: string;
  carrier: string | null;
  tracking: ContainerTrackingView | null;
}

const CARRIER_OPTIONS = [
  { value: "", label: "Auto-detect from prefix" },
  { value: "MAERSK", label: "Maersk" },
  { value: "CMA_CGM", label: "CMA CGM" },
  { value: "MSC", label: "MSC" },
];

function ShipmentContainersPageInner() {
  const params = useParams();
  const { language } = useLanguage();
  const shipmentId = params?.id as string;

  const [containers, setContainers] = useState<ContainerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [newNumber, setNewNumber] = useState("");
  const [newCarrier, setNewCarrier] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [busyContainer, setBusyContainer] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/shipments/${encodeURIComponent(shipmentId)}/containers`);
      const data = await res.json();
      if (res.ok && data.success) {
        setContainers(data.containers || []);
      } else {
        setError(data.error || "Failed to load containers");
      }
    } catch {
      setError("Failed to load containers");
    } finally {
      setLoading(false);
    }
  }, [shipmentId]);

  useEffect(() => {
    if (shipmentId) load();
  }, [shipmentId, load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch(`/api/admin/shipments/${encodeURIComponent(shipmentId)}/containers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ containerNumber: newNumber.trim(), carrier: newCarrier || null }),
      });
      const data = await res.json();
      if (res.ok || res.status === 207) {
        setNewNumber("");
        setNewCarrier("");
        await load();
        if (data.warning) setAddError(data.warning);
      } else {
        setAddError(data.error || "Failed to add container");
      }
    } catch {
      setAddError("Failed to add container");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (containerNumber: string) => {
    setBusyContainer(containerNumber);
    try {
      await fetch(
        `/api/admin/shipments/${encodeURIComponent(shipmentId)}/containers/${encodeURIComponent(containerNumber)}`,
        { method: "DELETE" }
      );
      await load();
    } finally {
      setBusyContainer(null);
    }
  };

  const handleRefresh = async (containerNumber: string) => {
    setBusyContainer(containerNumber);
    try {
      await fetch(
        `/api/admin/shipments/${encodeURIComponent(shipmentId)}/containers/${encodeURIComponent(
          containerNumber
        )}/refresh`,
        { method: "POST" }
      );
      await load();
    } finally {
      setBusyContainer(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Breadcrumb & header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <Link href="/admin/shipments" className="hover:text-[#0B2545] flex items-center gap-1 transition">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{language === "fr" ? "Répertoire des Expéditions" : "Shipments Directory"}</span>
            </Link>
            <span>&bull;</span>
            <span className="font-mono text-[#d21f27] font-bold">{shipmentId}</span>
            <span>&bull;</span>
            <span className="text-slate-800">{language === "fr" ? "Suivi des Conteneurs" : "Container Tracking"}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0B2545] tracking-tight leading-tight">
            {language === "fr" ? "Suivi des Conteneurs Maritimes" : "Ocean Container Tracking"}
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            {language === "fr"
              ? "Ajoutez les numéros de conteneur reçus des transporteurs — Maersk, CMA CGM, MSC — pour activer leur suivi automatique."
              : "Add container numbers as they come in from the carriers — Maersk, CMA CGM, MSC — to switch on automatic tracking."}
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition cursor-pointer flex-shrink-0"
          title={language === "fr" ? "Recharger" : "Reload"}
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Add container form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
        <h2 className="text-sm font-bold text-[#0B2545] flex items-center gap-2">
          <Plus className="w-4 h-4 text-[#d21f27]" />
          {language === "fr" ? "Ajouter un Conteneur" : "Add a Container"}
        </h2>
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            required
            placeholder="MAEU1234565"
            value={newNumber}
            onChange={(e) => setNewNumber(e.target.value.toUpperCase())}
            className="flex-1 bg-slate-50 border border-slate-200 focus:border-[#0B2545] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-800 outline-none transition"
          />
          <select
            value={newCarrier}
            onChange={(e) => setNewCarrier(e.target.value)}
            className="bg-slate-50 border border-slate-200 focus:border-[#0B2545] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none transition"
          >
            {CARRIER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={adding || !newNumber.trim()}
            className="px-4 py-2.5 bg-[#0B2545] hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            {adding
              ? language === "fr"
                ? "Ajout..."
                : "Adding..."
              : language === "fr"
              ? "Ajouter et Synchroniser"
              : "Add & Sync"}
          </button>
        </form>
        <p className="text-[10px] text-slate-400">
          {language === "fr"
            ? "Format ISO 6346 : 4 lettres + 7 chiffres. Le transporteur explicite (si sélectionné) prime toujours sur la détection par préfixe."
            : "ISO 6346 format: 4 letters + 7 digits. An explicit carrier (if selected) always overrides the prefix guess."}
        </p>
        {addError && (
          <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-[11px] font-medium flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{addError}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Container list */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
          {language === "fr" ? "Chargement..." : "Loading..."}
        </div>
      ) : containers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-2">
          <Ship className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-xs text-slate-500">
            {language === "fr"
              ? "Aucun conteneur n'a encore été ajouté à cette expédition."
              : "No containers have been added to this shipment yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {containers.map((c) => {
            const isOpen = expanded === c.containerNumber;
            return (
              <div key={c.containerNumber} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 flex items-center justify-between gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : c.containerNumber)}
                    className="flex items-center gap-2 text-left cursor-pointer min-w-0"
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#0B2545] text-white flex items-center justify-center flex-shrink-0">
                      <Ship className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-[#0B2545] text-xs">{c.containerNumber}</span>
                        {c.carrier && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                            {c.carrier}
                          </span>
                        )}
                        {c.tracking?.carrierDetectionSource && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-slate-500 text-[9px] font-semibold uppercase">
                            {c.tracking.carrierDetectionSource === "explicit"
                              ? language === "fr"
                                ? "Explicite"
                                : "Explicit"
                              : language === "fr"
                              ? "Préfixe"
                              : "Prefix Guess"}
                          </span>
                        )}
                      </div>
                      {!c.tracking && (
                        <span className="text-[10px] text-amber-600 font-semibold">
                          {language === "fr" ? "Pas encore synchronisé" : "Not yet synced"}
                        </span>
                      )}
                    </div>
                  </button>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      disabled={busyContainer === c.containerNumber}
                      onClick={() => handleRefresh(c.containerNumber)}
                      className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 transition cursor-pointer disabled:opacity-50"
                      title={language === "fr" ? "Rafraîchir" : "Refresh"}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${busyContainer === c.containerNumber ? "animate-spin" : ""}`} />
                    </button>
                    <button
                      type="button"
                      disabled={busyContainer === c.containerNumber}
                      onClick={() => handleRemove(c.containerNumber)}
                      className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition cursor-pointer disabled:opacity-50"
                      title={language === "fr" ? "Retirer" : "Remove"}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : c.containerNumber)}
                      className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                    >
                      {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                {isOpen && (
                  <div className="p-4 bg-slate-50 border-t border-slate-200">
                    <ContainerMilestoneTimeline tracking={c.tracking} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-start gap-2 text-[10px] text-slate-400 p-3 bg-slate-50 rounded-xl border border-slate-200">
        <FlaskConical className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <span>
          {language === "fr"
            ? "Chaque transporteur bascule entre données simulées et données réelles via une variable d'environnement — aucune modification de code n'est nécessaire lors de la réception des identifiants."
            : "Each carrier switches between mock and live data via an environment variable — no code changes are needed once credentials arrive. See INTEGRATION.md."}
        </span>
      </div>
    </div>
  );
}

export default function ShipmentContainersPage() {
  return (
    <PermissionGuard module="shipments">
      <ShipmentContainersPageInner />
    </PermissionGuard>
  );
}

"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, Code2, Copy, Eye, ImageOff, Megaphone, Pencil, Plus, Trash2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import PermissionGuard from "@/components/admin/PermissionGuard";
import PromotionEditorModal from "@/components/admin/promotions/PromotionEditorModal";
import PromotionPreviewModal from "@/components/admin/promotions/PromotionPreviewModal";
import {
  PromotionDTO,
  PromotionStatus,
  countryName,
  findCountry,
  formatDepartureDate,
} from "@/lib/promotionTypes";

type PromotionRow = PromotionDTO & { status: PromotionStatus };
type Filter = "all" | PromotionStatus;

const STATUS_STYLES: Record<PromotionStatus, string> = {
  live: "bg-emerald-50 text-emerald-700 border-emerald-200",
  scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  expired: "bg-slate-100 text-slate-500 border-slate-200",
  inactive: "bg-amber-50 text-amber-700 border-amber-200",
};

function formatDateTime(iso: string | null, lang: "en" | "fr") {
  if (!iso) return null;
  return new Intl.DateTimeFormat(lang === "fr" ? "fr-CA" : "en-CA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

export default function AdminPromotionsPage() {
  const { language } = useLanguage();
  const tr = (en: string, fr: string) => (language === "fr" ? fr : en);

  const [promotions, setPromotions] = useState<PromotionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<PromotionDTO | null>(null);
  const [previewing, setPreviewing] = useState<PromotionDTO | null>(null);
  const [copied, setCopied] = useState(false);

  const flash = useCallback((text: string, error = false) => {
    setToast({ text, error });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await fetch("/api/admin/promotions");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load promotions");
      setPromotions(data.promotions);
    } catch (err: any) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const c = { all: promotions.length, live: 0, scheduled: 0, expired: 0, inactive: 0 };
    promotions.forEach((p) => (c[p.status] += 1));
    return c;
  }, [promotions]);

  const visible = filter === "all" ? promotions : promotions.filter((p) => p.status === filter);

  const statusLabel = (s: PromotionStatus) =>
    ({
      live: tr("Live", "En ligne"),
      scheduled: tr("Scheduled", "Planifiée"),
      expired: tr("Expired", "Expirée"),
      inactive: tr("Inactive", "Inactive"),
    })[s];

  const toggleActive = async (p: PromotionRow) => {
    try {
      const res = await fetch(`/api/admin/promotions/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !p.isActive }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to update");
      setPromotions((prev) => prev.map((x) => (x.id === p.id ? data.promotion : x)));
      flash(data.promotion.isActive ? tr("Promotion activated.", "Promotion activée.") : tr("Promotion deactivated.", "Promotion désactivée."));
    } catch (err: any) {
      flash(err.message || tr("Update failed", "Échec de la mise à jour"), true);
    }
  };

  const remove = async (p: PromotionRow) => {
    if (!window.confirm(tr(`Delete "${p.name}"? This cannot be undone.`, `Supprimer « ${p.name} » ? Cette action est irréversible.`))) return;
    try {
      const res = await fetch(`/api/admin/promotions/${p.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      setPromotions((prev) => prev.filter((x) => x.id !== p.id));
      flash(tr("Promotion deleted.", "Promotion supprimée."));
    } catch (err: any) {
      flash(err.message || tr("Delete failed", "Échec de la suppression"), true);
    }
  };

  const endpoint = typeof window !== "undefined" ? `${window.location.origin}/api/public/promotions?lang=en` : "/api/public/promotions?lang=en";
  const copyEndpoint = async () => {
    try {
      await navigator.clipboard.writeText(endpoint);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable: the URL stays visible to copy by hand */
    }
  };

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: tr("All", "Toutes") },
    { key: "live", label: tr("Live", "En ligne") },
    { key: "scheduled", label: tr("Scheduled", "Planifiées") },
    { key: "inactive", label: tr("Inactive", "Inactives") },
    { key: "expired", label: tr("Expired", "Expirées") },
  ];

  return (
    <PermissionGuard module="promotions">
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0B2545] tracking-tight leading-tight">
              {tr("Promotions & Popups", "Promotions & Popups")}
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl">
              {tr(
                "Create the bilingual promotional popup shown on the public website: destination, departure date, image, button and timing.",
                "Créez le popup promotionnel bilingue affiché sur le site public : destination, date de départ, image, bouton et délai."
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setEditorOpen(true);
            }}
            className="px-4 py-2 bg-[#0B2545] hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 text-[#d21f27]" />
            <span>{tr("New Promotion", "Nouvelle Promotion")}</span>
          </button>
        </div>

        {toast && (
          <div
            role="status"
            className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150 ${
              toast.error ? "bg-red-50 text-red-700 border border-red-200" : "bg-[#0B2545] text-white"
            }`}
          >
            {!toast.error && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
            <span>{toast.text}</span>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                filter === f.key ? "bg-[#0B2545] text-white border-[#0B2545]" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {f.label} <span className="opacity-60 ml-0.5">{counts[f.key]}</span>
            </button>
          ))}
        </div>

        {/* List */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">{tr("Loading promotions...", "Chargement des promotions...")}</div>
          ) : loadError ? (
            <div className="py-12 text-center text-xs text-red-600 font-semibold">
              {loadError}{" "}
              <button type="button" onClick={load} className="underline cursor-pointer">
                {tr("Retry", "Réessayer")}
              </button>
            </div>
          ) : visible.length === 0 ? (
            <div className="py-14 text-center">
              <Megaphone className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="mt-2 text-xs text-slate-500">
                {promotions.length === 0
                  ? tr("No promotions yet. Create the first one.", "Aucune promotion pour le moment. Créez la première.")
                  : tr("No promotions match this filter.", "Aucune promotion ne correspond à ce filtre.")}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {visible.map((p) => {
                const thumb = p.image[language] || p.image.en || p.image.fr;
                const places = [
                  ...(p.destination.city || p.destination.countryCode ? [{ label: p.destination.city || countryName(p.destination.countryCode, language), countryCode: p.destination.countryCode }] : []),
                  ...p.ports,
                ];
                const departure = formatDepartureDate(p.departureDate, language);
                const from = formatDateTime(p.startsAt, language);
                const until = formatDateTime(p.endsAt, language);

                return (
                  <li key={p.id} className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-4 hover:bg-slate-50/60 transition">
                    <div className="w-full lg:w-36 h-24 lg:h-20 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb.url} alt="" loading="lazy" className="w-full h-full object-cover" />
                      ) : (
                        <ImageOff className="w-5 h-5 text-slate-300" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-[#0B2545] text-sm truncate max-w-full">{p.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${STATUS_STYLES[p.status]}`}>{statusLabel(p.status)}</span>
                      </div>
                      <p className="text-xs text-slate-600 truncate">{p.content[language].title || p.content.en.title}</p>

                      {places.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {places.map((pl, i) => {
                            const country = findCountry(pl.countryCode);
                            return (
                              <span key={`${pl.label}-${i}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold uppercase tracking-wide text-slate-700">
                                {p.showFlags && country && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={`/flags/${country.code.toLowerCase()}.svg`} alt="" width={14} height={10} loading="lazy" className="h-2.5 w-3.5 rounded-[1px] object-cover" />
                                )}
                                {pl.label}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                        {departure && (
                          <span>
                            {tr("Departs", "Départ")}: <b className="text-slate-700">{departure}</b>
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {p.delaySeconds === 0 ? tr("Immediately", "Immédiatement") : tr(`After ${p.delaySeconds}s`, `Après ${p.delaySeconds} s`)}
                        </span>
                        <span>
                          {tr("Priority", "Priorité")} {p.priority}
                        </span>
                        {(from || until) && (
                          <span>
                            {from ?? "…"} → {until ?? "…"}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 lg:flex-shrink-0">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={p.isActive}
                        aria-label={p.isActive ? tr("Deactivate", "Désactiver") : tr("Activate", "Activer")}
                        title={p.isActive ? tr("Deactivate", "Désactiver") : tr("Activate", "Activer")}
                        onClick={() => toggleActive(p)}
                        className={`relative w-10 h-6 rounded-full transition cursor-pointer flex-shrink-0 ${p.isActive ? "bg-emerald-500" : "bg-slate-300"}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${p.isActive ? "translate-x-4" : ""}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewing(p)}
                        className="ml-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-[#0B2545] hover:bg-slate-50 flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {tr("Preview", "Aperçu")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(p);
                          setEditorOpen(true);
                        }}
                        className="p-2 rounded-lg text-slate-500 hover:text-[#0B2545] hover:bg-slate-100 transition cursor-pointer"
                        title={tr("Edit", "Modifier")}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(p)}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                        title={tr("Delete", "Supprimer")}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Developer integration */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 space-y-2.5">
          <h3 className="font-bold text-[#0B2545] text-sm flex items-center gap-2">
            <Code2 className="w-4 h-4" />
            {tr("Website integration endpoint", "Point d'accès pour le site web")}
          </h3>
          <div className="flex items-center gap-2">
            <code className="flex-1 min-w-0 truncate rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-[11px] font-mono text-slate-700">GET {endpoint}</code>
            <button
              type="button"
              onClick={copyEndpoint}
              className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-[#0B2545] hover:bg-slate-50 flex items-center gap-1.5 transition cursor-pointer flex-shrink-0"
            >
              <Copy className="w-3.5 h-3.5" />
              {copied ? tr("Copied", "Copié") : tr("Copy", "Copier")}
            </button>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            {tr(
              "Call it from the website's server with the x-api-key header (never from browser code). Use lang=en or lang=fr. Returns only promotions that are active right now. Full details are in PROMOTIONS_API_DOCUMENTATION.md.",
              "Appelez-le depuis le serveur du site avec l'en-tête x-api-key (jamais depuis le navigateur). Utilisez lang=en ou lang=fr. Ne retourne que les promotions actives en ce moment. Détails complets dans PROMOTIONS_API_DOCUMENTATION.md."
            )}
          </p>
        </div>
      </div>

      <PromotionEditorModal
        isOpen={editorOpen}
        promotion={editing}
        onClose={() => setEditorOpen(false)}
        onPreview={(draft) => setPreviewing(draft)}
        onSaved={(saved, created) => {
          setEditorOpen(false);
          flash(created ? tr("Promotion created.", "Promotion créée.") : tr("Promotion saved.", "Promotion enregistrée."));
          load();
          void saved;
        }}
      />
      <PromotionPreviewModal promotion={previewing} onClose={() => setPreviewing(null)} />
    </PermissionGuard>
  );
}

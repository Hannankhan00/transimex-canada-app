"use client";

import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  Languages,
  Layers,
  Link2,
  Loader2,
  MapPin,
  Plus,
  Save,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import CountrySelect from "@/components/ui/CountrySelect";
import { COUNTRIES } from "@/lib/data/countries";
import { isSafeLink } from "@/lib/validations/promotion";
import {
  EMPTY_TEXT,
  LIMITS,
  PLACEHOLDERS,
  PromoLang,
  PromoText,
  PromotionDTO,
  findCountry,
} from "@/lib/promotionTypes";
import PromotionImageUploader from "./PromotionImageUploader";

interface PromotionEditorModalProps {
  isOpen: boolean;
  promotion: PromotionDTO | null;
  onClose: () => void;
  onSaved: (promotion: PromotionDTO, created: boolean) => void;
  onPreview: (draft: PromotionDTO) => void;
}

const blank = (): PromotionDTO => ({
  id: "",
  name: "",
  isActive: false,
  priority: 1,
  delaySeconds: 5,
  startsAt: null,
  endsAt: null,
  departureDate: null,
  destination: { city: "", countryCode: "" },
  ports: [],
  showFlags: true,
  cta: { url: "/quote" },
  image: { en: null, fr: null },
  content: { en: { ...EMPTY_TEXT }, fr: { ...EMPTY_TEXT } },
});

/** ISO (UTC) -> value for <input type="datetime-local"> in the admin's own timezone. */
const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : null);

const inputCls =
  "w-full bg-white border border-slate-200 focus:border-[#0B2545] focus:ring-2 focus:ring-[#0B2545]/10 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none transition";
const labelCls = "block text-[11px] font-bold text-slate-700 mb-1";

function Section({
  title,
  icon,
  hint,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3.5 bg-slate-50/50 rounded-2xl p-4 sm:p-5 border border-slate-200/80">
      <div className="flex items-start justify-between gap-2 border-b border-slate-200/80 pb-2">
        <div className="flex items-center gap-2">
          {icon && <span className="text-[#D21F27]">{icon}</span>}
          <h3 className="text-xs font-black uppercase tracking-wider text-[#0B2545]">{title}</h3>
        </div>
        {hint && <p className="text-[11px] text-slate-500 font-medium">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export default function PromotionEditorModal({
  isOpen,
  promotion,
  onClose,
  onSaved,
  onPreview,
}: PromotionEditorModalProps) {
  const { language } = useLanguage();
  const tr = (en: string, fr: string) => (language === "fr" ? fr : en);

  const [form, setForm] = useState<PromotionDTO>(blank);
  const [tab, setTab] = useState<PromoLang>("en");
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translateSuccess, setTranslateSuccess] = useState<string | null>(null);
  const [copiedPlaceholder, setCopiedPlaceholder] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setForm(promotion ? structuredClone(promotion) : blank());
    setTab(language);
    setErrors([]);
    setTranslateSuccess(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, promotion]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !saving && !translating && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, saving, translating, onClose]);

  if (!isOpen) return null;

  const patch = (changes: Partial<PromotionDTO>) => setForm((f) => ({ ...f, ...changes }));
  const patchText = (lang: PromoLang, changes: Partial<PromoText>) =>
    setForm((f) => ({ ...f, content: { ...f.content, [lang]: { ...f.content[lang], ...changes } } }));
  const countryNameToCode = (name: string) => COUNTRIES.find((c) => c.name === name)?.code ?? "";
  const codeToName = (code: string) => findCountry(code)?.name ?? "";

  const validate = (): string[] => {
    const out: string[] = [];
    if (!form.name.trim()) out.push(tr("Internal name is required.", "Le nom interne est requis."));
    if (!form.cta.url.trim()) {
      out.push(tr("Main website button link is required.", "Le lien du bouton sur le site principal est requis."));
    } else if (!isSafeLink(form.cta.url.trim())) {
      out.push(
        tr(
          "Main website link must be a path (e.g. /quote) or an http(s) URL.",
          "Le lien du site principal doit être un chemin (ex. /quote) ou une URL http(s)."
        )
      );
    }
    (["en", "fr"] as const).forEach((l) => {
      if (!form.content[l].title.trim())
        out.push(tr(`Title (${l.toUpperCase()}) is required.`, `Le titre (${l.toUpperCase()}) est requis.`));
      if (!form.content[l].ctaLabel.trim())
        out.push(tr(`Button text (${l.toUpperCase()}) is required.`, `Le texte du bouton (${l.toUpperCase()}) est requis.`));
    });
    if (form.startsAt && form.endsAt && new Date(form.endsAt) <= new Date(form.startsAt)) {
      out.push(tr("End must be after start.", "La fin doit être après le début."));
    }
    if (form.ports.some((p) => !p.label.trim()))
      out.push(tr("Every extra port needs a name.", "Chaque port supplémentaire doit avoir un nom."));
    return out;
  };

  const handleAutoTranslate = async (targetLang: PromoLang) => {
    const sourceLang: PromoLang = targetLang === "fr" ? "en" : "fr";
    const src = form.content[sourceLang];

    if (!src.title.trim() && !src.description.trim() && !src.ctaLabel.trim()) {
      setErrors([
        tr(
          `Please provide ${sourceLang === "en" ? "English" : "French"} content first to generate translation.`,
          `Veuillez d'abord remplir le contenu en ${sourceLang === "en" ? "anglais" : "français"} pour générer la traduction.`
        ),
      ]);
      setTab(sourceLang);
      return;
    }

    setTranslating(true);
    setErrors([]);
    setTranslateSuccess(null);

    try {
      const res = await fetch("/api/admin/promotions/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: sourceLang,
          to: targetLang,
          fields: {
            title: src.title,
            description: src.description,
            badge: src.badge,
            ctaLabel: src.ctaLabel,
            footer: src.footer,
            imageAlt: src.imageAlt,
          },
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Translation request failed.");

      if (data.translations) {
        patchText(targetLang, {
          title: data.translations.title || form.content[targetLang].title,
          description: data.translations.description || form.content[targetLang].description,
          badge: data.translations.badge || form.content[targetLang].badge,
          ctaLabel: data.translations.ctaLabel || form.content[targetLang].ctaLabel,
          footer: data.translations.footer || form.content[targetLang].footer,
          imageAlt: data.translations.imageAlt || form.content[targetLang].imageAlt,
        });
      }

      setTab(targetLang);
      setTranslateSuccess(
        targetLang === "fr"
          ? tr(
              "✨ Successfully auto-translated to French! Review the French tab below.",
              "✨ Traduction vers le français réussie ! Vérifiez les champs ci-dessous."
            )
          : tr(
              "✨ Successfully auto-translated to English! Review the English tab below.",
              "✨ Traduction vers l'anglais réussie ! Vérifiez les champs ci-dessous."
            )
      );
      setTimeout(() => setTranslateSuccess(null), 5000);
    } catch (err: any) {
      setErrors([err.message || tr("Failed to auto-translate content.", "Échec de la traduction automatique.")]);
    } finally {
      setTranslating(false);
    }
  };

  const handleCopyPlaceholder = (placeholder: string) => {
    navigator.clipboard.writeText(placeholder).catch(() => {});
    setCopiedPlaceholder(placeholder);
    setTimeout(() => setCopiedPlaceholder(null), 1500);
  };

  const save = async () => {
    const problems = validate();
    setErrors(problems);
    if (problems.length) return;

    setSaving(true);
    try {
      const { id, createdAt: _c, updatedAt: _u, ...payload } = form;
      void _c;
      void _u;
      const res = await fetch(id ? `/api/admin/promotions/${id}` : "/api/admin/promotions", {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const fieldMsgs: string[] = Array.isArray(data.fields)
          ? data.fields.map((f: any) => `${f.path}: ${f.message}`)
          : [];
        setErrors(
          fieldMsgs.length ? fieldMsgs : [data.error || tr("Failed to save promotion", "Échec de l'enregistrement")]
        );
        return;
      }
      onSaved(data.promotion as PromotionDTO, !id);
    } catch {
      setErrors([tr("Network error. Please try again.", "Erreur réseau. Veuillez réessayer.")]);
    } finally {
      setSaving(false);
    }
  };

  const isTabComplete = (l: PromoLang) => !!form.content[l].title.trim() && !!form.content[l].ctaLabel.trim();
  const text = form.content[tab];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white w-full sm:max-w-3xl max-h-[95vh] sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in duration-150 border border-slate-200/80">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-50 text-[#D21F27] flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#0B2545]">
                {promotion ? tr("Edit Promotion & Popup", "Modifier la Promotion & Popup") : tr("New Promotion & Popup", "Nouvelle Promotion & Popup")}
              </h2>
              <p className="text-[11px] text-slate-500">
                {tr(
                  "Configure promotion route, bilingual content, schedule, and popup design.",
                  "Configurez l'itinéraire, le contenu bilingue, la planification et le popup."
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving || translating}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer transition"
            aria-label={tr("Close", "Fermer")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {/* General */}
          <Section title={tr("General Settings", "Paramètres Généraux")} icon={<Layers className="w-4 h-4" />}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-3">
                <label className={labelCls}>{tr("Internal name (for admin reference)", "Nom interne (référence admin)")} *</label>
                <input
                  className={inputCls}
                  value={form.name}
                  maxLength={120}
                  placeholder="e.g. Douala – October 2026 Special"
                  onChange={(e) => patch({ name: e.target.value })}
                />
              </div>
              <div>
                <label className={labelCls}>{tr("Display delay (seconds)", "Délai d'affichage (secondes)")}</label>
                <input
                  type="number"
                  min={0}
                  max={LIMITS.maxDelaySeconds}
                  className={inputCls}
                  value={form.delaySeconds}
                  onChange={(e) =>
                    patch({
                      delaySeconds: Math.min(
                        LIMITS.maxDelaySeconds,
                        Math.max(0, Math.floor(Number(e.target.value) || 0))
                      ),
                    })
                  }
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  {tr("0 = immediately on page load.", "0 = dès le chargement du site.")}
                </p>
              </div>
              <div>
                <label className={labelCls}>{tr("Display priority", "Priorité d'affichage")}</label>
                <input
                  type="number"
                  min={0}
                  max={999}
                  className={inputCls}
                  value={form.priority}
                  onChange={(e) =>
                    patch({ priority: Math.min(999, Math.max(0, Math.floor(Number(e.target.value) || 0))) })
                  }
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  {tr("Lowest number is shown first.", "Le plus petit numéro s'affiche en premier.")}
                </p>
              </div>
              <div>
                <span className={labelCls}>{tr("Publish status", "Statut de publication")}</span>
                <label className="flex items-center gap-2 h-[34px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => patch({ isActive: e.target.checked })}
                    className="w-4 h-4 accent-[#0B2545] rounded cursor-pointer"
                  />
                  <span
                    className={`text-xs font-bold ${
                      form.isActive ? "text-emerald-700" : "text-slate-500"
                    }`}
                  >
                    {form.isActive ? tr("Active (Published)", "Actif (En ligne)") : tr("Inactive (Draft)", "Inactif (Brouillon)")}
                  </span>
                </label>
              </div>
            </div>
          </Section>

          {/* Schedule */}
          <Section
            title={tr("Schedule & Departure", "Planification & Départ")}
            icon={<Calendar className="w-4 h-4" />}
            hint={tr(
              "Leave start/end empty to show anytime it's active.",
              "Laissez début/fin vides pour afficher dès que la promotion est active."
            )}
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>{tr("Departure date", "Date de départ prévue")}</label>
                <input
                  type="date"
                  className={inputCls}
                  value={form.departureDate ?? ""}
                  onChange={(e) => patch({ departureDate: e.target.value || null })}
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  {tr("Displayed in the popup ribbon.", "Affichée dans le bandeau du popup.")}
                </p>
              </div>
              <div>
                <label className={labelCls}>{tr("Visible from (optional)", "Visible à partir du (optionnel)")}</label>
                <input
                  type="datetime-local"
                  className={inputCls}
                  value={toLocalInput(form.startsAt)}
                  onChange={(e) => patch({ startsAt: fromLocalInput(e.target.value) })}
                />
              </div>
              <div>
                <label className={labelCls}>{tr("Visible until (optional)", "Visible jusqu'au (optionnel)")}</label>
                <input
                  type="datetime-local"
                  className={inputCls}
                  value={toLocalInput(form.endsAt)}
                  onChange={(e) => patch({ endsAt: fromLocalInput(e.target.value) })}
                />
              </div>
            </div>
          </Section>

          {/* Route & Ports */}
          <Section
            title={tr("Destination & Ports of Call", "Destination & Ports Desservis")}
            icon={<MapPin className="w-4 h-4" />}
            hint={tr(
              "Flags are shown automatically based on countries.",
              "Les drapeaux s'affichent automatiquement selon les pays."
            )}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{tr("Destination City / Main Port", "Ville / Port de Destination")}</label>
                <input
                  className={inputCls}
                  value={form.destination.city}
                  maxLength={80}
                  placeholder="e.g. Douala"
                  onChange={(e) => patch({ destination: { ...form.destination, city: e.target.value } })}
                />
              </div>
              <div>
                <label className={labelCls}>{tr("Destination Country", "Pays de Destination")}</label>
                <CountrySelect
                  value={codeToName(form.destination.countryCode)}
                  onChange={(name) =>
                    patch({ destination: { ...form.destination, countryCode: countryNameToCode(name) } })
                  }
                  placeholder={tr("Select country…", "Choisir un pays…")}
                />
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className={labelCls + " !mb-0"}>
                  {tr("Additional Ports of Call (served route)", "Ports d'escale supplémentaires")}
                </span>
                <button
                  type="button"
                  disabled={form.ports.length >= LIMITS.maxPorts}
                  onClick={() => patch({ ports: [...form.ports, { label: "", countryCode: "" }] })}
                  className="text-[11px] font-bold text-[#0B2545] hover:text-[#D21F27] flex items-center gap-1 disabled:opacity-40 cursor-pointer transition"
                >
                  <Plus className="w-3.5 h-3.5 text-[#d21f27]" />
                  {tr("Add port", "Ajouter un port")}
                </button>
              </div>

              {form.ports.map((port, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start">
                  <input
                    className={inputCls}
                    value={port.label}
                    maxLength={80}
                    placeholder="e.g. Matadi"
                    onChange={(e) =>
                      patch({ ports: form.ports.map((p, j) => (j === i ? { ...p, label: e.target.value } : p)) })
                    }
                  />
                  <CountrySelect
                    value={codeToName(port.countryCode)}
                    onChange={(name) =>
                      patch({
                        ports: form.ports.map((p, j) => (j === i ? { ...p, countryCode: countryNameToCode(name) } : p)),
                      })
                    }
                    placeholder={tr("Country (optional)", "Pays (optionnel)")}
                  />
                  <button
                    type="button"
                    onClick={() => patch({ ports: form.ports.filter((_, j) => j !== i) })}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                    title={tr("Remove port", "Retirer le port")}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.showFlags}
                  onChange={(e) => patch({ showFlags: e.target.checked })}
                  className="w-4 h-4 accent-[#0B2545] rounded cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-700">
                  {tr("Show country flag icons in popup", "Afficher les drapeaux des pays dans le popup")}
                </span>
              </label>
            </div>
          </Section>

          {/* Bilingual Content */}
          <Section
            title={tr("Bilingual Popup Content", "Contenu Bilingue du Popup")}
            icon={<Languages className="w-4 h-4" />}
            hint={tr("Both EN and FR are supported.", "L'anglais et le français sont pris en charge.")}
          >
            {/* Dynamic Placeholders Toolbar */}
            <div className="rounded-xl bg-white border border-slate-200/90 p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                  {tr("Click placeholder to copy into text:", "Cliquez sur une variable pour la copier :")}
                </span>
                {copiedPlaceholder && (
                  <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    {tr("Copied!", "Copié !")}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PLACEHOLDERS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleCopyPlaceholder(p)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-[11px] font-mono text-slate-700 transition cursor-pointer active:scale-95"
                    title={tr("Click to copy", "Cliquer pour copier")}
                  >
                    <span>{p}</span>
                    <Copy className="w-2.5 h-2.5 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>

            {/* Language Tabs & Auto-Translate Action */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
              <div className="inline-flex rounded-xl bg-slate-200/70 p-1 border border-slate-200">
                {(["en", "fr"] as const).map((l) => {
                  const complete = isTabComplete(l);
                  return (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setTab(l)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                        tab === l
                          ? "bg-white text-[#0B2545] shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <span>{l === "en" ? "English" : "Français"}</span>
                      {complete ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* 1-Click Auto-Translate Button */}
              <div className="flex items-center gap-2">
                {tab === "en" ? (
                  <button
                    type="button"
                    disabled={translating}
                    onClick={() => handleAutoTranslate("fr")}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-60 active:scale-95"
                  >
                    {translating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    )}
                    <span>{translating ? tr("Translating…", "Traduction…") : tr("Auto-translate to French", "Traduire vers le français")}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={translating}
                    onClick={() => handleAutoTranslate("fr")}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#0B2545] to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-60 active:scale-95"
                  >
                    {translating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    )}
                    <span>{translating ? tr("Translating…", "Traduction…") : tr("Re-translate from English", "Retraduire depuis l'anglais")}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Translation success message */}
            {translateSuccess && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-800 font-bold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{translateSuccess}</span>
              </div>
            )}

            {/* Active Language Fields */}
            <div className="space-y-3.5 pt-1">
              <div>
                <label className={labelCls}>{tr("Popup Title", "Titre du Popup")} *</label>
                <input
                  className={inputCls}
                  value={text.title}
                  maxLength={LIMITS.title}
                  placeholder={
                    tab === "en" ? "Next Cargo Shipment to {{city}}" : "Prochain chargement vers {{city}}"
                  }
                  onChange={(e) => patchText(tab, { title: e.target.value })}
                />
              </div>

              <div>
                <label className={labelCls}>{tr("Description / Announcement", "Description / Détails")}</label>
                <textarea
                  rows={3}
                  className={inputCls + " resize-y leading-relaxed"}
                  value={text.description}
                  maxLength={LIMITS.description}
                  placeholder={
                    tab === "en"
                      ? "Departure on {{date}} to {{destination}}. Reserve your container now."
                      : "Départ le {{date}} vers {{destination}}. Réservez votre conteneur dès maintenant."
                  }
                  onChange={(e) => patchText(tab, { description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>{tr("Highlight Urgency Badge", "Mention en Évidence")}</label>
                  <input
                    className={inputCls}
                    value={text.badge}
                    maxLength={LIMITS.badge}
                    placeholder={tab === "en" ? "Last spaces available!" : "Dernières places disponibles !"}
                    onChange={(e) => patchText(tab, { badge: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelCls}>{tr("Button Label", "Texte du Bouton")} *</label>
                  <input
                    className={inputCls}
                    value={text.ctaLabel}
                    maxLength={LIMITS.ctaLabel}
                    placeholder={tab === "en" ? "Get a Quote" : "Obtenir un devis"}
                    onChange={(e) => patchText(tab, { ctaLabel: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>{tr("Footer Assurance Note", "Mention de Pied de Page")}</label>
                <input
                  className={inputCls}
                  value={text.footer}
                  maxLength={LIMITS.footer}
                  placeholder={
                    tab === "en"
                      ? "Reliable transport. Professional service. Across Africa."
                      : "Transport fiable. Service professionnel. Partout en Afrique."
                  }
                  onChange={(e) => patchText(tab, { footer: e.target.value })}
                />
              </div>

              {/* Promotional Image Uploader */}
              <div className="pt-2 border-t border-slate-200/80">
                <label className={labelCls}>
                  {tr("Promotional Banner Image (optional)", "Bannière Image Promotionnelle (optionnelle)")} ({tab.toUpperCase()})
                </label>
                <PromotionImageUploader
                  value={form.image[tab]}
                  onChange={(image) => patch({ image: { ...form.image, [tab]: image } })}
                />
                {!form.image[tab] && (
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    {tr(
                      "If no banner image is provided, the website will display the executive text popup.",
                      "Sans image, le site affichera la version textuelle conçue pour cette langue."
                    )}
                  </p>
                )}
              </div>

              {form.image[tab] && (
                <div>
                  <label className={labelCls}>{tr("Image Alt Text", "Texte alternatif de l'image")}</label>
                  <input
                    className={inputCls}
                    value={text.imageAlt}
                    maxLength={LIMITS.imageAlt}
                    placeholder={tr("Defaults to title if left blank", "Utilise le titre par défaut")}
                    onChange={(e) => patchText(tab, { imageAlt: e.target.value })}
                  />
                </div>
              )}
            </div>
          </Section>

          {/* Main Website Action Link */}
          <Section
            title={tr("Main Website Button Link", "Lien du Bouton sur le Site Principal")}
            icon={<Link2 className="w-4 h-4" />}
            hint={tr("Passed in API JSON for the public site", "Transmis dans le JSON de l'API pour le site public")}
          >
            <div>
              <label className={labelCls}>
                {tr("Destination Path or URL on Main Website", "Chemin ou URL de destination sur le site principal")} *
              </label>
              <input
                className={inputCls}
                value={form.cta.url}
                maxLength={2048}
                placeholder="/quote  or  https://transimex.ca/quote"
                onChange={(e) => patch({ cta: { url: e.target.value } })}
              />
              <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                {tr(
                  "Sent in the public API JSON as cta.url. The frontend developer on your main site will combine this path with their base URL (e.g. /quote or /demande-de-prix) so clicking the popup button opens that page.",
                  "Transmis dans le JSON de l'API publique sous cta.url. Le développeur du site principal combinera ce chemin avec son URL de base (ex. /quote ou /demande-de-prix) pour diriger les visiteurs vers cette page."
                )}
              </p>
            </div>
          </Section>
        </div>

        {/* Errors Alert */}
        {errors.length > 0 && (
          <div className="mx-5 mb-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[11px] text-red-700 flex gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-px" />
            <ul className="space-y-0.5 font-semibold">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Modal Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onPreview(form)}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-[#0B2545] hover:bg-slate-50 flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
          >
            <Eye className="w-3.5 h-3.5 text-[#D21F27]" />
            {tr("Preview Popup", "Aperçu du Popup")}
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving || translating}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
            >
              {tr("Cancel", "Annuler")}
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving || translating}
              className="px-5 py-2 rounded-xl bg-[#0B2545] hover:bg-slate-800 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition disabled:opacity-60 cursor-pointer active:scale-95"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? tr("Saving…", "Enregistrement…") : tr("Save Promotion", "Enregistrer la Promotion")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { AlertCircle, Eye, Loader2, Plus, Save, Trash2, X } from "lucide-react";
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
  "w-full bg-white border border-slate-200 focus:border-[#0B2545] rounded-xl px-3 py-2 text-xs text-slate-800 outline-none transition";
const labelCls = "block text-[11px] font-bold text-slate-700 mb-1";

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="border-b border-slate-200 pb-1.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B2545]">{title}</h3>
        {hint && <p className="text-[11px] text-slate-500 mt-0.5">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export default function PromotionEditorModal({ isOpen, promotion, onClose, onSaved, onPreview }: PromotionEditorModalProps) {
  const { language } = useLanguage();
  const tr = (en: string, fr: string) => (language === "fr" ? fr : en);

  const [form, setForm] = useState<PromotionDTO>(blank);
  const [tab, setTab] = useState<PromoLang>("en");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setForm(promotion ? structuredClone(promotion) : blank());
    setTab(language);
    setErrors([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, promotion]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !saving && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, saving, onClose]);

  if (!isOpen) return null;

  const patch = (changes: Partial<PromotionDTO>) => setForm((f) => ({ ...f, ...changes }));
  const patchText = (lang: PromoLang, changes: Partial<PromoText>) =>
    setForm((f) => ({ ...f, content: { ...f.content, [lang]: { ...f.content[lang], ...changes } } }));
  const countryNameToCode = (name: string) => COUNTRIES.find((c) => c.name === name)?.code ?? "";
  const codeToName = (code: string) => findCountry(code)?.name ?? "";

  const validate = (): string[] => {
    const out: string[] = [];
    if (!form.name.trim()) out.push(tr("Internal name is required.", "Le nom interne est requis."));
    if (!isSafeLink(form.cta.url.trim())) out.push(tr("Button link must be a path like /quote or an http(s) URL.", "Le lien du bouton doit être un chemin comme /quote ou une URL http(s)."));
    (["en", "fr"] as const).forEach((l) => {
      if (!form.content[l].title.trim()) out.push(tr(`Title (${l.toUpperCase()}) is required.`, `Le titre (${l.toUpperCase()}) est requis.`));
      if (!form.content[l].ctaLabel.trim()) out.push(tr(`Button text (${l.toUpperCase()}) is required.`, `Le texte du bouton (${l.toUpperCase()}) est requis.`));
    });
    if (form.startsAt && form.endsAt && new Date(form.endsAt) <= new Date(form.startsAt)) {
      out.push(tr("End must be after start.", "La fin doit être après le début."));
    }
    if (form.ports.some((p) => !p.label.trim())) out.push(tr("Every extra port needs a name.", "Chaque port supplémentaire doit avoir un nom."));
    return out;
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
        const fieldMsgs: string[] = Array.isArray(data.fields) ? data.fields.map((f: any) => `${f.path}: ${f.message}`) : [];
        setErrors(fieldMsgs.length ? fieldMsgs : [data.error || tr("Failed to save promotion", "Échec de l'enregistrement")]);
        return;
      }
      onSaved(data.promotion as PromotionDTO, !id);
    } catch {
      setErrors([tr("Network error. Please try again.", "Erreur réseau. Veuillez réessayer.")]);
    } finally {
      setSaving(false);
    }
  };

  const tabHasGap = (l: PromoLang) => !form.content[l].title.trim() || !form.content[l].ctaLabel.trim();
  const text = form.content[tab];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4" role="dialog" aria-modal="true">
      <div className="bg-white w-full sm:max-w-3xl max-h-[95vh] sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in duration-150">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-[#0B2545]">
            {promotion ? tr("Edit Promotion", "Modifier la Promotion") : tr("New Promotion", "Nouvelle Promotion")}
          </h2>
          <button type="button" onClick={onClose} disabled={saving} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer" aria-label={tr("Close", "Fermer")}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-7">
          {/* General */}
          <Section title={tr("General", "Général")}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-3">
                <label className={labelCls}>{tr("Internal name", "Nom interne")}</label>
                <input className={inputCls} value={form.name} maxLength={120} placeholder="e.g. Douala – October 2026" onChange={(e) => patch({ name: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>{tr("Show after (seconds)", "Afficher après (secondes)")}</label>
                <input
                  type="number"
                  min={0}
                  max={LIMITS.maxDelaySeconds}
                  className={inputCls}
                  value={form.delaySeconds}
                  onChange={(e) => patch({ delaySeconds: Math.min(LIMITS.maxDelaySeconds, Math.max(0, Math.floor(Number(e.target.value) || 0))) })}
                />
                <p className="text-[10px] text-slate-400 mt-1">{tr("0 = immediately on page load.", "0 = dès le chargement de la page.")}</p>
              </div>
              <div>
                <label className={labelCls}>{tr("Priority", "Priorité")}</label>
                <input
                  type="number"
                  min={0}
                  max={999}
                  className={inputCls}
                  value={form.priority}
                  onChange={(e) => patch({ priority: Math.min(999, Math.max(0, Math.floor(Number(e.target.value) || 0))) })}
                />
                <p className="text-[10px] text-slate-400 mt-1">{tr("Lowest number is shown first.", "Le plus petit numéro s'affiche en premier.")}</p>
              </div>
              <div>
                <span className={labelCls}>{tr("Status", "Statut")}</span>
                <label className="flex items-center gap-2 h-[34px] cursor-pointer">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => patch({ isActive: e.target.checked })} className="w-4 h-4 accent-[#0B2545]" />
                  <span className="text-xs font-semibold text-slate-700">{form.isActive ? tr("Active", "Actif") : tr("Inactive", "Inactif")}</span>
                </label>
              </div>
            </div>
          </Section>

          {/* Schedule */}
          <Section
            title={tr("Schedule", "Planification")}
            hint={tr("Leave start/end empty to show whenever the promotion is active.", "Laissez début/fin vides pour afficher dès que la promotion est active.")}
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>{tr("Departure date", "Date de départ")}</label>
                <input type="date" className={inputCls} value={form.departureDate ?? ""} onChange={(e) => patch({ departureDate: e.target.value || null })} />
              </div>
              <div>
                <label className={labelCls}>{tr("Visible from", "Visible à partir du")}</label>
                <input type="datetime-local" className={inputCls} value={toLocalInput(form.startsAt)} onChange={(e) => patch({ startsAt: fromLocalInput(e.target.value) })} />
              </div>
              <div>
                <label className={labelCls}>{tr("Visible until", "Visible jusqu'au")}</label>
                <input type="datetime-local" className={inputCls} value={toLocalInput(form.endsAt)} onChange={(e) => patch({ endsAt: fromLocalInput(e.target.value) })} />
              </div>
            </div>
          </Section>

          {/* Route */}
          <Section title={tr("Destination & Ports", "Destination & Ports")} hint={tr("Flags are optional and only shown for the countries you pick.", "Les drapeaux sont optionnels et affichés uniquement pour les pays choisis.")}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{tr("Destination city / port", "Ville / port de destination")}</label>
                <input className={inputCls} value={form.destination.city} maxLength={80} placeholder="Douala" onChange={(e) => patch({ destination: { ...form.destination, city: e.target.value } })} />
              </div>
              <div>
                <label className={labelCls}>{tr("Destination country", "Pays de destination")}</label>
                <CountrySelect
                  value={codeToName(form.destination.countryCode)}
                  onChange={(name) => patch({ destination: { ...form.destination, countryCode: countryNameToCode(name) } })}
                  placeholder={tr("Select country…", "Choisir un pays…")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={labelCls + " !mb-0"}>{tr("Other ports served", "Autres ports desservis")}</span>
                <button
                  type="button"
                  disabled={form.ports.length >= LIMITS.maxPorts}
                  onClick={() => patch({ ports: [...form.ports, { label: "", countryCode: "" }] })}
                  className="text-[11px] font-bold text-[#0B2545] flex items-center gap-1 disabled:opacity-40 cursor-pointer"
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
                    placeholder="Matadi"
                    onChange={(e) => patch({ ports: form.ports.map((p, j) => (j === i ? { ...p, label: e.target.value } : p)) })}
                  />
                  <CountrySelect
                    value={codeToName(port.countryCode)}
                    onChange={(name) => patch({ ports: form.ports.map((p, j) => (j === i ? { ...p, countryCode: countryNameToCode(name) } : p)) })}
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

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.showFlags} onChange={(e) => patch({ showFlags: e.target.checked })} className="w-4 h-4 accent-[#0B2545]" />
              <span className="text-xs font-semibold text-slate-700">{tr("Show country flags", "Afficher les drapeaux des pays")}</span>
            </label>
          </Section>

          {/* CTA */}
          <Section title={tr("Button link", "Lien du bouton")}>
            <input className={inputCls} value={form.cta.url} maxLength={2048} placeholder="/quote  or  https://…" onChange={(e) => patch({ cta: { url: e.target.value } })} />
          </Section>

          {/* Content */}
          <Section
            title={tr("Content", "Contenu")}
            hint={tr(
              "Both languages are required. Use placeholders so key details stay identical in EN and FR:",
              "Les deux langues sont requises. Utilisez les variables pour garder les détails identiques en EN et FR :"
            )}
          >
            <div className="flex flex-wrap gap-1.5 -mt-1">
              {PLACEHOLDERS.map((p) => (
                <code key={p} className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-mono text-slate-600">
                  {p}
                </code>
              ))}
            </div>

            <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
              {(["en", "fr"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setTab(l)}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    tab === l ? "bg-white text-[#0B2545] shadow-xs" : "text-slate-500"
                  }`}
                >
                  {l === "en" ? "English" : "Français"}
                  {tabHasGap(l) && <span className="w-1.5 h-1.5 rounded-full bg-[#d21f27]" aria-label="incomplete" />}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className={labelCls}>{tr("Title", "Titre")} *</label>
                <input className={inputCls} value={text.title} maxLength={LIMITS.title} placeholder={tab === "en" ? "Next Shipment to {{city}}" : "Prochain chargement – {{city}}"} onChange={(e) => patchText(tab, { title: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>{tr("Description", "Description")}</label>
                <textarea
                  rows={3}
                  className={inputCls + " resize-y"}
                  value={text.description}
                  maxLength={LIMITS.description}
                  placeholder={tab === "en" ? "Departure on {{date}} to {{destination}}." : "Départ le {{date}} vers {{destination}}."}
                  onChange={(e) => patchText(tab, { description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>{tr("Highlight badge", "Mention en évidence")}</label>
                  <input className={inputCls} value={text.badge} maxLength={LIMITS.badge} placeholder={tab === "en" ? "Last spaces available!" : "Dernières places disponibles !"} onChange={(e) => patchText(tab, { badge: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>{tr("Button text", "Texte du bouton")} *</label>
                  <input className={inputCls} value={text.ctaLabel} maxLength={LIMITS.ctaLabel} placeholder={tab === "en" ? "Get a Quote" : "Obtenir un devis"} onChange={(e) => patchText(tab, { ctaLabel: e.target.value })} />
                </div>
              </div>
              <div>
                <label className={labelCls}>{tr("Footer line", "Ligne de pied de page")}</label>
                <input className={inputCls} value={text.footer} maxLength={LIMITS.footer} placeholder={tab === "en" ? "Reliable transport. Professional service. Across Africa." : "Transport fiable. Service professionnel. Partout en Afrique."} onChange={(e) => patchText(tab, { footer: e.target.value })} />
              </div>

              <div className="pt-1">
                <label className={labelCls}>{tr("Promotional image", "Image promotionnelle")} ({tab.toUpperCase()})</label>
                <PromotionImageUploader value={form.image[tab]} onChange={(image) => patch({ image: { ...form.image, [tab]: image } })} />
                {!form.image[tab] && (
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    {tr("Without an image the website shows the text version for this language.", "Sans image, le site affiche la version texte pour cette langue.")}
                  </p>
                )}
              </div>
              <div>
                <label className={labelCls}>{tr("Image alt text", "Texte alternatif de l'image")}</label>
                <input className={inputCls} value={text.imageAlt} maxLength={LIMITS.imageAlt} placeholder={tr("Defaults to the title", "Utilise le titre par défaut")} onChange={(e) => patchText(tab, { imageAlt: e.target.value })} />
              </div>
            </div>
          </Section>
        </div>

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

        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50/60 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onPreview(form)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-[#0B2545] hover:bg-slate-50 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            {tr("Preview", "Aperçu")}
          </button>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} disabled={saving} className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer">
              {tr("Cancel", "Annuler")}
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-[#0B2545] hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition disabled:opacity-60 cursor-pointer"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? tr("Saving…", "Enregistrement…") : tr("Save Promotion", "Enregistrer")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

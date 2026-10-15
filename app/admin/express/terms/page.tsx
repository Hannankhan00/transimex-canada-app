"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from "lucide-react";
import PermissionGuard from "@/components/admin/PermissionGuard";
import { ExpressAdminTabs, adminInput, formatDate, useTr } from "@/components/admin/express/expressAdminShared";
import type { TermsContent, TermsLanguageContent } from "@/lib/express/terms";
import type { TermsVersion } from "@/lib/express/termsStore";

type Lang = "en" | "fr";

const clone = (c: TermsContent): TermsContent => JSON.parse(JSON.stringify(c));

export default function AdminExpressTermsPage() {
  const { language, tr } = useTr();
  const [versions, setVersions] = useState<TermsVersion[]>([]);
  const [draft, setDraft] = useState<TermsContent | null>(null);
  const [editLang, setEditLang] = useState<Lang>("en");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [viewing, setViewing] = useState<TermsVersion | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/express/terms");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load terms");
      setVersions(data.versions);
      setDraft(clone(data.current.content));
    } catch (err: any) {
      setMessage({ text: err.message, error: true });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const current = versions[0];

  const patchLang = (lang: Lang, fn: (c: TermsLanguageContent) => void) =>
    setDraft((d) => {
      if (!d) return d;
      const next = clone(d);
      fn(next[lang]);
      return next;
    });

  const move = (lang: Lang, i: number, dir: -1 | 1) =>
    patchLang(lang, (c) => {
      const j = i + dir;
      if (j < 0 || j >= c.sections.length) return;
      [c.sections[i], c.sections[j]] = [c.sections[j], c.sections[i]];
    });

  const publish = async () => {
    if (!draft) return;
    const ok = window.confirm(
      tr(
        "Publish a new version? New applicants will accept it. Existing accounts keep the version they already accepted.",
        "Publier une nouvelle version? Les nouveaux demandeurs l'accepteront. Les comptes existants gardent la version qu'ils ont déjà acceptée."
      )
    );
    if (!ok) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/express/terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = Array.isArray(data.fields) ? data.fields.map((f: { path: string; message: string }) => `${f.path}: ${f.message}`).join("; ") : "";
        throw new Error([data.error, detail].filter(Boolean).join(" — ") || "Publish failed");
      }
      setVersions(data.versions);
      setDraft(clone(data.current.content));
      setMessage({ text: tr(`Published ${data.current.version}.`, `${data.current.version} publiée.`) });
    } catch (err: any) {
      setMessage({ text: err.message, error: true });
    } finally {
      setSaving(false);
    }
  };

  const editing = draft?.[editLang];
  const unchanged = draft && current && JSON.stringify(draft) === JSON.stringify(current.content);

  return (
    <PermissionGuard module="express">
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0B2545]">Transimex Express</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            {tr("The terms of service every applicant accepts. Each change is published as a new version.", "Les conditions d'utilisation que chaque demandeur accepte. Chaque changement est publié comme nouvelle version.")}
          </p>
        </div>

        <ExpressAdminTabs />

        {loading || !draft || !current ? (
          <div className="py-12 text-center text-xs text-slate-400">{tr("Loading...", "Chargement...")}</div>
        ) : (
          <div className="grid xl:grid-cols-3 gap-5">
            <section className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-[#0B2545] text-sm">
                    {tr("Edit terms", "Modifier les conditions")} · {tr("current version", "version actuelle")} <b>{current.version}</b>
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {tr("Both languages are required. Publishing creates a new version; old versions are kept.", "Les deux langues sont requises. La publication crée une nouvelle version; les anciennes sont conservées.")}
                  </p>
                </div>
                <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-bold">
                  {(["en", "fr"] as Lang[]).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setEditLang(l)}
                      className={`px-3 py-1.5 cursor-pointer ${editLang === l ? "bg-[#0B2545] text-white" : "bg-white text-slate-600"}`}
                    >
                      {l === "en" ? "English" : "Français"}
                    </button>
                  ))}
                </div>
              </div>

              {editing && (
                <div className="space-y-4">
                  <label className="block space-y-1">
                    <span className="text-xs font-bold text-slate-700">{tr("Heading", "Titre")}</span>
                    <input className={adminInput} value={editing.heading} onChange={(e) => patchLang(editLang, (c) => void (c.heading = e.target.value))} maxLength={200} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs font-bold text-slate-700">{tr("Introduction", "Introduction")}</span>
                    <textarea className={adminInput} rows={3} value={editing.intro} onChange={(e) => patchLang(editLang, (c) => void (c.intro = e.target.value))} maxLength={2000} />
                  </label>

                  <div className="space-y-3">
                    {editing.sections.map((s, i) => (
                      <div key={i} className="rounded-xl border border-slate-200 p-3 space-y-2 bg-slate-50">
                        <div className="flex items-center gap-2">
                          <input
                            className={adminInput}
                            value={s.title}
                            placeholder={tr("Section title", "Titre de la section")}
                            onChange={(e) => patchLang(editLang, (c) => void (c.sections[i].title = e.target.value))}
                            maxLength={200}
                          />
                          <button type="button" aria-label="Move up" onClick={() => move(editLang, i, -1)} className="p-2 rounded-lg hover:bg-white cursor-pointer text-slate-500">
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button type="button" aria-label="Move down" onClick={() => move(editLang, i, 1)} className="p-2 rounded-lg hover:bg-white cursor-pointer text-slate-500">
                            <ArrowDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            aria-label="Remove section"
                            onClick={() => patchLang(editLang, (c) => void c.sections.splice(i, 1))}
                            className="p-2 rounded-lg hover:bg-red-50 cursor-pointer text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <textarea
                          className={adminInput}
                          rows={3}
                          value={s.body}
                          placeholder={tr("Section text", "Texte de la section")}
                          onChange={(e) => patchLang(editLang, (c) => void (c.sections[i].body = e.target.value))}
                          maxLength={4000}
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => patchLang(editLang, (c) => void c.sections.push({ title: "", body: "" }))}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0B2545] hover:underline cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {tr("Add section", "Ajouter une section")}
                    </button>
                    <p className="text-[11px] text-slate-500">
                      {tr("Tip: keep the English and French sections in the same order.", "Astuce : gardez les sections anglaises et françaises dans le même ordre.")}
                    </p>
                  </div>
                </div>
              )}

              {message && (
                <p role="status" className={`text-xs font-semibold ${message.error ? "text-red-600" : "text-emerald-700"}`}>
                  {message.text}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={saving || !!unchanged}
                  onClick={publish}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0B2545] hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {tr("Publish as new version", "Publier comme nouvelle version")}
                </button>
                <button
                  type="button"
                  disabled={saving || !!unchanged}
                  onClick={() => setDraft(clone(current.content))}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 disabled:opacity-50 cursor-pointer"
                >
                  {tr("Discard changes", "Annuler les changements")}
                </button>
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-slate-200 p-5">
              <h2 className="font-bold text-[#0B2545] text-sm mb-2">{tr("Version history", "Historique des versions")}</h2>
              <ul className="divide-y divide-slate-100 text-xs">
                {versions.map((v, i) => (
                  <li key={v.version} className="py-2 flex items-center justify-between gap-3">
                    <span>
                      <b className="text-slate-800">{v.version}</b>
                      {i === 0 && <span className="ml-2 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold">{tr("current", "actuelle")}</span>}
                      <span className="block text-slate-500">
                        {v.publishedAt ? `${v.publishedByName} · ${formatDate(v.publishedAt, language)}` : tr("Built-in default", "Version par défaut")}
                      </span>
                    </span>
                    <button type="button" onClick={() => setViewing(viewing?.version === v.version ? null : v)} className="underline text-slate-600 cursor-pointer">
                      {viewing?.version === v.version ? tr("Hide", "Masquer") : tr("View", "Voir")}
                    </button>
                  </li>
                ))}
              </ul>
              {viewing && (
                <div className="mt-3 rounded-xl bg-slate-50 border border-slate-200 p-3 max-h-80 overflow-y-auto text-xs space-y-2">
                  <p className="font-bold">
                    {viewing.version} · {viewing.content[language].heading}
                  </p>
                  <p className="whitespace-pre-line">{viewing.content[language].intro}</p>
                  {viewing.content[language].sections.map((s, i) => (
                    <div key={i}>
                      <p className="font-bold">{s.title}</p>
                      <p className="whitespace-pre-line">{s.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { BlogPostItem } from "@/lib/blogTypes";
import { X, Languages, Save, CheckCircle2, AlertCircle } from "lucide-react";

interface BlogEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  postToEdit?: BlogPostItem | null;
  onPostSaved: (post: BlogPostItem) => void;
}

const DEFAULT_AUTHOR = "Transimex Logistics Editorial";
const DEFAULT_FEATURED_IMAGE =
  "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1200";

export default function BlogEditorModal({
  isOpen,
  onClose,
  postToEdit,
  onPostSaved,
}: BlogEditorModalProps) {
  const { language } = useLanguage();
  const isEditing = !!postToEdit;

  // Language tab state
  const [langTab, setLangTab] = useState<"en" | "fr">("en");

  // Bilingual fields
  const [titleEn, setTitleEn] = useState("");
  const [titleFr, setTitleFr] = useState("");
  const [excerptEn, setExcerptEn] = useState("");
  const [excerptFr, setExcerptFr] = useState("");
  const [contentEn, setContentEn] = useState("");
  const [contentFr, setContentFr] = useState("");

  // Common metadata
  const [slug, setSlug] = useState("");
  const [author, setAuthor] = useState(DEFAULT_AUTHOR);
  const [category, setCategory] = useState("Regulatory Compliance");
  const [status, setStatus] = useState<"Draft" | "Published">("Draft");
  const [featuredImage, setFeaturedImage] = useState(DEFAULT_FEATURED_IMAGE);
  const [tagsStr, setTagsStr] = useState("Customs, Cross-Border, Logistics");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (postToEdit) {
      setTitleEn(postToEdit.title.en);
      setTitleFr(postToEdit.title.fr);
      setExcerptEn(postToEdit.excerpt.en);
      setExcerptFr(postToEdit.excerpt.fr);
      setContentEn(postToEdit.content.en);
      setContentFr(postToEdit.content.fr);
      setSlug(postToEdit.slug);
      setAuthor(postToEdit.author);
      setCategory(postToEdit.category);
      setStatus(postToEdit.status);
      setFeaturedImage(postToEdit.featuredImage);
      setTagsStr(postToEdit.tags.join(", "));
    } else {
      setTitleEn("");
      setTitleFr("");
      setExcerptEn("");
      setExcerptFr("");
      setContentEn("");
      setContentFr("");
      setSlug("");
      setAuthor(DEFAULT_AUTHOR);
      setCategory("Regulatory Compliance");
      setStatus("Draft");
      setFeaturedImage(DEFAULT_FEATURED_IMAGE);
      setTagsStr("Customs, Cross-Border, Logistics");
    }
  }, [postToEdit, isOpen]);

  if (!isOpen) return null;

  // Auto-generate slug when English title changes if new post
  const handleTitleEnChange = (val: string) => {
    setTitleEn(val);
    if (!isEditing) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
      setSlug(generated);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!titleEn.trim() || !titleFr.trim()) {
      setError(
        language === "fr"
          ? "Les titres anglais et français sont requis pour une publication bilingue."
          : "Both English and French titles are required for bilingual publication."
      );
      return;
    }

    const payload = {
      title: { en: titleEn, fr: titleFr },
      excerpt: { en: excerptEn, fr: excerptFr },
      content: { en: contentEn, fr: contentFr },
      slug: slug || titleEn.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      author,
      category,
      status,
      featuredImage,
      tags: tagsStr.split(",").map((t) => t.trim()).filter(Boolean),
    };

    try {
      setSubmitting(true);
      const url = isEditing
        ? `/api/admin/blog/${encodeURIComponent(postToEdit.id)}`
        : "/api/admin/blog";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save post");

      onPostSaved(data.post);
      onClose();
    } catch (err: any) {
      setError(err.message || (language === "fr" ? "Échec de l'enregistrement de l'article" : "Failed to save post"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0B2545] text-white flex items-center justify-center flex-shrink-0">
              <Languages className="w-5 h-5 text-[#d21f27]" />
            </div>
            <div>
              <h3 className="font-bold text-[#0B2545] text-base leading-tight">
                {isEditing
                  ? `${language === "fr" ? "Modifier l'Article Bilingue" : "Edit Bilingual Article"}: ${postToEdit.slug}`
                  : language === "fr"
                  ? "Créer un Article Logistique Bilingue"
                  : "Create Bilingual Logistics Article"}
              </h3>
              <p className="text-[11px] text-slate-500">
                {language === "fr"
                  ? "Rédigez et publiez des articles synchronisés en anglais et en français pour le site public /blog."
                  : "Author and publish synchronized English and French articles for the public /blog hub."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 flex-1 overflow-y-auto pr-1 text-xs">
          {/* Dual-Language Switcher Tabs */}
          <div className="flex items-center justify-between bg-slate-100 p-1 rounded-xl border border-slate-200">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setLangTab("en")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  langTab === "en" ? "bg-white text-[#0B2545] shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>🇬🇧 {language === "fr" ? "Version Anglaise" : "English Version"}</span>
                {titleEn.trim() && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
              </button>

              <button
                type="button"
                onClick={() => setLangTab("fr")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  langTab === "fr" ? "bg-white text-[#0B2545] shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>🇨🇦 {language === "fr" ? "Version Française" : "French Version"}</span>
                {titleFr.trim() && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
              </button>
            </div>

            <span className="text-[11px] font-mono text-slate-500 pr-2">
              {language === "fr" ? "Édition" : "Editing"}: <strong className="text-slate-800 uppercase">{langTab}</strong>
            </span>
          </div>

          {/* Tab 1: English Fields */}
          {langTab === "en" && (
            <div className="space-y-3 p-4 bg-slate-50/60 rounded-xl border border-slate-200">
              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  {language === "fr" ? "Titre de l'Article (Anglais)" : "Article Title (English)"}
                </label>
                <input
                  type="text"
                  placeholder="e.g. The Essential Guide to CBSA PARS Clearance"
                  value={titleEn}
                  onChange={(e) => handleTitleEnChange(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-[#0B2545] rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  {language === "fr" ? "Extrait de l'Article (Anglais)" : "Article Excerpt (English)"}
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief summary for social sharing and search cards..."
                  value={excerptEn}
                  onChange={(e) => setExcerptEn(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-[#0B2545] rounded-xl p-2.5 text-xs text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  {language === "fr" ? "Contenu Principal (Anglais)" : "Body Content (English)"}
                </label>
                <textarea
                  rows={6}
                  placeholder="Write complete article content in markdown or text..."
                  value={contentEn}
                  onChange={(e) => setContentEn(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-[#0B2545] rounded-xl p-3 text-xs text-slate-800 outline-none leading-relaxed font-sans"
                />
              </div>
            </div>
          )}

          {/* Tab 2: French Fields */}
          {langTab === "fr" && (
            <div className="space-y-3 p-4 bg-slate-50/60 rounded-xl border border-slate-200">
              <div>
                <label className="font-bold text-slate-800 block mb-1">Titre de l&apos;Article (Français)</label>
                <input
                  type="text"
                  placeholder="ex. Le guide essentiel du dédouanement PARS de l'ASFC"
                  value={titleFr}
                  onChange={(e) => setTitleFr(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-[#0B2545] rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Extrait (Français)</label>
                <textarea
                  rows={2}
                  placeholder="Bref résumé pour les cartes d'aperçu..."
                  value={excerptFr}
                  onChange={(e) => setExcerptFr(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-[#0B2545] rounded-xl p-2.5 text-xs text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Contenu Principal (Français)</label>
                <textarea
                  rows={6}
                  placeholder="Rédigez l'article complet en français..."
                  value={contentFr}
                  onChange={(e) => setContentFr(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-[#0B2545] rounded-xl p-3 text-xs text-slate-800 outline-none leading-relaxed font-sans"
                />
              </div>
            </div>
          )}

          {/* Common Metadata Section */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50/40 rounded-xl border border-slate-200">
            <div>
              <label className="font-bold text-slate-700 block mb-1">{language === "fr" ? "Auteur" : "Author"}</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">{language === "fr" ? "Catégorie" : "Category"}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none"
              >
                <option value="Regulatory Compliance">{language === "fr" ? "Conformité Réglementaire" : "Regulatory Compliance"}</option>
                <option value="Specialized Transport">{language === "fr" ? "Transport Spécialisé" : "Specialized Transport"}</option>
                <option value="Sustainability">{language === "fr" ? "Durabilité" : "Sustainability"}</option>
                <option value="Cross-Border Freight">{language === "fr" ? "Fret Transfrontalier" : "Cross-Border Freight"}</option>
                <option value="Company News">{language === "fr" ? "Actualités de l'Entreprise" : "Company News"}</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                {language === "fr" ? "État de Publication" : "Publication State"}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none"
              >
                <option value="Draft">{language === "fr" ? "Brouillon (Masqué)" : "Draft (Hidden)"}</option>
                <option value="Published">{language === "fr" ? "Publié (Public)" : "Published (Public)"}</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="font-bold text-slate-700 block mb-1">{language === "fr" ? "Slug d'URL" : "URL Slug"}</label>
              <div className="flex items-center gap-1">
                <span className="text-slate-400 font-mono text-[11px]">/blog/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-800 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                {language === "fr" ? "Étiquettes (Séparées par des Virgules)" : "Tags (Comma-separated)"}
              </label>
              <input
                type="text"
                value={tagsStr}
                onChange={(e) => setTagsStr(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="font-bold text-slate-700 block mb-1">
                {language === "fr" ? "URL de l'Image de Couverture" : "Featured Cover Image URL"}
              </label>
              <input
                type="text"
                value={featuredImage}
                onChange={(e) => setFeaturedImage(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none font-mono"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              {language === "fr" ? "Annuler" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-[#0B2545] hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5 text-[#d21f27]" />
              <span>
                {submitting
                  ? language === "fr"
                    ? "Enregistrement..."
                    : "Saving..."
                  : isEditing
                  ? language === "fr"
                    ? "Mettre à Jour l'Article"
                    : "Update Article"
                  : language === "fr"
                  ? "Créer l'Article Bilingue"
                  : "Create Bilingual Post"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

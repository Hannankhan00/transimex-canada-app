"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { BlogPostItem } from "@/lib/blogTypes";
import {
  ArrowLeft,
  FileText,
  Bold,
  Italic,
  Strikethrough,
  Highlighter,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Minus,
  Undo2,
  Redo2,
  Code,
  Eye,
  Upload,
  Image as ImageIcon,
  Trash2,
  Calendar,
  User,
  Tag,
  CheckCircle2,
  AlertCircle,
  Save,
  Send,
  Sparkles,
  Search,
  ExternalLink,
  RefreshCw,
  Globe,
} from "lucide-react";

interface BlogFullPageEditorProps {
  postToEdit?: BlogPostItem | null;
  onBack: () => void;
  onPostSaved: (savedPost: BlogPostItem) => void;
}

const DEFAULT_AUTHOR = "Transimex Logistics Editorial";
const CATEGORY_OPTIONS = [
  "Seasonal Advice",
  "Logistics Operations",
  "Cross-Border Freight",
  "Customs & Compliance",
  "Cold Chain & Reefer",
  "Intermodal & Rail",
  "Maritime & Ocean Shipping",
  "Air Cargo Express",
  "Warehousing & Fulfillment",
  "Supply Chain Strategy",
  "Industry Insights",
];

export default function BlogFullPageEditor({
  postToEdit,
  onBack,
  onPostSaved,
}: BlogFullPageEditorProps) {
  const { language } = useLanguage();
  const isEditing = !!postToEdit;

  // Language tab (EN / FR)
  const [langTab, setLangTab] = useState<"en" | "fr">("en");

  // Bilingual fields
  const [titleEn, setTitleEn] = useState("");
  const [titleFr, setTitleFr] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Content (stored as HTML string)
  const [contentEn, setContentEn] = useState("");
  const [contentFr, setContentFr] = useState("");

  // Excerpt
  const [excerptEn, setExcerptEn] = useState("");
  const [excerptFr, setExcerptFr] = useState("");

  // SEO fields
  const [metaTitleEn, setMetaTitleEn] = useState("");
  const [metaTitleFr, setMetaTitleFr] = useState("");
  const [metaDescEn, setMetaDescEn] = useState("");
  const [metaDescFr, setMetaDescFr] = useState("");

  // Sidebar / Publishing options
  const [status, setStatus] = useState<"Draft" | "Published">("Draft");
  const [category, setCategory] = useState("Seasonal Advice");
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState("");
  const [author, setAuthor] = useState(DEFAULT_AUTHOR);
  const [publishDate, setPublishDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  // Featured Image
  const [featuredImage, setFeaturedImage] = useState("");
  const [imageUploadMode, setImageUploadMode] = useState<"upload" | "url">("upload");
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rich text editor state
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  // Form submission state
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Populate data when editing
  useEffect(() => {
    if (postToEdit) {
      setTitleEn(postToEdit.title?.en || "");
      setTitleFr(postToEdit.title?.fr || "");
      setSlug(postToEdit.slug || "");
      setSlugManuallyEdited(true);

      setContentEn(postToEdit.content?.en || "");
      setContentFr(postToEdit.content?.fr || "");

      setExcerptEn(postToEdit.excerpt?.en || "");
      setExcerptFr(postToEdit.excerpt?.fr || "");

      setMetaTitleEn(postToEdit.metaTitle?.en || "");
      setMetaTitleFr(postToEdit.metaTitle?.fr || "");
      setMetaDescEn(postToEdit.metaDescription?.en || "");
      setMetaDescFr(postToEdit.metaDescription?.fr || "");

      setStatus(postToEdit.status || "Draft");

      const cat = postToEdit.category || "Seasonal Advice";
      if (CATEGORY_OPTIONS.includes(cat)) {
        setCategory(cat);
        setIsCustomCategory(false);
      } else {
        setCategory("__custom__");
        setIsCustomCategory(true);
        setCustomCategory(cat);
      }

      setAuthor(postToEdit.author || DEFAULT_AUTHOR);
      setFeaturedImage(postToEdit.featuredImage || "");
      setImageUrlInput(postToEdit.featuredImage || "");
      setTags(Array.isArray(postToEdit.tags) ? postToEdit.tags : []);

      if (postToEdit.publishedDate && postToEdit.publishedDate !== "Draft") {
        const parsed = new Date(postToEdit.publishedDate);
        if (!isNaN(parsed.getTime())) {
          setPublishDate(parsed.toISOString().split("T")[0]);
        }
      }
    } else {
      // Defaults for new post
      setTitleEn("");
      setTitleFr("");
      setSlug("");
      setSlugManuallyEdited(false);
      setContentEn("");
      setContentFr("");
      setExcerptEn("");
      setExcerptFr("");
      setMetaTitleEn("");
      setMetaTitleFr("");
      setMetaDescEn("");
      setMetaDescFr("");
      setStatus("Draft");
      setCategory("Seasonal Advice");
      setIsCustomCategory(false);
      setCustomCategory("");
      setAuthor(DEFAULT_AUTHOR);
      setFeaturedImage("");
      setImageUrlInput("");
      setTags(["Logistics", "Freight", "Canada"]);
    }
  }, [postToEdit]);

  // Sync editor innerHTML when active tab changes or initial load
  const activeContent = langTab === "en" ? contentEn : contentFr;
  useEffect(() => {
    if (editorRef.current && !isHtmlMode) {
      if (editorRef.current.innerHTML !== activeContent) {
        editorRef.current.innerHTML = activeContent;
      }
    }
  }, [langTab, isHtmlMode]);

  // Auto-generate slug from English title if not manually edited
  const handleTitleEnChange = (val: string) => {
    setTitleEn(val);
    if (!slugManuallyEdited && !isEditing) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
      setSlug(generated);
    }
  };

  // Sync editor changes to state
  const handleEditorInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      if (langTab === "en") {
        setContentEn(html);
      } else {
        setContentFr(html);
      }
    }
  };

  // Execute formatting command without stealing focus
  const executeCommand = (command: string, value: string | undefined = undefined) => {
    if (isHtmlMode) return;
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, value);
    handleEditorInput();
  };

  // Highlight action (applies yellow highlight to selected text)
  const handleHighlight = () => {
    if (isHtmlMode) return;
    if (editorRef.current) {
      editorRef.current.focus();
    }
    // Try backColor with #fef08a (light warm yellow marker)
    try {
      document.execCommand("hiliteColor", false, "#fef08a");
    } catch {
      document.execCommand("backColor", false, "#fef08a");
    }
    handleEditorInput();
  };

  // Insert Link
  const handleInsertLink = () => {
    if (isHtmlMode) return;
    const url = prompt(
      language === "fr" ? "Entrez l'URL du lien :" : "Enter the URL link:",
      "https://"
    );
    if (url) {
      executeCommand("createLink", url);
    }
  };

  // Insert Divider
  const handleInsertDivider = () => {
    executeCommand("insertHorizontalRule");
  };

  // Tag management
  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = tagInput.trim().replace(/^,+|,+$/g, "");
      if (val && !tags.includes(val)) {
        setTags([...tags, val]);
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Image Upload handler
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageError(null);
    setIsUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/blog/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload image");
      }

      setFeaturedImage(data.url);
      setImageUrlInput(data.url);
      setSuccessToast(
        language === "fr" ? "Image téléversée avec succès !" : "Image uploaded successfully!"
      );
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err: any) {
      setImageError(err.message || "Failed to upload image");
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Drag and Drop image upload
  const handleDropImage = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    setImageError(null);
    setIsUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/blog/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload image");

      setFeaturedImage(data.url);
      setImageUrlInput(data.url);
      setSuccessToast(
        language === "fr" ? "Image téléversée avec succès !" : "Image uploaded successfully!"
      );
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err: any) {
      setImageError(err.message || "Failed to upload image");
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Save handler (Draft or Published)
  const handleSave = async (overrideStatus?: "Draft" | "Published") => {
    setErrorMessage(null);
    const saveStatus = overrideStatus || status;

    // Validation
    if (!titleEn.trim()) {
      setErrorMessage(
        language === "fr" ? "Le titre anglais est requis." : "English article title is required."
      );
      setLangTab("en");
      return;
    }

    if (!titleFr.trim()) {
      setErrorMessage(
        language === "fr"
          ? "Le titre français est requis pour la conformité bilingue."
          : "French article title is required for bilingual publishing."
      );
      setLangTab("fr");
      return;
    }

    const finalCategory = isCustomCategory ? customCategory.trim() || "General" : category;
    const finalSlug =
      slug.trim() ||
      titleEn
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");

    const payload = {
      title: { en: titleEn.trim(), fr: titleFr.trim() },
      slug: finalSlug,
      excerpt: { en: excerptEn.trim(), fr: excerptFr.trim() },
      content: { en: contentEn, fr: contentFr },
      metaTitle: { en: metaTitleEn.trim(), fr: metaTitleFr.trim() },
      metaDescription: { en: metaDescEn.trim(), fr: metaDescFr.trim() },
      author: author.trim() || DEFAULT_AUTHOR,
      category: finalCategory,
      status: saveStatus,
      publishedDate: publishDate,
      featuredImage: featuredImage.trim(),
      tags,
    };

    try {
      setSaving(true);
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
      if (!res.ok) throw new Error(data.error || "Failed to save blog post");

      onPostSaved(data.post);
    } catch (err: any) {
      setErrorMessage(
        err.message ||
          (language === "fr"
            ? "Une erreur est survenue lors de l'enregistrement de l'article."
            : "An error occurred while saving the blog post.")
      );
    } finally {
      setSaving(false);
    }
  };

  // Word count helper
  const wordCount = (text: string) => {
    const clean = text.replace(/<[^>]*>/g, " ").trim();
    if (!clean) return 0;
    return clean.split(/\s+/).filter(Boolean).length;
  };

  const activeTitle = langTab === "en" ? titleEn : titleFr;
  const activeExcerpt = langTab === "en" ? excerptEn : excerptFr;
  const activeMetaTitle = langTab === "en" ? metaTitleEn : metaTitleFr;
  const activeMetaDesc = langTab === "en" ? metaDescEn : metaDescFr;

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-16">
      {/* 1. TOP HEADER & NAVIGATION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div className="flex items-start sm:items-center gap-3.5">
          <button
            type="button"
            onClick={onBack}
            className="p-2 sm:p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-[#0B2545] shadow-2xs transition cursor-pointer flex items-center gap-1.5 text-xs font-bold group"
            title={language === "fr" ? "Retour aux articles" : "Back to articles"}
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="hidden sm:inline">
              {language === "fr" ? "Retour" : "Back to Articles"}
            </span>
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 text-[#d21f27] flex items-center justify-center flex-shrink-0 shadow-2xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#0B2545] tracking-tight leading-snug">
                {isEditing
                  ? language === "fr"
                    ? "Modifier l'Article de Blog"
                    : "Edit Blog Post"
                  : language === "fr"
                  ? "Rédiger un Nouvel Article"
                  : "Write New Blog Post"}
              </h1>
              <p className="text-slate-500 text-xs">
                {language === "fr"
                  ? "Créez des guides logistiques et des conseils d'expédition pour vos clients."
                  : "Create freight guides, supply chain insights, and industry advice for shippers."}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons: Save Draft & Publish Post */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave("Draft")}
            className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold shadow-2xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5 text-slate-500" />
            <span>{language === "fr" ? "Enregistrer Brouillon" : "Save Draft"}</span>
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave("Published")}
            className="px-5 py-2 bg-[#d21f27] hover:bg-[#b91c1c] text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Send className="w-3.5 h-3.5 text-white" />
            )}
            <span>
              {isEditing
                ? status === "Published"
                  ? language === "fr"
                    ? "Mettre à Jour l'Article"
                    : "Update Post"
                  : language === "fr"
                  ? "Publier l'Article"
                  : "Publish Post"
                : language === "fr"
                ? "Publier l'Article"
                : "Publish Post"}
            </span>
          </button>
        </div>
      </div>

      {/* Notifications / Error Banner */}
      {errorMessage && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold flex items-center gap-2.5 shadow-2xs animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successToast && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2.5 shadow-2xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* 2. DUAL-LANGUAGE TOGGLE BAR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLangTab("en")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              langTab === "en"
                ? "bg-[#0B2545] text-white shadow-xs"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200"
            }`}
          >
            <span>🇬🇧 English Content</span>
            {titleEn.trim() && contentEn.trim() && (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setLangTab("fr")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              langTab === "fr"
                ? "bg-[#0B2545] text-white shadow-xs"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200"
            }`}
          >
            <span>🇨🇦 Contenu Français</span>
            {titleFr.trim() && contentFr.trim() && (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            )}
          </button>
        </div>

        <div className="text-[11px] text-slate-500 flex items-center gap-2 px-2">
          <Globe className="w-3.5 h-3.5 text-[#d21f27]" />
          <span>
            {language === "fr" ? "Langue active en édition :" : "Active editing language:"}{" "}
            <strong className="text-slate-800 uppercase font-mono">{langTab}</strong>
          </span>
        </div>
      </div>

      {/* 3. MAIN FORM GRID: LEFT EDITOR + RIGHT SIDEBAR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Main Article Inputs (Col 1 to 8) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Article Title Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <span>{language === "fr" ? "Titre de l'Article" : "Article Title"}</span>
              <span className="text-red-500">*</span>
              <span className="text-[10px] text-slate-400 font-normal">
                ({langTab === "en" ? "English" : "Français"})
              </span>
            </label>
            <input
              type="text"
              required
              value={langTab === "en" ? titleEn : titleFr}
              onChange={(e) =>
                langTab === "en"
                  ? handleTitleEnChange(e.target.value)
                  : setTitleFr(e.target.value)
              }
              placeholder={
                langTab === "en"
                  ? "e.g. Canadian Cross-Border Freight Trends: 5 Strategic Logistics Steps"
                  : "ex. Tendances du Fret Transfrontalier Canadien : 5 Stratégies Clés"
              }
              className="w-full px-4 py-2.5 bg-slate-50/70 border border-slate-200 focus:border-[#0B2545] focus:bg-white rounded-xl text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400"
            />
          </div>

          {/* URL Slug Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <span>{language === "fr" ? "Identifiant URL (Slug)" : "URL Slug"}</span>
              <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center">
              <span className="px-3.5 py-2.5 bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl text-xs font-mono text-slate-500 select-none">
                transimex.ca/blog/
              </span>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugManuallyEdited(true);
                }}
                placeholder="canadian-cross-border-freight-trends"
                className="flex-1 px-4 py-2.5 bg-slate-50/70 border border-slate-200 focus:border-[#0B2545] focus:bg-white rounded-r-xl text-xs font-mono text-slate-800 outline-none transition"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              {language === "fr"
                ? "Identifiant unique de l'article dans l'URL. Généré automatiquement ou personnalisable."
                : "Unique URL identifier for the article. Auto-generated from title or customized."}
            </p>
          </div>

          {/* Article Body Content (Rich Text) Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
            {/* Header + Toolbar */}
            <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <span>
                  {language === "fr"
                    ? "Contenu Principal de l'Article (Texte Enrichi)"
                    : "Article Body Content (Rich Text)"}
                </span>
                <span className="text-red-500">*</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  ({langTab === "en" ? "English" : "Français"})
                </span>
              </label>

              {/* Visual / HTML Switch */}
              <button
                type="button"
                onClick={() => setIsHtmlMode(!isHtmlMode)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-[11px] font-semibold transition cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
              >
                {isHtmlMode ? (
                  <>
                    <Eye className="w-3 h-3 text-blue-600" />
                    <span>{language === "fr" ? "Mode Visuel" : "Visual Editor"}</span>
                  </>
                ) : (
                  <>
                    <Code className="w-3 h-3 text-slate-600" />
                    <span>{language === "fr" ? "Code HTML" : "HTML Source"}</span>
                  </>
                )}
              </button>
            </div>

            {/* Rich Text Toolbar (disabled in HTML mode) */}
            {!isHtmlMode && (
              <div className="p-2 border-b border-slate-200 bg-white flex flex-wrap items-center gap-1 text-slate-700 select-none">
                {/* Bold */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    executeCommand("bold");
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
                  title="Bold (Ctrl+B)"
                >
                  <Bold className="w-4 h-4" />
                </button>

                {/* Italic */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    executeCommand("italic");
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
                  title="Italic (Ctrl+I)"
                >
                  <Italic className="w-4 h-4" />
                </button>

                {/* Strikethrough */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    executeCommand("strikeThrough");
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
                  title="Strikethrough"
                >
                  <Strikethrough className="w-4 h-4" />
                </button>

                {/* Highlight */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleHighlight();
                  }}
                  className="p-1.5 rounded-lg hover:bg-amber-100 text-amber-700 transition cursor-pointer flex items-center gap-0.5 bg-amber-50/60"
                  title="Highlight Text (Marker)"
                >
                  <Highlighter className="w-4 h-4 text-amber-600" />
                </button>

                <div className="w-[1px] h-5 bg-slate-200 mx-1" />

                {/* Heading 2 */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    executeCommand("formatBlock", "<h2>");
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer font-bold text-xs"
                  title="Heading 2"
                >
                  <Heading2 className="w-4 h-4" />
                </button>

                {/* Heading 3 */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    executeCommand("formatBlock", "<h3>");
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer font-bold text-xs"
                  title="Heading 3"
                >
                  <Heading3 className="w-4 h-4" />
                </button>

                <div className="w-[1px] h-5 bg-slate-200 mx-1" />

                {/* Bullet List */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    executeCommand("insertUnorderedList");
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
                  title="Bulleted List"
                >
                  <List className="w-4 h-4" />
                </button>

                {/* Numbered List */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    executeCommand("insertOrderedList");
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
                  title="Numbered List"
                >
                  <ListOrdered className="w-4 h-4" />
                </button>

                {/* Blockquote */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    executeCommand("formatBlock", "<blockquote>");
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
                  title="Blockquote"
                >
                  <Quote className="w-4 h-4" />
                </button>

                {/* Link */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleInsertLink();
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
                  title="Insert Link"
                >
                  <LinkIcon className="w-4 h-4" />
                </button>

                {/* Horizontal Divider */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleInsertDivider();
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
                  title="Horizontal Divider"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <div className="w-[1px] h-5 bg-slate-200 mx-1" />

                {/* Undo */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    executeCommand("undo");
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
                  title="Undo"
                >
                  <Undo2 className="w-4 h-4" />
                </button>

                {/* Redo */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    executeCommand("redo");
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
                  title="Redo"
                >
                  <Redo2 className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Editable Content Area */}
            {isHtmlMode ? (
              <textarea
                value={langTab === "en" ? contentEn : contentFr}
                onChange={(e) =>
                  langTab === "en" ? setContentEn(e.target.value) : setContentFr(e.target.value)
                }
                rows={16}
                placeholder="<p>Write raw HTML content here...</p>"
                className="w-full p-4 font-mono text-xs text-slate-800 bg-slate-900 text-slate-100 outline-none resize-y min-h-[360px]"
              />
            ) : (
              <div
                ref={editorRef}
                contentEditable
                onInput={handleEditorInput}
                className="p-5 min-h-[380px] max-h-[650px] overflow-y-auto text-sm text-slate-800 leading-relaxed outline-none focus:outline-none prose prose-slate max-w-none prose-headings:text-[#0B2545] prose-headings:font-bold prose-h2:text-lg prose-h2:mt-4 prose-h2:mb-2 prose-h3:text-base prose-h3:mt-3 prose-h3:mb-1.5 prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-blockquote:border-l-4 prose-blockquote:border-[#d21f27] prose-blockquote:bg-slate-50 prose-blockquote:py-1 prose-blockquote:px-3 prose-blockquote:italic prose-a:text-[#d21f27] prose-a:underline"
                style={{
                  minHeight: "360px",
                }}
              />
            )}

            {/* Footer Word & Character Counter */}
            <div className="p-2.5 px-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between text-[11px] text-slate-400">
              <span>
                {language === "fr" ? "Mise en forme interactive" : "Rich formatting enabled"} &bull;{" "}
                <span className="font-semibold text-slate-600">
                  {wordCount(langTab === "en" ? contentEn : contentFr)}
                </span>{" "}
                {language === "fr" ? "mots" : "words"}
              </span>
              <span>
                {(langTab === "en" ? contentEn : contentFr).replace(/<[^>]*>/g, "").length}{" "}
                {language === "fr" ? "caractères" : "characters"}
              </span>
            </div>
          </div>

          {/* Excerpt / Summary */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <span>
                  {language === "fr"
                    ? "Extrait & Résumé de l'Article"
                    : "Article Excerpt / Summary"}
                </span>
                <span className="text-[10px] text-slate-400 font-normal">
                  ({langTab === "en" ? "English" : "Français"})
                </span>
              </label>
              <span className="text-[11px] text-slate-400">
                {(langTab === "en" ? excerptEn : excerptFr).length} / 280
              </span>
            </div>
            <textarea
              rows={3}
              value={langTab === "en" ? excerptEn : excerptFr}
              onChange={(e) =>
                langTab === "en" ? setExcerptEn(e.target.value) : setExcerptFr(e.target.value)
              }
              placeholder={
                langTab === "en"
                  ? "Brief 2-3 sentence overview of this article to display on article cards and search listings..."
                  : "Bref résumé de 2-3 phrases de l'article pour les cartes d'aperçu..."
              }
              className="w-full px-4 py-2.5 bg-slate-50/70 border border-slate-200 focus:border-[#0B2545] focus:bg-white rounded-xl text-xs text-slate-800 outline-none transition resize-y"
            />
          </div>

          {/* SEO & Meta Tags Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Search className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-[#0B2545] text-xs">
                  {language === "fr"
                    ? "Optimisation SEO & Métadonnées (Google)"
                    : "SEO & Search Engine Optimization"}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {language === "fr"
                    ? "Configurez le titre et la description affichés dans les résultats de recherche Google."
                    : "Customize how this article appears in Google Search and social media previews."}
                </p>
              </div>
            </div>

            {/* Meta Title */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">
                  {language === "fr" ? "Titre Méta (SEO)" : "Meta Title"}
                </label>
                <span
                  className={`text-[10px] ${
                    activeMetaTitle.length > 60 ? "text-amber-600 font-bold" : "text-slate-400"
                  }`}
                >
                  {activeMetaTitle.length} / 60 {language === "fr" ? "caractères conseillés" : "recommended"}
                </span>
              </div>
              <input
                type="text"
                value={langTab === "en" ? metaTitleEn : metaTitleFr}
                onChange={(e) =>
                  langTab === "en"
                    ? setMetaTitleEn(e.target.value)
                    : setMetaTitleFr(e.target.value)
                }
                placeholder={
                  activeTitle
                    ? `${activeTitle} | Transimex Canada`
                    : "e.g. Canadian Cross-Border Freight Insights | Transimex"
                }
                className="w-full px-4 py-2 bg-slate-50/70 border border-slate-200 focus:border-[#0B2545] focus:bg-white rounded-xl text-xs text-slate-800 outline-none transition"
              />
            </div>

            {/* Meta Description */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">
                  {language === "fr" ? "Description Méta (SEO)" : "Meta Description"}
                </label>
                <span
                  className={`text-[10px] ${
                    activeMetaDesc.length > 160 ? "text-amber-600 font-bold" : "text-slate-400"
                  }`}
                >
                  {activeMetaDesc.length} / 160 {language === "fr" ? "caractères conseillés" : "recommended"}
                </span>
              </div>
              <textarea
                rows={2}
                value={langTab === "en" ? metaDescEn : metaDescFr}
                onChange={(e) =>
                  langTab === "en"
                    ? setMetaDescEn(e.target.value)
                    : setMetaDescFr(e.target.value)
                }
                placeholder={
                  activeExcerpt ||
                  "e.g. Learn how Transimex Canada streamlines cross-border customs, freight shipping, and intermodal transport across North America."
                }
                className="w-full px-4 py-2 bg-slate-50/70 border border-slate-200 focus:border-[#0B2545] focus:bg-white rounded-xl text-xs text-slate-800 outline-none transition resize-y"
              />
            </div>

            {/* Live Google Search Preview Mockup */}
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                {language === "fr" ? "Aperçu Résultats Google" : "Google Search Result Preview"}
              </span>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                <span className="w-3.5 h-3.5 rounded-full bg-[#0B2545] text-white text-[8px] flex items-center justify-center font-bold">
                  T
                </span>
                <span className="truncate text-slate-700">
                  transimex.ca › blog › {slug || "article-slug"}
                </span>
              </div>
              <h4 className="text-sm font-semibold text-blue-700 hover:underline cursor-pointer truncate">
                {activeMetaTitle || activeTitle || "Untitled Logistics Article | Transimex Canada"}
              </h4>
              <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                {activeMetaDesc ||
                  activeExcerpt ||
                  "Comprehensive Canadian cross-border shipping, freight operations, customs documentation, and supply chain insights by Transimex Canada."}
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Sidebar (Col 9 to 12) */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6">
          {/* Card 1: Publishing Options */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <h3 className="font-bold text-[#0B2545] text-sm border-b border-slate-100 pb-2.5">
              {language === "fr" ? "Options de Publication" : "Publishing Options"}
            </h3>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                {language === "fr" ? "Statut" : "Status"}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "Draft" | "Published")}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-[#0B2545] transition cursor-pointer"
              >
                <option value="Draft">Draft (Brouillon)</option>
                <option value="Published">Published (Publié en ligne)</option>
              </select>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                {language === "fr" ? "Catégorie" : "Category"}
              </label>
              <select
                value={category}
                onChange={(e) => {
                  const val = e.target.value;
                  setCategory(val);
                  setIsCustomCategory(val === "__custom__");
                }}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-[#0B2545] transition cursor-pointer"
              >
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="__custom__">+ Custom Category...</option>
              </select>

              {isCustomCategory && (
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Enter custom category..."
                  className="w-full mt-2 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-[#0B2545]"
                />
              )}
            </div>

            {/* Author Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                {language === "fr" ? "Nom de l'Auteur" : "Author Name"}
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="e.g. Transimex Logistics Specialist"
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-[#0B2545]"
                />
              </div>
            </div>

            {/* Publish Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                {language === "fr" ? "Date de Publication" : "Publish Date"}
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={publishDate}
                  onChange={(e) => setPublishDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-[#0B2545] cursor-pointer"
                />
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">
                {language === "fr" ? "Mots-clés (Tags)" : "Tags"}
              </label>

              {/* Tag Chips */}
              <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold border border-slate-200 transition"
                  >
                    <span>{t}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="text-slate-400 hover:text-red-600 cursor-pointer text-xs leading-none"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>

              {/* Tag Input */}
              <div className="relative">
                <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder={
                    language === "fr"
                      ? "Ajouter mot-clé (ex. Douanes, Fret)..."
                      : "Add tag (e.g. Customs, Montreal)..."
                  }
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-[#0B2545]"
                />
              </div>
              <p className="text-[10px] text-slate-400">
                {language === "fr"
                  ? "Appuyez sur Entrée ou virgule pour ajouter"
                  : "Press Enter or comma to add tag"}
              </p>
            </div>
          </div>

          {/* Card 2: Featured Image */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="font-bold text-[#0B2545] text-sm">
                {language === "fr" ? "Image à la Une" : "Featured Image"}
              </h3>

              {/* Toggle upload vs URL mode */}
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setImageUploadMode("upload")}
                  className={`px-2 py-0.5 rounded-md font-semibold transition cursor-pointer ${
                    imageUploadMode === "upload"
                      ? "bg-[#0B2545] text-white"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {language === "fr" ? "Téléverser" : "Upload"}
                </button>
                <button
                  type="button"
                  onClick={() => setImageUploadMode("url")}
                  className={`px-2 py-0.5 rounded-md font-semibold transition cursor-pointer ${
                    imageUploadMode === "url"
                      ? "bg-[#0B2545] text-white"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  URL
                </button>
              </div>
            </div>

            {imageError && (
              <div className="p-2.5 bg-red-50 text-red-700 text-[11px] rounded-lg border border-red-200">
                {imageError}
              </div>
            )}

            {/* Current Image Preview */}
            {featuredImage ? (
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden border border-slate-200 aspect-video bg-slate-100 group shadow-2xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={featuredImage}
                    alt="Featured preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFeaturedImage("");
                        setImageUrlInput("");
                      }}
                      className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{language === "fr" ? "Supprimer" : "Remove"}</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="truncate max-w-[200px]" title={featuredImage}>
                    {featuredImage}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setFeaturedImage("");
                      setImageUrlInput("");
                    }}
                    className="text-red-600 hover:underline cursor-pointer font-semibold"
                  >
                    {language === "fr" ? "Changer" : "Change"}
                  </button>
                </div>
              </div>
            ) : imageUploadMode === "upload" ? (
              /* Drag & Drop Upload Area */
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDropImage}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
                  isUploadingImage
                    ? "border-blue-400 bg-blue-50/50"
                    : "border-slate-300 hover:border-[#0B2545] hover:bg-slate-50/70"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                />

                {isUploadingImage ? (
                  <div className="flex flex-col items-center justify-center gap-2 text-slate-600 py-3">
                    <RefreshCw className="w-7 h-7 text-[#0B2545] animate-spin" />
                    <span className="text-xs font-semibold">
                      {language === "fr"
                        ? "Téléversement de l'image..."
                        : "Uploading image..."}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 text-slate-500 py-2">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                      <Upload className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {language === "fr"
                          ? "Glissez votre image ici, ou parcourez"
                          : "Drop an image here, or browse files"}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        PNG, JPG, WEBP, GIF (max. 10MB)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* URL Input Mode */
              <div className="space-y-2">
                <input
                  type="url"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-[#0B2545]"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (imageUrlInput.trim()) {
                      setFeaturedImage(imageUrlInput.trim());
                    }
                  }}
                  className="w-full py-1.5 bg-[#0B2545] hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  {language === "fr" ? "Définir l'URL de l'Image" : "Set Image URL"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

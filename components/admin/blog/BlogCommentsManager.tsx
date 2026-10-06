"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { BlogCommentItem, BlogPostItem } from "@/lib/blogTypes";
import {
  MessageSquare,
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
  Send,
  CornerDownRight,
  ShieldCheck,
  Calendar,
  ExternalLink,
  Eye,
  EyeOff,
  Filter,
  Clock,
  Quote,
  Sparkles,
  Mail,
  Copy,
  Check,
  X,
  FileText,
  ChevronDown,
} from "lucide-react";

interface BlogCommentsManagerProps {
  posts: BlogPostItem[];
  initialPostFilter?: string | null;
}

// Quick reply templates for Transimex Logistics Editorial
const REPLY_TEMPLATES = [
  {
    label: "General Logistics Support",
    labelFr: "Support Logistique Général",
    text: "Thank you for reading and reaching out! At Transimex Canada, our dedicated freight solutions team is committed to providing seamless supply chain visibility. If you would like tailored assistance for your routes, feel free to reach out to our dispatch desk directly.",
    textFr: "Merci pour votre lecture et votre message ! Chez Transimex Canada, notre équipe logistique s'engage à assurer une visibilité complète de votre chaîne d'approvisionnement. Pour une solution personnalisée sur vos corridors, n'hésitez pas à contacter nos équipes.",
  },
  {
    label: "Customs & Compliance",
    labelFr: "Douanes & Conformité",
    text: "Thank you for your question regarding customs regulations. Under current CBSA and cross-border standards, full documentation compliance is paramount. Our licensed customs brokerage specialists can review your freight classification anytime.",
    textFr: "Merci pour votre question concernant la réglementation douanière. Selon les normes de l'ASFC et les règles transfrontalières, la conformité documentaire est essentielle. Nos spécialistes en courtage douanier se tiennent à votre disposition.",
  },
  {
    label: "Reefer & Cold Chain",
    labelFr: "Chaîne du Froid & Fret Réfrigéré",
    text: "Thank you for your inquiry on temperature-controlled transport. Transimex Canada operates satellite-monitored multi-temp reefers equipped with continuous Protect From Freezing (PFF) safeguards across all Canadian winter corridors.",
    textFr: "Merci pour votre question sur le transport sous température dirigée. Transimex Canada opère des remorques multi-températures surveillées par satellite avec protection continue contre le gel sur tous les corridors hivernaux.",
  },
];

// Generate consistent gradient colors for author avatar
const AVATAR_GRADIENTS = [
  "from-[#0B2545] to-[#1e3a8a]",
  "from-[#d21f27] to-[#991b1b]",
  "from-[#0f766e] to-[#115e59]",
  "from-[#4338ca] to-[#3730a3]",
  "from-[#7c2d12] to-[#9a3412]",
  "from-[#334155] to-[#1e293b]",
];

function getAvatarGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[index];
}

export default function BlogCommentsManager({
  posts,
  initialPostFilter = null,
}: BlogCommentsManagerProps) {
  const { language } = useLanguage();
  const [comments, setComments] = useState<BlogCommentItem[]>([]);
  const [counts, setCounts] = useState({ all: 0, answered: 0, unanswered: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedPostSlug, setSelectedPostSlug] = useState<string>(
    initialPostFilter || "all"
  );
  const [filterType, setFilterType] = useState<
    "all" | "unanswered" | "answered" | "hidden"
  >("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  // Inline Replying state
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [customReplier, setCustomReplier] = useState("Transimex Logistics Editorial");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Copy feedback tracking
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Delete modal state
  const [commentToDelete, setCommentToDelete] = useState<BlogCommentItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Notification Toast
  const [toastMsg, setToastMsg] = useState<{
    type: "success" | "info" | "error";
    text: string;
  } | null>(null);

  const showToast = (text: string, type: "success" | "info" | "error" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3200);
  };

  const fetchComments = useCallback(async () => {
    try {
      setRefreshing(true);
      const params = new URLSearchParams();
      if (selectedPostSlug && selectedPostSlug !== "all") {
        params.append("slug", selectedPostSlug);
      }
      if (search.trim()) {
        params.append("q", search.trim());
      }

      const res = await fetch(`/api/admin/blog/comments?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.comments) {
        setComments(data.comments);
        if (data.counts) {
          setCounts(data.counts);
        }
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error("Error fetching comments:", err);
      showToast(
        language === "fr"
          ? "Erreur lors du chargement des commentaires"
          : "Error loading comments",
        "error"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedPostSlug, search, language]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Submit Admin Reply
  const handleSendReply = async (commentId: string) => {
    if (!replyText.trim()) return;

    try {
      setIsSubmittingReply(true);
      const res = await fetch(
        `/api/admin/blog/comments/${encodeURIComponent(commentId)}/reply`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reply: replyText.trim(),
            repliedBy: customReplier.trim() || "Transimex Logistics Editorial",
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit reply");

      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? {
                ...c,
                adminReply: data.comment.adminReply,
                status: "Approved",
              }
            : c
        )
      );

      setActiveReplyId(null);
      setReplyText("");
      showToast(
        language === "fr"
          ? "Réponse officielle publiée avec succès !"
          : "Official response published successfully!"
      );
      fetchComments();
    } catch (err: any) {
      alert(err.message || "Failed to post response");
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // Toggle Comment Status (Approved / Hidden)
  const handleToggleStatus = async (comment: BlogCommentItem) => {
    const newStatus = comment.status === "Approved" ? "Hidden" : "Approved";
    try {
      const res = await fetch(
        `/api/admin/blog/comments/${encodeURIComponent(comment.id)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update comment");

      setComments((prev) =>
        prev.map((c) => (c.id === comment.id ? { ...c, status: newStatus } : c))
      );
      showToast(
        newStatus === "Approved"
          ? language === "fr"
            ? "Commentaire approuvé et visible en ligne"
            : "Comment approved and visible publicly"
          : language === "fr"
          ? "Commentaire masqué du site public"
          : "Comment hidden from public website",
        "info"
      );
    } catch (err: any) {
      alert(err.message || "Failed to update status");
    }
  };

  // Delete Comment Confirmed
  const handleConfirmDelete = async () => {
    if (!commentToDelete) return;

    try {
      setIsDeleting(true);
      const res = await fetch(
        `/api/admin/blog/comments/${encodeURIComponent(commentToDelete.id)}`,
        {
          method: "DELETE",
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete comment");

      setComments((prev) => prev.filter((c) => c.id !== commentToDelete.id));
      showToast(
        language === "fr"
          ? "Commentaire supprimé définitivement."
          : "Comment permanently deleted.",
        "info"
      );
      setCommentToDelete(null);
      fetchComments();
    } catch (err: any) {
      alert(err.message || "Failed to delete comment");
    } finally {
      setIsDeleting(false);
    }
  };

  // Copy comment text
  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter & Sort comments
  const filteredComments = useMemo(() => {
    let result = comments.filter((c) => {
      if (filterType === "answered" && !c.adminReply?.content) return false;
      if (filterType === "unanswered" && c.adminReply?.content) return false;
      if (filterType === "hidden" && c.status !== "Hidden") return false;
      return true;
    });

    if (sortOrder === "oldest") {
      result = [...result].reverse();
    }

    return result;
  }, [comments, filterType, sortOrder]);

  const hiddenCount = useMemo(
    () => comments.filter((c) => c.status === "Hidden").length,
    [comments]
  );

  const answeredRate = useMemo(() => {
    if (counts.all === 0) return 100;
    return Math.round((counts.answered / counts.all) * 100);
  }, [counts]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* FLOATING TOAST NOTIFICATION */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-[#0B2545] text-white rounded-2xl shadow-xl border border-slate-700/50 animate-in slide-in-from-bottom-3 duration-200">
          {toastMsg.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : toastMsg.type === "error" ? (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
          )}
          <span className="text-xs font-semibold">{toastMsg.text}</span>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            className="ml-2 text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. EXECUTIVE KPI METRICS BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Comments Card */}
        <div className="relative overflow-hidden bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider uppercase text-slate-500">
              {language === "fr" ? "Total Commentaires" : "Total Reader Inquiries"}
            </span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-[#0B2545]">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#0B2545] tracking-tight">
              {counts.all}
            </span>
            <span className="text-xs font-semibold text-slate-400">
              {language === "fr" ? "Reçus" : "Discussions"}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>
              {language === "fr"
                ? "Sur les articles actifs du blog"
                : "Across all published blog articles"}
            </span>
          </div>
        </div>

        {/* Action Needed: Pending Replies Card */}
        <div
          className={`relative overflow-hidden rounded-2xl p-5 border transition ${
            counts.unanswered > 0
              ? "bg-amber-50/70 border-amber-300 shadow-2xs"
              : "bg-white border-slate-200/90 shadow-2xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[10px] font-bold tracking-wider uppercase ${
                counts.unanswered > 0 ? "text-amber-800" : "text-slate-500"
              }`}
            >
              {language === "fr"
                ? "En Attente de Réponse"
                : "Awaiting Official Reply"}
            </span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                counts.unanswered > 0
                  ? "bg-amber-200/80 text-amber-900"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={`text-3xl font-extrabold tracking-tight ${
                counts.unanswered > 0 ? "text-amber-900" : "text-slate-700"
              }`}
            >
              {counts.unanswered}
            </span>
            {counts.unanswered > 0 ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                {language === "fr" ? "Action requise" : "Action Needed"}
              </span>
            ) : (
              <span className="text-xs font-semibold text-emerald-600">
                {language === "fr" ? "À jour" : "All Caught Up"}
              </span>
            )}
          </div>
          <div className="mt-2 text-[11px] text-slate-600">
            {language === "fr"
              ? "Questions des lecteurs sans réponse"
              : "Reader questions needing team answer"}
          </div>
        </div>

        {/* Answered / Verified Responses Card */}
        <div className="relative overflow-hidden bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-800">
              {language === "fr"
                ? "Réponses Publiées"
                : "Answered by Editorial"}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-[#d21f27]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#0B2545] tracking-tight">
              {counts.answered}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
              {answeredRate}% {language === "fr" ? "répondus" : "rate"}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>
              {language === "fr"
                ? "Réponses officielles vérifiées"
                : "Transimex verified team replies"}
            </span>
          </div>
        </div>

        {/* Public Visibility / Moderation Status */}
        <div className="relative overflow-hidden bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider uppercase text-slate-500">
              {language === "fr" ? "Statut de Visibilité" : "Public Visibility"}
            </span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-[#0B2545]">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#0B2545] tracking-tight">
              {counts.all - hiddenCount}
            </span>
            <span className="text-xs font-semibold text-emerald-600">
              {language === "fr" ? "En ligne" : "Live Active"}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
            <span>
              {hiddenCount}{" "}
              {language === "fr" ? "masqués du public" : "hidden / moderated"}
            </span>
            {lastUpdated && (
              <span className="text-[10px] text-slate-400">
                {lastUpdated.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. REFINED FILTER, SEARCH & CONTROL TOOLBAR */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Segmented Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setFilterType("all")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
                filterType === "all"
                  ? "bg-[#0B2545] text-white shadow-xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <span>{language === "fr" ? "Tous" : "All Comments"}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  filterType === "all"
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {counts.all}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterType("unanswered")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
                filterType === "unanswered"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-white text-amber-800 border border-amber-200 hover:bg-amber-50"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{language === "fr" ? "Sans Réponse" : "Needs Reply"}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  filterType === "unanswered"
                    ? "bg-white/20 text-white"
                    : "bg-amber-100 text-amber-900"
                }`}
              >
                {counts.unanswered}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterType("answered")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
                filterType === "answered"
                  ? "bg-emerald-700 text-white shadow-xs"
                  : "bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#d21f27]" />
              <span>{language === "fr" ? "Répondus" : "Answered"}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  filterType === "answered"
                    ? "bg-white/20 text-white"
                    : "bg-emerald-100 text-emerald-900"
                }`}
              >
                {counts.answered}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterType("hidden")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
                filterType === "hidden"
                  ? "bg-slate-700 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>{language === "fr" ? "Masqués" : "Hidden"}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  filterType === "hidden"
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {hiddenCount}
              </span>
            </button>
          </div>

          {/* Quick Refresh & Post Filter */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchComments}
              disabled={refreshing}
              className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition cursor-pointer flex items-center gap-1.5"
              title="Refresh comments from database"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-slate-500 ${
                  refreshing ? "animate-spin" : ""
                }`}
              />
              <span className="hidden sm:inline">
                {language === "fr" ? "Actualiser" : "Refresh"}
              </span>
            </button>
          </div>
        </div>

        {/* Secondary Filter Line: Target Article, Search Box, Sort */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Post Filter Dropdown */}
          <div className="flex items-center gap-2 max-w-md w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 hidden sm:block" />
            <select
              value={selectedPostSlug}
              onChange={(e) => setSelectedPostSlug(e.target.value)}
              className="w-full sm:w-72 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-[#0B2545] focus:bg-white transition cursor-pointer"
            >
              <option value="all">
                {language === "fr"
                  ? "📂 Tous les articles du blog"
                  : "📂 All Blog Articles"}
              </option>
              {posts.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.title?.en || p.slug}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Input with Clear Button */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder={
                  language === "fr"
                    ? "Rechercher auteur, email, texte..."
                    : "Search author, email, message..."
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#0B2545] focus:bg-white rounded-xl pl-8 pr-8 py-2 text-xs text-slate-800 outline-none transition"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort Toggle */}
            <select
              value={sortOrder}
              onChange={(e) =>
                setSortOrder(e.target.value as "newest" | "oldest")
              }
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-[#0B2545] cursor-pointer"
            >
              <option value="newest">
                {language === "fr" ? "Plus récents" : "Newest first"}
              </option>
              <option value="oldest">
                {language === "fr" ? "Plus anciens" : "Oldest first"}
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. COMMENTS LIST FEED */}
      {loading ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-[#0B2545]">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">
              {language === "fr"
                ? "Synchronisation des commentaires..."
                : "Synchronizing reader comments..."}
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              {language === "fr"
                ? "Récupération des discussions et réponses éditoriales."
                : "Retrieving reader inquiries and verified editorial replies from database."}
            </p>
          </div>
        </div>
      ) : filteredComments.length === 0 ? (
        /* EMPTY STATE */
        <div className="p-16 text-center bg-white rounded-2xl border border-dashed border-slate-300 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <MessageSquare className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto">
            <h4 className="text-base font-bold text-[#0B2545]">
              {language === "fr"
                ? "Aucun commentaire ne correspond à votre sélection"
                : "No Comments Found Matching Filter"}
            </h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {search || selectedPostSlug !== "all" || filterType !== "all"
                ? language === "fr"
                  ? "Essayez d'ajuster votre recherche ou de réinitialiser vos critères de filtrage."
                  : "Try clearing your search terms or resetting the status and article filters."
                : language === "fr"
                ? "Les lecteurs peuvent poster des questions sur n'importe quel article de blog dont les commentaires sont activés."
                : "Readers can post questions directly on any published blog article where comments are enabled."}
            </p>
          </div>
          {(search || selectedPostSlug !== "all" || filterType !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setSelectedPostSlug("all");
                setFilterType("all");
              }}
              className="px-4 py-2 bg-[#0B2545] hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
            >
              {language === "fr"
                ? "Réinitialiser tous les filtres"
                : "Reset All Filters"}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              {language === "fr" ? "Affichage de" : "Showing"}{" "}
              <strong className="text-[#0B2545]">
                {filteredComments.length}
              </strong>{" "}
              {filteredComments.length === 1
                ? language === "fr"
                  ? "commentaire"
                  : "comment"
                : language === "fr"
                ? "commentaires"
                : "comments"}
            </span>
            {filterType === "unanswered" && counts.unanswered > 0 && (
              <span className="text-amber-700 font-semibold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>
                  {counts.unanswered}{" "}
                  {language === "fr"
                    ? "nécessitent une réponse"
                    : "requiring official response"}
                </span>
              </span>
            )}
          </div>

          {filteredComments.map((c) => {
            const hasReply = Boolean(c.adminReply?.content);
            const isReplying = activeReplyId === c.id;
            const isPendingReply = !hasReply;

            return (
              <div
                key={c.id}
                className={`bg-white rounded-2xl border transition-all duration-150 p-5 space-y-4 shadow-2xs hover:shadow-xs ${
                  c.status === "Hidden"
                    ? "border-slate-200/80 bg-slate-50/40 opacity-75"
                    : isPendingReply
                    ? "border-slate-200 border-l-4 border-l-amber-500"
                    : "border-slate-200 border-l-4 border-l-emerald-600"
                }`}
              >
                {/* 1. CARD HEADER: AUTHOR PROFILE & ARTICLE CONTEXT */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                  {/* Left: Author identity */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${getAvatarGradient(
                        c.authorName
                      )} flex items-center justify-center text-white font-black text-xs uppercase shadow-xs shrink-0`}
                    >
                      {c.authorName.slice(0, 2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[#0B2545] text-sm">
                          {c.authorName}
                        </span>
                        {c.authorEmail && (
                          <a
                            href={`mailto:${c.authorEmail}`}
                            className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500 hover:text-[#0B2545] bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-lg transition"
                            title={`Email ${c.authorEmail}`}
                          >
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{c.authorEmail}</span>
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{c.createdAt}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Article tag & Status badges */}
                  <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
                    {/* Article Badge with External Link */}
                    <a
                      href={`https://transimex-canada.com/blog/${c.postSlug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-slate-700 hover:text-[#0B2545] text-[11px] font-medium transition"
                      title={
                        language === "fr"
                          ? "Voir l'article de blog sur le site"
                          : "View article on live website"
                      }
                    >
                      <FileText className="w-3.5 h-3.5 text-[#d21f27]" />
                      <span className="max-w-[170px] truncate font-semibold text-[#0B2545]">
                        {c.postTitle?.en || c.postSlug}
                      </span>
                      <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-[#0B2545]" />
                    </a>

                    {/* Status Pill */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider ${
                        c.status === "Approved"
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                    >
                      {c.status === "Approved" ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>
                            {language === "fr" ? "En Ligne" : "Approved"}
                          </span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3 h-3 text-slate-400" />
                          <span>
                            {language === "fr" ? "Masqué" : "Hidden"}
                          </span>
                        </>
                      )}
                    </span>

                    {/* Needs reply alert badge */}
                    {isPendingReply && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-bold">
                        <Clock className="w-3 h-3 text-amber-700" />
                        <span>
                          {language === "fr" ? "Sans Réponse" : "Unanswered"}
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. READER'S COMMENT BODY */}
                <div className="relative bg-slate-50/80 border border-slate-100 rounded-xl p-4">
                  <Quote className="w-5 h-5 text-slate-300 absolute top-3 right-3 pointer-events-none" />
                  <p className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap pr-6 font-normal">
                    {c.content}
                  </p>
                </div>

                {/* 3. OFFICIAL EDITORIAL RESPONSE BLOCK (IF ALREADY ANSWERED) */}
                {hasReply && (
                  <div className="ml-3 sm:ml-8 p-4 bg-[#0B2545]/[0.03] border-l-4 border-[#0B2545] rounded-r-2xl border-y border-r border-slate-200/60 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-[#0B2545] flex items-center justify-center">
                          <ShieldCheck className="w-3.5 h-3.5 text-[#d21f27]" />
                        </div>
                        <span className="text-[11px] font-extrabold text-[#0B2545] uppercase tracking-wider">
                          {c.adminReply?.repliedBy ||
                            "Transimex Logistics Editorial"}
                        </span>
                        <span className="px-2 py-0.2 rounded-full bg-blue-100 text-[#0B2545] text-[10px] font-bold">
                          {language === "fr"
                            ? "Réponse Vérifiée"
                            : "Verified Official"}
                        </span>
                      </div>
                      {c.adminReply?.repliedAt && (
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{c.adminReply.repliedAt}</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap pl-1">
                      {c.adminReply?.content}
                    </p>
                  </div>
                )}

                {/* 4. INLINE EDITORIAL REPLY COMPOSER DRAWER */}
                {isReplying && (
                  <div className="ml-2 sm:ml-8 p-4 bg-slate-50 border-2 border-[#0B2545]/20 rounded-2xl space-y-3.5 animate-in fade-in duration-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#0B2545]">
                        <div className="w-5 h-5 rounded-md bg-[#0B2545] flex items-center justify-center">
                          <CornerDownRight className="w-3.5 h-3.5 text-[#d21f27]" />
                        </div>
                        <span>
                          {language === "fr"
                            ? "Rédiger la réponse officielle de Transimex Canada :"
                            : "Drafting Official Response as Transimex Logistics Editorial:"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <span>{replyText.length} chars</span>
                      </div>
                    </div>

                    {/* Quick Response Templates Chips */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <Sparkles className="w-3 h-3 text-[#d21f27]" />
                        <span>
                          {language === "fr"
                            ? "Modèles de réponse rapide :"
                            : "Quick logistics templates:"}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {REPLY_TEMPLATES.map((tmpl, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              const snippet =
                                language === "fr" ? tmpl.textFr : tmpl.text;
                              setReplyText((prev) =>
                                prev ? `${prev}\n\n${snippet}` : snippet
                              );
                            }}
                            className="px-2.5 py-1 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg text-[11px] font-semibold text-slate-700 hover:text-[#0B2545] transition cursor-pointer flex items-center gap-1"
                          >
                            <span>+</span>
                            <span>
                              {language === "fr" ? tmpl.labelFr : tmpl.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Responder Name Field */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-slate-500 shrink-0">
                        {language === "fr" ? "Signataire :" : "Signed By:"}
                      </span>
                      <input
                        type="text"
                        value={customReplier}
                        onChange={(e) => setCustomReplier(e.target.value)}
                        placeholder="Transimex Logistics Editorial"
                        className="bg-white border border-slate-200 focus:border-[#0B2545] rounded-lg px-2.5 py-1 text-xs text-slate-800 outline-none w-64"
                      />
                    </div>

                    {/* Reply Textarea */}
                    <textarea
                      rows={4}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={
                        language === "fr"
                          ? "Merci pour votre question ! Chez Transimex Canada, nos équipes de courtage et de transport..."
                          : "Thank you for reaching out! At Transimex Canada, our dedicated freight solutions team..."
                      }
                      className="w-full p-3.5 bg-white border border-slate-200 focus:border-[#0B2545] focus:ring-2 focus:ring-[#0B2545]/10 rounded-xl text-xs sm:text-sm text-slate-800 outline-none transition resize-y"
                    />

                    {/* Action buttons */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveReplyId(null);
                          setReplyText("");
                        }}
                        className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-semibold transition cursor-pointer"
                      >
                        {language === "fr" ? "Annuler" : "Cancel"}
                      </button>

                      <button
                        type="button"
                        disabled={isSubmittingReply || !replyText.trim()}
                        onClick={() => handleSendReply(c.id)}
                        className="px-5 py-2 bg-[#0B2545] hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
                      >
                        {isSubmittingReply ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5 text-[#d21f27]" />
                        )}
                        <span>
                          {hasReply
                            ? language === "fr"
                              ? "Mettre à jour la Réponse"
                              : "Update Official Response"
                            : language === "fr"
                            ? "Publier la Réponse Officielle"
                            : "Publish Official Response"}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 5. CARD ACTION TOOLBAR */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Primary Reply Button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (isReplying) {
                          setActiveReplyId(null);
                          setReplyText("");
                        } else {
                          setActiveReplyId(c.id);
                          setReplyText(c.adminReply?.content || "");
                          setCustomReplier(
                            c.adminReply?.repliedBy ||
                              "Transimex Logistics Editorial"
                          );
                        }
                      }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                        isReplying
                          ? "bg-slate-200 text-slate-700"
                          : hasReply
                          ? "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                          : "bg-[#0B2545] hover:bg-slate-800 text-white"
                      }`}
                    >
                      <CornerDownRight
                        className={`w-3.5 h-3.5 ${
                          hasReply ? "text-slate-500" : "text-[#d21f27]"
                        }`}
                      />
                      <span>
                        {hasReply
                          ? language === "fr"
                            ? "Modifier la Réponse"
                            : "Edit Response"
                          : language === "fr"
                          ? "Répondre au Lecteur"
                          : "Reply to Reader"}
                      </span>
                    </button>

                    {/* Status Visibility Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(c)}
                      className={`px-3 py-1.5 border rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                        c.status === "Approved"
                          ? "border-slate-200 text-slate-600 hover:bg-slate-50"
                          : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                      }`}
                      title={
                        c.status === "Approved"
                          ? language === "fr"
                            ? "Masquer ce commentaire du site public"
                            : "Hide this comment from the public website"
                          : language === "fr"
                            ? "Approuver et afficher ce commentaire en ligne"
                            : "Approve and show this comment online"
                      }
                    >
                      {c.status === "Approved" ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                          <span>{language === "fr" ? "Masquer" : "Hide"}</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5 text-emerald-700" />
                          <span>
                            {language === "fr"
                              ? "Rendre Public"
                              : "Make Public"}
                          </span>
                        </>
                      )}
                    </button>

                    {/* Copy text button */}
                    <button
                      type="button"
                      onClick={() => handleCopyText(c.id, c.content)}
                      className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                      title={
                        language === "fr"
                          ? "Copier le texte du commentaire"
                          : "Copy comment text"
                      }
                    >
                      {copiedId === c.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-[11px] text-emerald-600">
                            {language === "fr" ? "Copié !" : "Copied!"}
                          </span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-400" />
                          <span className="hidden sm:inline text-[11px]">
                            {language === "fr" ? "Copier" : "Copy"}
                          </span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => setCommentToDelete(c)}
                    className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                    title={
                      language === "fr"
                        ? "Supprimer ce commentaire"
                        : "Delete this comment"
                    }
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. CONFIRM DELETE MODAL */}
      {commentToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {language === "fr"
                    ? "Supprimer définitivement le commentaire ?"
                    : "Permanently Delete Comment?"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {language === "fr"
                    ? "Cette action est irréversible."
                    : "This action cannot be undone."}
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
              <div className="font-bold text-[#0B2545]">
                {commentToDelete.authorName} ({commentToDelete.authorEmail})
              </div>
              <p className="line-clamp-2 text-slate-600 italic">
                &ldquo;{commentToDelete.content}&rdquo;
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setCommentToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition cursor-pointer"
              >
                {language === "fr" ? "Annuler" : "Cancel"}
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                {isDeleting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>
                  {language === "fr"
                    ? "Confirmer la Suppression"
                    : "Confirm Delete"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

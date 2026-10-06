"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  User,
  Calendar,
  ExternalLink,
  Eye,
  EyeOff,
  Filter,
} from "lucide-react";

interface BlogCommentsManagerProps {
  posts: BlogPostItem[];
  initialPostFilter?: string | null;
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

  // Filters
  const [search, setSearch] = useState("");
  const [selectedPostSlug, setSelectedPostSlug] = useState<string>(
    initialPostFilter || "all"
  );
  const [filterType, setFilterType] = useState<"all" | "answered" | "unanswered">("all");

  // Replying state: mapping commentId -> reply text
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Notification Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);

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
      }
    } catch (err) {
      console.error("Error fetching comments:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedPostSlug, search]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Submit Admin Reply
  const handleSendReply = async (commentId: string) => {
    if (!replyText.trim()) return;

    try {
      setIsSubmittingReply(true);
      const res = await fetch(`/api/admin/blog/comments/${encodeURIComponent(commentId)}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reply: replyText.trim(),
          repliedBy: "Transimex Logistics Editorial",
        }),
      });

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
      setToastMsg(
        language === "fr"
          ? "Réponse officielle envoyée avec succès !"
          : "Official response posted successfully!"
      );
      setTimeout(() => setToastMsg(null), 3000);
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
      const res = await fetch(`/api/admin/blog/comments/${encodeURIComponent(comment.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update comment");

      setComments((prev) =>
        prev.map((c) => (c.id === comment.id ? { ...c, status: newStatus } : c))
      );
      setToastMsg(
        language === "fr"
          ? `Statut du commentaire mis à jour: ${newStatus}`
          : `Comment status updated: ${newStatus}`
      );
      setTimeout(() => setToastMsg(null), 2500);
    } catch (err: any) {
      alert(err.message || "Failed to update status");
    }
  };

  // Delete Comment
  const handleDeleteComment = async (commentId: string) => {
    const confirmMsg =
      language === "fr"
        ? "Êtes-vous sûr de vouloir supprimer définitivement ce commentaire ?"
        : "Are you sure you want to permanently delete this comment?";

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/admin/blog/comments/${encodeURIComponent(commentId)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete comment");

      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setToastMsg(
        language === "fr" ? "Commentaire supprimé." : "Comment deleted."
      );
      setTimeout(() => setToastMsg(null), 2500);
      fetchComments();
    } catch (err: any) {
      alert(err.message || "Failed to delete comment");
    }
  };

  // Filtered comments
  const filteredComments = comments.filter((c) => {
    if (filterType === "answered" && !c.adminReply?.content) return false;
    if (filterType === "unanswered" && c.adminReply?.content) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="p-3.5 bg-[#0B2545] text-white rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* KPI METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            {language === "fr" ? "Total Commentaires" : "Total Reader Comments"}
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#0B2545]">{counts.all}</span>
            <span className="text-xs font-semibold text-slate-400">
              {language === "fr" ? "Reçus" : "Received"}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {language === "fr" ? "Sur tous les articles de blog" : "Across all published articles"}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
            {language === "fr" ? "En Attente de Réponse" : "Pending Editorial Response"}
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-amber-700">{counts.unanswered}</span>
            <span className="text-xs font-semibold text-amber-600">
              {language === "fr" ? "À traiter" : "Requires Reply"}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {language === "fr" ? "Questions des lecteurs sans réponse" : "Questions awaiting answer"}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
            {language === "fr" ? "Réponses Éditées" : "Answered by Transimex"}
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-800">{counts.answered}</span>
            <span className="text-xs font-semibold text-emerald-700">
              {language === "fr" ? "Répondus" : "Answered"}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {language === "fr" ? "Réponses officielles publiées" : "Official verified responses"}
          </p>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Quick Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setFilterType("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filterType === "all"
                ? "bg-[#0B2545] text-white shadow-xs"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            {language === "fr" ? "Tous" : "All Comments"} ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("unanswered")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filterType === "unanswered"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-white text-amber-700 border border-amber-200 hover:bg-amber-50"
            }`}
          >
            {language === "fr" ? "Sans Réponse" : "Needs Reply"} ({counts.unanswered})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("answered")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filterType === "answered"
                ? "bg-emerald-700 text-white shadow-xs"
                : "bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50"
            }`}
          >
            {language === "fr" ? "Répondus" : "Answered"} ({counts.answered})
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Post Filter Dropdown */}
          <select
            value={selectedPostSlug}
            onChange={(e) => setSelectedPostSlug(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-[#0B2545] max-w-xs"
          >
            <option value="all">
              {language === "fr" ? "Tous les articles" : "All Articles"}
            </option>
            {posts.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.title?.en}
              </option>
            ))}
          </select>

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder={
                language === "fr"
                  ? "Rechercher auteur, email, message..."
                  : "Search author, email, message..."
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-56 bg-slate-50 border border-slate-200 focus:border-[#0B2545] focus:bg-white rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 outline-none transition"
            />
          </div>

          <button
            type="button"
            onClick={fetchComments}
            className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 transition cursor-pointer self-end sm:self-auto"
            title="Refresh"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* COMMENTS LIST */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin text-[#0B2545] mx-auto mb-2" />
          <p className="text-xs text-slate-500">
            {language === "fr"
              ? "Chargement des commentaires..."
              : "Loading reader comments..."}
          </p>
        </div>
      ) : filteredComments.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
          <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
          <h4 className="text-sm font-bold text-slate-700">
            {language === "fr" ? "Aucun commentaire trouvé" : "No Comments Found"}
          </h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {language === "fr"
              ? "Aucun commentaire de lecteur ne correspond aux critères de filtre sélectionnés."
              : "No reader comments match your current filter settings."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredComments.map((c) => {
            const hasReply = Boolean(c.adminReply?.content);
            const isReplying = activeReplyId === c.id;

            return (
              <div
                key={c.id}
                className={`bg-white rounded-2xl border transition-shadow p-5 space-y-4 shadow-2xs ${
                  c.status === "Hidden"
                    ? "border-slate-200 bg-slate-50/50 opacity-70"
                    : "border-slate-200/90 hover:border-slate-300"
                }`}
              >
                {/* Header: Reader Info & Article Tag */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs uppercase flex-shrink-0">
                      {c.authorName.slice(0, 2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#0B2545] text-xs">
                          {c.authorName}
                        </span>
                        {c.authorEmail && (
                          <span className="text-[11px] text-slate-400 font-mono">
                            &lt;{c.authorEmail}&gt;
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{c.createdAt}</span>
                      </span>
                    </div>
                  </div>

                  {/* Article Link & Status Badge */}
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium border border-slate-200 flex items-center gap-1">
                      <span>Article:</span>
                      <strong className="text-[#0B2545]">
                        {c.postTitle?.en || c.postSlug}
                      </strong>
                    </span>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        c.status === "Approved"
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>
                </div>

                {/* Reader Comment Message */}
                <div className="p-3.5 bg-slate-50/70 border border-slate-100 rounded-xl text-xs text-slate-800 leading-relaxed">
                  <p className="whitespace-pre-wrap">{c.content}</p>
                </div>

                {/* Admin Official Response Display */}
                {hasReply && (
                  <div className="ml-4 sm:ml-8 p-3.5 bg-blue-50/40 border-l-4 border-[#0B2545] rounded-r-xl space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-[#d21f27]" />
                        <span className="text-[11px] font-bold text-[#0B2545] uppercase tracking-wider">
                          {c.adminReply?.repliedBy || "Transimex Logistics Editorial"}
                        </span>
                      </div>
                      {c.adminReply?.repliedAt && (
                        <span className="text-[10px] text-slate-400">
                          {c.adminReply.repliedAt}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap pl-1">
                      {c.adminReply?.content}
                    </p>
                  </div>
                )}

                {/* Interactive Reply Input Box */}
                {isReplying && (
                  <div className="ml-4 sm:ml-8 p-3.5 bg-slate-50 border border-blue-200 rounded-xl space-y-2.5 animate-in fade-in">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#0B2545]">
                      <CornerDownRight className="w-4 h-4 text-[#d21f27]" />
                      <span>
                        {language === "fr"
                          ? "Rédiger la réponse officielle de Transimex :"
                          : "Write official response from Transimex Logistics:"}
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={
                        language === "fr"
                          ? "Merci pour votre question ! Chez Transimex Canada..."
                          : "Thank you for reaching out! At Transimex Canada..."
                      }
                      className="w-full p-3 bg-white border border-slate-200 focus:border-[#0B2545] rounded-xl text-xs text-slate-800 outline-none transition resize-y"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveReplyId(null);
                          setReplyText("");
                        }}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-100 transition cursor-pointer"
                      >
                        {language === "fr" ? "Annuler" : "Cancel"}
                      </button>
                      <button
                        type="button"
                        disabled={isSubmittingReply || !replyText.trim()}
                        onClick={() => handleSendReply(c.id)}
                        className="px-4 py-1.5 bg-[#0B2545] hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {isSubmittingReply ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5 text-[#d21f27]" />
                        )}
                        <span>
                          {language === "fr" ? "Publier la Réponse" : "Post Response"}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Bottom Actions */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (isReplying) {
                          setActiveReplyId(null);
                          setReplyText("");
                        } else {
                          setActiveReplyId(c.id);
                          setReplyText(c.adminReply?.content || "");
                        }
                      }}
                      className="px-3 py-1.5 bg-[#0B2545] hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-2xs transition cursor-pointer flex items-center gap-1.5"
                    >
                      <CornerDownRight className="w-3.5 h-3.5 text-[#d21f27]" />
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

                    <button
                      type="button"
                      onClick={() => handleToggleStatus(c)}
                      className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                      title={
                        c.status === "Approved"
                          ? language === "fr"
                            ? "Masquer le commentaire"
                            : "Hide comment"
                          : language === "fr"
                          ? "Approuver le commentaire"
                          : "Approve comment"
                      }
                    >
                      {c.status === "Approved" ? (
                        <>
                          <EyeOff className="w-3 h-3 text-slate-500" />
                          <span className="hidden sm:inline">
                            {language === "fr" ? "Masquer" : "Hide"}
                          </span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3 h-3 text-emerald-600" />
                          <span className="hidden sm:inline">
                            {language === "fr" ? "Afficher" : "Show"}
                          </span>
                        </>
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteComment(c.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                    title={language === "fr" ? "Supprimer le commentaire" : "Delete comment"}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

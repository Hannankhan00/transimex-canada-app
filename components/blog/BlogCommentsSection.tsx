"use client";

import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Send,
  ShieldCheck,
  Calendar,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Lock,
} from "lucide-react";

interface BlogCommentsSectionProps {
  postSlug: string;
  lang?: "en" | "fr";
}

interface CommentData {
  id: string;
  authorName: string;
  content: string;
  adminReply?: {
    content: string;
    repliedBy: string;
    repliedAt: string;
  } | null;
  createdAt: string;
}

export default function BlogCommentsSection({
  postSlug,
  lang = "en",
}: BlogCommentsSectionProps) {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [allowComments, setAllowComments] = useState(true);
  const [loading, setLoading] = useState(true);

  // Form State
  const [authorName, setAuthorName] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/blog/${encodeURIComponent(postSlug)}/comments`);
      const data = await res.json();
      if (res.ok) {
        setComments(data.comments || []);
        setAllowComments(data.allowComments !== false);
      }
    } catch (err) {
      console.error("Error loading blog comments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (postSlug) {
      fetchComments();
    }
  }, [postSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!authorName.trim() || !content.trim()) {
      setErrorMsg(
        lang === "fr"
          ? "Veuillez fournir votre nom et un message de commentaire."
          : "Please provide your name and a comment message."
      );
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/blog/${encodeURIComponent(postSlug)}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorName: authorName.trim(),
          authorEmail: authorEmail.trim(),
          content: content.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to post comment");

      setAuthorName("");
      setAuthorEmail("");
      setContent("");
      setSuccessMsg(
        lang === "fr"
          ? "Votre commentaire a été publié avec succès !"
          : "Your comment has been published successfully!"
      );
      fetchComments();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit comment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-12 pt-8 border-t border-slate-200 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-[#d21f27]" />
          <h3 className="text-xl font-bold text-[#0B2545]">
            {lang === "fr" ? "Commentaires des Lecteurs" : "Reader Comments"} ({comments.length})
          </h3>
        </div>
      </div>

      {/* Comment Submission Form (only shown if allowComments is true) */}
      {allowComments ? (
        <form
          onSubmit={handleSubmit}
          className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4 shadow-2xs"
        >
          <h4 className="font-bold text-sm text-[#0B2545]">
            {lang === "fr" ? "Laisser un commentaire" : "Leave a Comment"}
          </h4>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                {lang === "fr" ? "Votre Nom" : "Your Name"} *
              </label>
              <input
                type="text"
                required
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder={lang === "fr" ? "ex. Marc Dupont" : "e.g. John Doe"}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-[#0B2545]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                {lang === "fr" ? "Votre Courriel (optionnel)" : "Your Email (optional)"}
              </label>
              <input
                type="email"
                value={authorEmail}
                onChange={(e) => setAuthorEmail(e.target.value)}
                placeholder="john@example.com"
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-[#0B2545]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              {lang === "fr" ? "Votre Commentaire" : "Your Comment"} *
            </label>
            <textarea
              rows={3}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                lang === "fr"
                  ? "Partagez votre avis ou posez une question sur cet article..."
                  : "Share your thoughts or ask a question regarding this article..."
              }
              className="w-full p-3.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-[#0B2545] resize-y"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-[#0B2545] hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5 text-[#d21f27]" />
              )}
              <span>{lang === "fr" ? "Publier le commentaire" : "Post Comment"}</span>
            </button>
          </div>
        </form>
      ) : (
        /* Disabled Notice */
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3 text-slate-600 text-xs">
          <Lock className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <span>
            {lang === "fr"
              ? "Les commentaires sont actuellement fermés pour cet article."
              : "Commenting is currently closed for this article."}
          </span>
        </div>
      )}

      {/* Comments Feed */}
      {loading ? (
        <div className="py-8 text-center text-slate-400 text-xs">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#0B2545]" />
          <span>{lang === "fr" ? "Chargement des commentaires..." : "Loading comments..."}</span>
        </div>
      ) : comments.length === 0 ? (
        <p className="text-center py-6 text-slate-400 text-xs italic">
          {lang === "fr"
            ? "Aucun commentaire pour le moment. Soyez le premier à commenter !"
            : "No comments yet. Be the first to share your thoughts!"}
        </p>
      ) : (
        <div className="space-y-4">
          {comments.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-2xs"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center uppercase">
                    {c.authorName.slice(0, 2)}
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-[#0B2545]">{c.authorName}</h5>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{c.createdAt}</span>
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                {c.content}
              </p>

              {/* Official Admin Response */}
              {c.adminReply && (
                <div className="ml-4 sm:ml-6 mt-3 p-3.5 bg-blue-50/50 border-l-4 border-[#0B2545] rounded-r-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#d21f27]" />
                      <span className="text-[11px] font-bold text-[#0B2545]">
                        {c.adminReply.repliedBy || "Transimex Logistics Editorial"}
                      </span>
                    </div>
                    {c.adminReply.repliedAt && (
                      <span className="text-[10px] text-slate-400">
                        {c.adminReply.repliedAt}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap pl-1">
                    {c.adminReply.content}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

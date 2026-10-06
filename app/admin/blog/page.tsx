"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { BlogPostItem } from "@/lib/blogTypes";
import BlogFullPageEditor from "@/components/admin/blog/BlogFullPageEditor";
import BlogCommentsManager from "@/components/admin/blog/BlogCommentsManager";
import PermissionGuard from "@/components/admin/PermissionGuard";
import {
  Plus,
  Search,
  CheckCircle2,
  RefreshCw,
  Edit2,
  Trash2,
  Image as ImageIcon,
  MessageSquare,
  FileText,
} from "lucide-react";

export default function AdminBlogPage() {
  const { language } = useLanguage();
  const [posts, setPosts] = useState<BlogPostItem[]>([]);
  const [counts, setCounts] = useState({ all: 0, published: 0, draft: 0 });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [postToEdit, setPostToEdit] = useState<BlogPostItem | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Main Tab: "articles" | "comments"
  const [activeMainTab, setActiveMainTab] = useState<"articles" | "comments">("articles");
  const [commentFilterSlug, setCommentFilterSlug] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch("/api/admin/blog");
      const data = await res.json();
      if (res.ok && data.posts) {
        setPosts(data.posts);
        if (data.counts) {
          setCounts(data.counts);
        }
      }
    } catch (err) {
      console.error("Error loading blog posts:", err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleOpenCreate = () => {
    setPostToEdit(null);
    setIsEditorOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEdit = (post: BlogPostItem) => {
    setPostToEdit(post);
    setIsEditorOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleTogglePublish = async (post: BlogPostItem) => {
    const newStatus = post.status === "Published" ? "Draft" : "Published";
    try {
      const res = await fetch(`/api/admin/blog/${encodeURIComponent(post.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update publish state");

      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, status: newStatus } : p))
      );
      const title = language === "fr" ? post.title.fr : post.title.en;
      const statusLabel =
        newStatus === "Published"
          ? language === "fr"
            ? "PUBLIÉ"
            : "PUBLISHED"
          : language === "fr"
          ? "BROUILLON"
          : "DRAFT";
      setToastMsg(
        language === "fr"
          ? `L'article « ${title} » est maintenant ${statusLabel}`
          : `Article "${title}" is now ${statusLabel}`
      );
      setTimeout(() => setToastMsg(null), 3000);
      fetchPosts();
    } catch (err: any) {
      alert(
        err.message ||
          (language === "fr"
            ? "Échec du changement de statut de publication"
            : "Failed to toggle publish status")
      );
    }
  };

  const handleDeletePost = async (post: BlogPostItem) => {
    const title = language === "fr" ? post.title.fr : post.title.en;
    const confirmMsg =
      language === "fr"
        ? `Êtes-vous sûr de vouloir supprimer définitivement l'article « ${title} » et ses commentaires ?`
        : `Are you sure you want to permanently delete article "${title}" and its comments?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/admin/blog/${encodeURIComponent(post.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete post");

      setPosts((prev) => prev.filter((p) => p.id !== post.id));
      setToastMsg(
        language === "fr"
          ? `L'article « ${title} » a été supprimé.`
          : `Article "${title}" was deleted.`
      );
      setTimeout(() => setToastMsg(null), 3000);
      fetchPosts();
    } catch (err: any) {
      alert(
        err.message ||
          (language === "fr"
            ? "Échec de la suppression de l'article"
            : "Failed to delete post")
      );
    }
  };

  const handlePostSaved = (saved: BlogPostItem) => {
    setPosts((prev) => {
      const idx = prev.findIndex((p) => p.id === saved.id || p.slug === saved.slug);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      }
      return [saved, ...prev];
    });
    const savedTitle = language === "fr" ? saved.title.fr : saved.title.en;
    setToastMsg(
      language === "fr"
        ? `Article « ${savedTitle} » enregistré avec succès.`
        : `Post "${savedTitle}" saved successfully.`
    );
    setTimeout(() => setToastMsg(null), 3500);
    setIsEditorOpen(false);
    fetchPosts();
  };

  const filteredPosts = posts.filter((p) => {
    if (statusFilter !== "all" && p.status.toLowerCase() !== statusFilter.toLowerCase()) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      return (
        p.title.en.toLowerCase().includes(q) ||
        p.title.fr.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.author.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalViews = posts.reduce((acc, p) => acc + (p.views || 0), 0);
  const totalComments = posts.reduce((acc, p) => acc + (p.commentsCount || 0), 0);

  return (
    <PermissionGuard module="blog">
      {isEditorOpen ? (
        /* FULL-PAGE BLOG EDITOR VIEW WITH BACK BUTTON */
        <BlogFullPageEditor
          postToEdit={postToEdit}
          onBack={() => setIsEditorOpen(false)}
          onPostSaved={handlePostSaved}
        />
      ) : (
        /* MAIN ARTICLES & COMMENTS PORTAL */
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* 1. TOP HEADER */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#d21f27]">
                {language === "fr" ? "Centre de Gestion de Contenu" : "Content Management Hub"}
              </span>
              <h1 className="text-3xl sm:text-4xl font-bold text-[#0B2545] tracking-tight leading-tight mt-1">
                {language === "fr" ? "CMS de Blog Bilingue" : "Bilingual Blog CMS"}
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl">
                {language === "fr"
                  ? "Rédigez des articles en anglais et en français, modérez les commentaires et répondez aux lecteurs."
                  : "Author synchronized English and French articles, moderate reader comments, and publish verified editorial responses."}
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={fetchPosts}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs transition cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? "animate-spin" : ""}`}
                />
                <span>{language === "fr" ? "Actualiser" : "Refresh"}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenCreate}
                className="px-4 py-2 bg-[#d21f27] hover:bg-[#b91c1c] text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4 text-white" />
                <span>{language === "fr" ? "Nouvel Article" : "Write New Blog Post"}</span>
              </button>
            </div>
          </div>

          {toastMsg && (
            <div className="p-3.5 bg-[#0B2545] text-white rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{toastMsg}</span>
            </div>
          )}

          {/* 2. MAIN NAVIGATION TABS: ARTICLES HUB vs COMMENTS */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <button
              type="button"
              onClick={() => {
                setActiveMainTab("articles");
                setCommentFilterSlug(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                activeMainTab === "articles"
                  ? "bg-[#0B2545] text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
              }`}
            >
              <FileText className="w-4 h-4 text-[#d21f27]" />
              <span>{language === "fr" ? "Articles de Blog" : "Blog Articles"}</span>
              <span className="px-1.5 py-0.2 bg-white/20 text-current rounded-full text-[10px]">
                {posts.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMainTab("comments")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                activeMainTab === "comments"
                  ? "bg-[#0B2545] text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
              }`}
            >
              <MessageSquare className="w-4 h-4 text-[#d21f27]" />
              <span>
                {language === "fr" ? "Commentaires des Lecteurs" : "Reader Comments & Replies"}
              </span>
              <span className="px-1.5 py-0.2 bg-blue-100 text-[#0B2545] rounded-full text-[10px] font-bold">
                {totalComments}
              </span>
            </button>
          </div>

          {activeMainTab === "comments" ? (
            /* COMMENTS MODERATION & EDITORIAL REPLIES VIEW */
            <BlogCommentsManager
              posts={posts}
              initialPostFilter={commentFilterSlug}
            />
          ) : (
            /* ARTICLES DIRECTORY VIEW */
            <>
              {/* 3. SUMMARY METRIC CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    {language === "fr" ? "Articles Totaux" : "Total Articles"}
                  </span>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-[#0B2545]">{counts.all}</span>
                    <span className="text-xs font-semibold text-slate-500">
                      {language === "fr" ? "Dans le Dépôt" : "In Repository"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {language === "fr" ? "Versions EN / FR" : "Dual EN / FR versions"}
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                    {language === "fr" ? "En Ligne sur /blog" : "Live on Public /blog"}
                  </span>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-emerald-800">
                      {counts.published}
                    </span>
                    <span className="text-xs font-semibold text-emerald-700">
                      {language === "fr" ? "Publiés" : "Published"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {language === "fr"
                      ? "Affichés sur le site client"
                      : "Rendered on client website"}
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    {language === "fr" ? "Articles Brouillons" : "Draft Articles"}
                  </span>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-amber-700">{counts.draft}</span>
                    <span className="text-xs font-semibold text-amber-700">
                      {language === "fr" ? "En Révision" : "In Editorial Review"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {language === "fr" ? "Travail interne en cours" : "Internal work in progress"}
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    {language === "fr" ? "Commentaires Lecteurs" : "Reader Comments"}
                  </span>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-[#0B2545] font-mono">
                      {totalComments}
                    </span>
                    <span className="text-xs font-semibold text-blue-600">
                      {language === "fr" ? "Interactions" : "Total Feedback"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {language === "fr"
                      ? "Engagement & questions reçues"
                      : "Shipper questions & feedback"}
                  </p>
                </div>
              </div>

              {/* 4. POST DIRECTORY TABLE */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                {/* Table Filters */}
                <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    <button
                      type="button"
                      onClick={() => setStatusFilter("all")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        statusFilter === "all"
                          ? "bg-[#0B2545] text-white shadow-xs"
                          : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {language === "fr" ? "Tous les Articles" : "All Articles"} ({posts.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter("published")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        statusFilter === "published"
                          ? "bg-emerald-700 text-white shadow-xs"
                          : "bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50"
                      }`}
                    >
                      {language === "fr" ? "Publiés" : "Published"} ({counts.published})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter("draft")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        statusFilter === "draft"
                          ? "bg-amber-600 text-white shadow-xs"
                          : "bg-white text-amber-700 border border-amber-200 hover:bg-amber-50"
                      }`}
                    >
                      {language === "fr" ? "Brouillons" : "Drafts"} ({counts.draft})
                    </button>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder={
                        language === "fr"
                          ? "Rechercher titre, catégorie, auteur..."
                          : "Search title, category, author..."
                      }
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="bg-white border border-slate-200 focus:border-[#0B2545] rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 outline-none w-full sm:w-64 transition"
                    />
                  </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto min-h-[300px]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <th className="py-3.5 px-4">
                          {language === "fr"
                            ? "Titre de l'Article Bilingue"
                            : "Bilingual Article Title"}
                        </th>
                        <th className="py-3.5 px-4">
                          {language === "fr" ? "Catégorie" : "Category"}
                        </th>
                        <th className="py-3.5 px-4">
                          {language === "fr" ? "Auteur" : "Author"}
                        </th>
                        <th className="py-3.5 px-4">
                          {language === "fr" ? "Statut" : "Status"}
                        </th>
                        <th className="py-3.5 px-4">
                          {language === "fr" ? "Date" : "Date"}
                        </th>
                        <th className="py-3.5 px-4">
                          {language === "fr" ? "Commentaires" : "Comments"}
                        </th>
                        <th className="py-3.5 px-4">
                          {language === "fr" ? "Vues" : "Views"}
                        </th>
                        <th className="py-3.5 px-4 text-right">
                          {language === "fr" ? "Actions" : "Actions"}
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredPosts.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                            {language === "fr"
                              ? "Aucun article de blog ne correspond à vos critères."
                              : "No blog posts match your filter criteria."}
                          </td>
                        </tr>
                      ) : (
                        filteredPosts.map((post) => {
                          const isPublished = post.status === "Published";

                          return (
                            <tr key={post.id} className="hover:bg-slate-50/80 transition group">
                              {/* Title with Featured Image Thumbnail */}
                              <td className="py-3.5 px-4 max-w-sm">
                                <div className="flex items-start gap-3">
                                  {post.featuredImage ? (
                                    <div className="w-12 h-10 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0 bg-slate-100">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={post.featuredImage}
                                        alt="thumbnail"
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  ) : (
                                    <div className="w-12 h-10 rounded-lg border border-slate-200 flex-shrink-0 bg-slate-100 flex items-center justify-center text-slate-400">
                                      <ImageIcon className="w-4 h-4" />
                                    </div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <span
                                      onClick={() => handleEdit(post)}
                                      className="font-bold text-[#0B2545] block hover:text-[#d21f27] transition cursor-pointer truncate"
                                    >
                                      {post.title.en}
                                    </span>
                                    <span className="text-[11px] text-slate-500 italic block mt-0.5 truncate">
                                      {post.title.fr}
                                    </span>
                                    <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                                      /blog/{post.slug}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Category */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold text-slate-700 text-[11px] border border-slate-200">
                                  {post.category}
                                </span>
                              </td>

                              {/* Author */}
                              <td className="py-3.5 px-4 whitespace-nowrap text-slate-800 font-medium">
                                {post.author}
                              </td>

                              {/* Status */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <span
                                  className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                                    isPublished
                                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                      : "bg-amber-50 text-amber-800 border border-amber-200"
                                  }`}
                                >
                                  {post.status}
                                </span>
                              </td>

                              {/* Date */}
                              <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 text-[11px]">
                                {post.publishedDate}
                              </td>

                              {/* Comments Count & Status */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                {post.allowComments === false ? (
                                  <span
                                    className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-400 border border-slate-200"
                                    title={
                                      language === "fr"
                                        ? "Commentaires désactivés"
                                        : "Comments disabled"
                                    }
                                  >
                                    {language === "fr" ? "Désactivé" : "Off"}
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCommentFilterSlug(post.slug);
                                      setActiveMainTab("comments");
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-[#0B2545] border border-blue-200 hover:bg-blue-100 transition cursor-pointer"
                                    title={
                                      language === "fr"
                                        ? "Voir les commentaires"
                                        : "View reader comments"
                                    }
                                  >
                                    <MessageSquare className="w-3 h-3 text-[#d21f27]" />
                                    <span>{post.commentsCount || 0}</span>
                                  </button>
                                )}
                              </td>

                              {/* Views */}
                              <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-slate-700">
                                {post.views}
                              </td>

                              {/* Actions */}
                              <td className="py-3.5 px-4 whitespace-nowrap text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleTogglePublish(post)}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                                      isPublished
                                        ? "border-slate-200 text-slate-600 hover:bg-slate-100"
                                        : "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                                    }`}
                                  >
                                    {isPublished
                                      ? language === "fr"
                                        ? "Dépublier"
                                        : "Unpublish"
                                      : language === "fr"
                                      ? "Publier"
                                      : "Publish"}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleEdit(post)}
                                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-[#0B2545] hover:text-white text-slate-700 transition cursor-pointer"
                                    title={language === "fr" ? "Modifier l'Article" : "Edit Post"}
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeletePost(post)}
                                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-red-600 hover:text-white text-slate-400 hover:border-red-600 transition cursor-pointer"
                                    title={
                                      language === "fr"
                                        ? "Supprimer l'Article"
                                        : "Delete Article"
                                    }
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card List for Blog Posts */}
                <div className="block md:hidden divide-y divide-slate-100">
                  {filteredPosts.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      {language === "fr"
                        ? "Aucun article de blog ne correspond à vos critères."
                        : "No blog posts match your filter criteria."}
                    </div>
                  ) : (
                    filteredPosts.map((post) => {
                      const isPublished = post.status === "Published";

                      return (
                        <div key={post.id} className="p-4 space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold text-slate-700 text-[10px] border border-slate-200">
                              {post.category}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {post.allowComments !== false && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCommentFilterSlug(post.slug);
                                    setActiveMainTab("comments");
                                  }}
                                  className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[#0B2545] border border-blue-200 flex items-center gap-1"
                                >
                                  <MessageSquare className="w-3 h-3 text-[#d21f27]" />
                                  <span>{post.commentsCount || 0}</span>
                                </button>
                              )}
                              <span
                                className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                  isPublished
                                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                    : "bg-amber-50 text-amber-800 border border-amber-200"
                                }`}
                              >
                                {post.status}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-start gap-2.5">
                            {post.featuredImage && (
                              <div className="w-14 h-12 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0 bg-slate-100">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={post.featuredImage}
                                  alt="thumbnail"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <div>
                              <h4
                                onClick={() => handleEdit(post)}
                                className="font-bold text-[#0B2545] text-xs leading-snug cursor-pointer"
                              >
                                {post.title.en}
                              </h4>
                              <p className="text-[11px] text-slate-500 italic mt-0.5">
                                {post.title.fr}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                            <span>
                              {post.author} &bull; {post.publishedDate}
                            </span>
                            <span className="font-mono font-bold text-slate-600">
                              {post.views} {language === "fr" ? "vues" : "views"}
                            </span>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleTogglePublish(post)}
                              className={`flex-1 justify-center px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                                isPublished
                                  ? "border-slate-200 text-slate-600 hover:bg-slate-100"
                                  : "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                              }`}
                            >
                              {isPublished
                                ? language === "fr"
                                  ? "Dépublier"
                                  : "Unpublish"
                                : language === "fr"
                                ? "Publier"
                                : "Publish"}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleEdit(post)}
                              className="px-3.5 py-1.5 rounded-xl bg-[#0B2545] text-white font-bold text-xs hover:bg-slate-800 transition cursor-pointer flex items-center gap-1"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>{language === "fr" ? "Modifier" : "Edit"}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeletePost(post)}
                              className="p-1.5 rounded-xl border border-slate-200 hover:bg-red-600 hover:text-white text-slate-400 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </PermissionGuard>
  );
}

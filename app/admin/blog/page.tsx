"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { BlogPostItem } from "@/lib/mockData";
import BlogEditorModal from "@/components/admin/blog/BlogEditorModal";
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  RefreshCw,
  Eye,
  Languages,
  Clock,
  Edit2,
  ExternalLink,
  BookOpen,
} from "lucide-react";

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPostItem[]>([]);
  const [counts, setCounts] = useState({ all: 0, published: 0, draft: 0 });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [postToEdit, setPostToEdit] = useState<BlogPostItem | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

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
  };

  const handleEdit = (post: BlogPostItem) => {
    setPostToEdit(post);
    setIsEditorOpen(true);
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
      setToastMsg(`Article "${post.title.en}" is now ${newStatus.toUpperCase()}`);
      setTimeout(() => setToastMsg(null), 3000);
      fetchPosts();
    } catch (err: any) {
      alert(err.message || "Failed to toggle publish status");
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
    setToastMsg(`Post "${saved.title.en}" saved successfully.`);
    setTimeout(() => setToastMsg(null), 3500);
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
        p.author.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalViews = posts.reduce((acc, p) => acc + (p.views || 0), 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#d21f27]">
              Content Management Hub
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-mono font-bold">
              BILINGUAL CMS
            </span>
          </div>
          <h1
            className="text-3xl sm:text-4xl font-bold text-[#0B2545] tracking-tight leading-tight mt-1"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Bilingual Blog CMS
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl">
            Author and publish synchronized English and French articles for the public /blog section without requiring an external CMS.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchPosts}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs transition cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-[#0B2545] hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-[#d21f27]" />
            <span>New Bilingual Article</span>
          </button>
        </div>
      </div>

      {toastMsg && (
        <div className="p-3.5 bg-[#0B2545] text-white rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 2. SUMMARY METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Articles
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#0B2545]">{counts.all}</span>
            <span className="text-xs font-semibold text-slate-500">In Repository</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Dual EN / FR versions</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
              Live on Public /blog
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
              PUBLIC
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-800">{counts.published}</span>
            <span className="text-xs font-semibold text-emerald-700">Published</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Rendered on client website</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Draft Articles
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-amber-700">{counts.draft}</span>
            <span className="text-xs font-semibold text-amber-700">In Editorial Review</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Internal work in progress</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Cumulative Article Reads
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#0B2545] font-mono">
              {totalViews.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-blue-600">Organic Reads</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Shipper engagement metrics</p>
        </div>
      </div>

      {/* 3. POST DIRECTORY TABLE */}
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
              All Articles ({posts.length})
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
              Published ({counts.published})
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
              Drafts ({counts.draft})
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search title, category, author..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white border border-slate-200 focus:border-[#0B2545] rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 outline-none w-full sm:w-64 transition"
            />
          </div>
        </div>

        {/* Posts Table */}
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4">Bilingual Article Title</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Author</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Published Date</th>
                <th className="py-3.5 px-4">Views</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredPosts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    No blog posts match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredPosts.map((post) => {
                  const isPublished = post.status === "Published";

                  return (
                    <tr key={post.id} className="hover:bg-slate-50/80 transition group">
                      {/* Title */}
                      <td className="py-3.5 px-4 max-w-sm">
                        <div>
                          <span className="font-bold text-[#0B2545] block hover:text-[#d21f27] transition">
                            {post.title.en}
                          </span>
                          <span className="text-[11px] text-slate-500 italic block mt-0.5">
                            {post.title.fr}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                            /blog/{post.slug}
                          </span>
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
                            {isPublished ? "Unpublish" : "Publish"}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleEdit(post)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-[#0B2545] hover:text-white text-slate-700 transition cursor-pointer"
                            title="Edit Post"
                          >
                            <Edit2 className="w-3 h-3" />
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
      </div>

      {/* Blog Editor Modal */}
      <BlogEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        postToEdit={postToEdit}
        onPostSaved={handlePostSaved}
      />
    </div>
  );
}

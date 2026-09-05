"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import FaqBuilder from "@/components/admin/resources/FaqBuilder";
import {
  FolderOpen,
  FileText,
  Download,
  Plus,
  Trash2,
  ExternalLink,
  CheckCircle2,
  HelpCircle,
  FileCheck,
  Sparkles,
} from "lucide-react";

interface DownloadableResource {
  id: string;
  titleEn: string;
  titleFr: string;
  category: string;
  fileSize: number;
  fileName: string;
  mimeType: string;
  downloadsCount: number;
  createdAt: string;
}

function formatFileSize(bytes: number): string {
  if (!bytes) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export default function AdminResourcesPage() {
  const [resources, setResources] = useState<DownloadableResource[]>([]);
  const [loading, setLoading] = useState(true);

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newTitleEn, setNewTitleEn] = useState("");
  const [newTitleFr, setNewTitleFr] = useState("");
  const [newCategory, setNewCategory] = useState("Customs Compliance");
  const [newFile, setNewFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchResources = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/resources");
      const data = await res.json();
      if (res.ok && data.resources) {
        setResources(data.resources);
      }
    } catch (err) {
      console.error("Error fetching resources:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitleEn.trim() || !newFile) return;

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("titleEn", newTitleEn);
      formData.append("titleFr", newTitleFr || newTitleEn);
      formData.append("category", newCategory);
      formData.append("file", newFile);

      const res = await fetch("/api/admin/resources", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload resource");

      setResources((prev) => [data.resource, ...prev]);
      setIsUploading(false);
      setNewTitleEn("");
      setNewTitleFr("");
      setNewFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setToastMsg("New downloadable shipping guide registered.");
      setTimeout(() => setToastMsg(null), 3000);
    } catch (err: any) {
      alert(err.message || "Error uploading resource");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteResource = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/resources/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to remove resource");

      setResources((prev) => prev.filter((r) => r.id !== id));
      setToastMsg("Resource guide removed.");
      setTimeout(() => setToastMsg(null), 2500);
    } catch (err: any) {
      alert(err.message || "Error removing resource");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#d21f27]">
              Knowledge Base &amp; Shipper Enablement
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-mono font-bold">
              PUBLIC PORTAL ASSETS
            </span>
          </div>
          <h1
            className="text-3xl sm:text-4xl font-bold text-[#0B2545] tracking-tight leading-tight mt-1"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Resources &amp; FAQ Manager
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl">
            Manage downloadable regulatory guides, case studies, and bilingual FAQ accordions served on the public /resources hub.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsUploading(!isUploading)}
          className="px-4 py-2 bg-[#0B2545] hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-[#d21f27]" />
          <span>Upload New Guide</span>
        </button>
      </div>

      {toastMsg && (
        <div className="p-3.5 bg-[#0B2545] text-white rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 2. DOWNLOADABLE RESOURCES MANAGER */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden space-y-0">
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-[#0B2545] text-sm flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-[#0B2545]" />
              <span>Public Shipping Guides &amp; Whitepapers</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Certified PDFs available for immediate download by prospective shippers and clients.
            </p>
          </div>
        </div>

        {/* Upload Form */}
        {isUploading && (
          <form onSubmit={handleAddResource} className="p-5 border-b border-slate-200 bg-slate-50/40 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 font-bold text-slate-800">
              <span>Register New PDF Guide</span>
              <button
                type="button"
                onClick={() => setIsUploading(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                >
                  <option value="Customs Compliance">Customs Compliance</option>
                  <option value="Specialized Transport">Specialized Transport</option>
                  <option value="Heavy Haul Oversize">Heavy Haul Oversize</option>
                  <option value="Cold-Chain">Cold-Chain</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold text-slate-700 block mb-1">Title (English)</label>
                <input
                  type="text"
                  placeholder="e.g. 2026 Canadian Customs Clearance Handbook"
                  value={newTitleEn}
                  onChange={(e) => setNewTitleEn(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="font-bold text-slate-700 block mb-1">Titre (Français)</label>
                <input
                  type="text"
                  placeholder="ex. Manuel de l'expéditeur 2026 : Dédouanement canadien"
                  value={newTitleFr}
                  onChange={(e) => setNewTitleFr(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="font-bold text-slate-700 block mb-1">File (PDF, DOCX, etc.)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => setNewFile(e.target.files?.[0] || null)}
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none file:mr-3 file:px-2 file:py-1 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-700 file:font-bold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsUploading(false)}
                className="px-3 py-1.5 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !newTitleEn.trim() || !newFile}
                className="px-4 py-1.5 bg-[#0B2545] text-white rounded-xl font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {submitting ? "Uploading..." : "Publish Guide"}
              </button>
            </div>
          </form>
        )}

        {/* Resources Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4">Guide Name &amp; Description</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">File Size</th>
                <th className="py-3.5 px-4">Total Downloads</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 px-4 text-center text-slate-400">
                    Loading resources...
                  </td>
                </tr>
              ) : resources.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 px-4 text-center text-slate-400">
                    No resources uploaded yet.
                  </td>
                </tr>
              ) : (
                resources.map((res) => (
                  <tr key={res.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-start gap-2.5">
                        <FileText className="w-4 h-4 text-[#d21f27] mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-bold text-slate-900 block">{res.titleEn}</span>
                          <span className="text-[11px] text-slate-500 italic block">{res.titleFr}</span>
                          <span className="text-[10px] font-mono text-slate-400 block mt-0.5">{res.fileName}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold text-slate-700 text-[11px]">
                        {res.category}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-600 text-[11px]">
                      {formatFileSize(res.fileSize)}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-slate-800">
                      {res.downloadsCount}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={`/api/admin/resources/${encodeURIComponent(res.id)}/file`}
                          className="p-1.5 text-slate-400 hover:text-[#0B2545] transition"
                          title="Download File"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDeleteResource(res.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 transition cursor-pointer"
                          title="Remove Guide"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. BILINGUAL FAQ BUILDER ACCORDION */}
      <FaqBuilder />
    </div>
  );
}

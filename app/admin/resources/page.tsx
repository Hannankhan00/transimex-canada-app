"use client";

import React, { useState } from "react";
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
  fileSize: string;
  fileName: string;
  downloadsCount: number;
}

export default function AdminResourcesPage() {
  const [resources, setResources] = useState<DownloadableResource[]>([
    {
      id: "RES-01",
      titleEn: "2026 Canadian Customs Clearance & CBSA PARS Shipper Handbook",
      titleFr: "Manuel de l'expéditeur 2026 : Dédouanement canadien et PARS de l'ASFC",
      category: "Customs Compliance",
      fileSize: "2.4 MB (PDF)",
      fileName: "Transimex_Customs_Clearance_Handbook_2026.pdf",
      downloadsCount: 382,
    },
    {
      id: "RES-02",
      titleEn: "Pharmaceutical Cold-Chain Validation & Temperature Protocol Guide",
      titleFr: "Protocole de validation de la chaîne du froid pharmaceutique",
      category: "Specialized Transport",
      fileSize: "1.8 MB (PDF)",
      fileName: "Transimex_ColdChain_Validation_Protocol.pdf",
      downloadsCount: 215,
    },
    {
      id: "RES-03",
      titleEn: "Quebec Spring Thaw (Dégel) Heavy Haul Axle Load Limits Reference Sheet",
      titleFr: "Feuille de référence des charges par essieu pendant le dégel au Québec",
      category: "Heavy Haul Oversize",
      fileSize: "1.1 MB (PDF)",
      fileName: "Quebec_Spring_Thaw_Axle_Limits_2026.pdf",
      downloadsCount: 164,
    },
  ]);

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [newTitleEn, setNewTitleEn] = useState("");
  const [newTitleFr, setNewTitleFr] = useState("");
  const [newCategory, setNewCategory] = useState("Customs Compliance");

  const handleAddResource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitleEn.trim()) return;

    const newRes: DownloadableResource = {
      id: `RES-0${resources.length + 1}`,
      titleEn: newTitleEn,
      titleFr: newTitleFr || newTitleEn,
      category: newCategory,
      fileSize: "1.5 MB (PDF)",
      fileName: `${newTitleEn.toLowerCase().replace(/[^a-z0-9]+/g, "_")}.pdf`,
      downloadsCount: 0,
    };

    setResources([newRes, ...resources]);
    setIsUploading(false);
    setNewTitleEn("");
    setNewTitleFr("");
    setToastMsg("New downloadable shipping guide registered.");
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleDeleteResource = (id: string) => {
    setResources((prev) => prev.filter((r) => r.id !== id));
    setToastMsg("Resource guide removed.");
    setTimeout(() => setToastMsg(null), 2500);
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
              <span>Public Shipping Guides &amp; Whitepapers (Cloudinary Vault)</span>
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
                className="px-4 py-1.5 bg-[#0B2545] text-white rounded-xl font-bold shadow-xs transition cursor-pointer"
              >
                Publish Guide
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
              {resources.map((res) => (
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
                    {res.fileSize}
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-slate-800">
                    {res.downloadsCount}
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap text-right">
                    <button
                      type="button"
                      onClick={() => handleDeleteResource(res.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 transition cursor-pointer"
                      title="Remove Guide"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. BILINGUAL FAQ BUILDER ACCORDION */}
      <FaqBuilder />
    </div>
  );
}

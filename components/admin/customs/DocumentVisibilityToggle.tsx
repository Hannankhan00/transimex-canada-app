"use client";

import React, { useState } from "react";
import { VaultDocument } from "@/lib/mockData";
import {
  Lock,
  Eye,
  EyeOff,
  Download,
  FileText,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Radio,
} from "lucide-react";

interface DocumentVisibilityToggleProps {
  documents: VaultDocument[];
  shipmentId: string;
  onVisibilityToggled: (docId: string, newVisibility: boolean) => void;
}

export default function DocumentVisibilityToggle({
  documents,
  shipmentId,
  onVisibilityToggled,
}: DocumentVisibilityToggleProps) {
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleToggle = async (doc: VaultDocument) => {
    try {
      setTogglingId(doc.id);
      const res = await fetch(
        `/api/admin/shipments/${encodeURIComponent(shipmentId)}/documents/${encodeURIComponent(doc.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isClientVisible: !doc.isClientVisible }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to toggle document visibility");
      }

      onVisibilityToggled(doc.id, !doc.isClientVisible);
    } catch (err) {
      console.error("Error toggling document visibility:", err);
    } finally {
      setTogglingId(null);
    }
  };

  const handleDownloadPreview = (doc: VaultDocument) => {
    setDownloadingId(doc.id);
    try {
      const fileContent = `%PDF-1.4\n% Transimex Canada Logistics Official Paperwork\n% Document ID: ${doc.id}\n% Shipment ID: ${doc.shipmentId}\n% Type: ${doc.type}\n% Visibility: ${doc.isClientVisible ? "PUBLIC" : "INTERNAL CONFIDENTIAL"}\n% Date: ${doc.dateUploaded}\n%%EOF`;
      const blob = new Blob([fileContent], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
    } finally {
      setTimeout(() => setDownloadingId(null), 500);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden space-y-0">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-[#0B2545] text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#0B2545]" />
            <span>Document Vault Permissions Gatekeeper (isClientVisible)</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Toggle which regulatory manifests are published to the client&apos;s portal vs retained for staff eyes only.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 text-[10px]">
            {documents.filter((d) => d.isClientVisible).length} Public in Vault
          </span>
          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-bold border border-slate-200 text-[10px]">
            {documents.filter((d) => !d.isClientVisible).length} Internal Only
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th className="py-3 px-4">Document Name</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Date Uploaded</th>
              <th className="py-3 px-4">File Size</th>
              <th className="py-3 px-4">Client Visibility Status</th>
              <th className="py-3 px-4 text-right">Visibility Switch</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-slate-700">
            {documents.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                  No documents linked to this shipment manifest yet.
                </td>
              </tr>
            ) : (
              documents.map((doc) => {
                const isPublic = doc.isClientVisible;
                const isUpdating = togglingId === doc.id;

                return (
                  <tr key={doc.id} className="hover:bg-slate-50/70 transition">
                    {/* Document Name */}
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="truncate max-w-[220px]" title={doc.name}>
                          {doc.name}
                        </span>
                        {doc.customsPars && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono text-[10px]">
                            {doc.customsPars}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Type */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-100 font-medium text-slate-700 text-[11px]">
                        {doc.type}
                      </span>
                    </td>

                    {/* Date Uploaded */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 text-[11px]">
                      {doc.dateUploaded}
                    </td>

                    {/* Size */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {doc.size}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {isPublic ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 text-[10px]">
                          <Eye className="w-3 h-3 text-emerald-600" />
                          <span>Public in Client Vault</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-bold border border-slate-200 text-[10px]">
                          <Lock className="w-3 h-3 text-slate-500" />
                          <span>Internal Confidential (Staff Only)</span>
                        </span>
                      )}
                    </td>

                    {/* Toggle & Download Action */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Download Preview Button */}
                        <button
                          type="button"
                          onClick={() => handleDownloadPreview(doc)}
                          disabled={downloadingId === doc.id}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                          title="Download PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        {/* Interactive Toggle Switch */}
                        <button
                          type="button"
                          onClick={() => handleToggle(doc)}
                          disabled={isUpdating}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            isPublic ? "bg-[#10b981]" : "bg-slate-300"
                          } ${isUpdating ? "opacity-50" : ""}`}
                          role="switch"
                          aria-checked={isPublic}
                          title={isPublic ? "Revoke client visibility" : "Release to client vault"}
                        >
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              isPublic ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
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
  );
}

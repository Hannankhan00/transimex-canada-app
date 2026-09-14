"use client";

import React, { useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { VaultDocument } from "@/lib/documentTypes";
import { Lock, Eye, Download, FileText, ShieldCheck } from "lucide-react";

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
  const { language } = useLanguage();
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
    window.open(
      `/api/admin/shipments/${encodeURIComponent(shipmentId)}/documents/${encodeURIComponent(doc.id)}/file`,
      "_blank"
    );
    setTimeout(() => setDownloadingId(null), 500);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden space-y-0">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-[#0B2545] text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#0B2545]" />
            <span>{language === "fr" ? "Permissions du Coffre de Documents" : "Document Vault Permissions"}</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {language === "fr"
              ? "Basculez quels manifestes réglementaires sont publiés dans le portail client ou réservés au personnel."
              : "Toggle which regulatory manifests are published to the client's portal vs retained for staff eyes only."}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 text-[10px]">
            {documents.filter((d) => d.isClientVisible).length}{" "}
            {language === "fr" ? "Publics dans le Coffre" : "Public in Vault"}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-bold border border-slate-200 text-[10px]">
            {documents.filter((d) => !d.isClientVisible).length}{" "}
            {language === "fr" ? "Internes Uniquement" : "Internal Only"}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th className="py-3 px-4">{language === "fr" ? "Nom du Document" : "Document Name"}</th>
              <th className="py-3 px-4">{language === "fr" ? "Type" : "Type"}</th>
              <th className="py-3 px-4">{language === "fr" ? "Date de Téléversement" : "Date Uploaded"}</th>
              <th className="py-3 px-4">{language === "fr" ? "Taille" : "File Size"}</th>
              <th className="py-3 px-4">{language === "fr" ? "Statut de Visibilité Client" : "Client Visibility Status"}</th>
              <th className="py-3 px-4 text-right">{language === "fr" ? "Basculer la Visibilité" : "Visibility Switch"}</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-slate-700">
            {documents.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                  {language === "fr"
                    ? "Aucun document lié à ce manifeste d'expédition pour le moment."
                    : "No documents linked to this shipment manifest yet."}
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
                          <span>{language === "fr" ? "Public dans le Coffre Client" : "Public in Client Vault"}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-bold border border-slate-200 text-[10px]">
                          <Lock className="w-3 h-3 text-slate-500" />
                          <span>{language === "fr" ? "Confidentiel Interne (Personnel Uniquement)" : "Internal Confidential (Staff Only)"}</span>
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
                          title={language === "fr" ? "Télécharger le PDF" : "Download PDF"}
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
                          title={
                            isPublic
                              ? language === "fr"
                                ? "Révoquer la visibilité client"
                                : "Revoke client visibility"
                              : language === "fr"
                              ? "Publier dans le coffre client"
                              : "Release to client vault"
                          }
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

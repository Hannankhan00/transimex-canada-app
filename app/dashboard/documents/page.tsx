"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  FolderOpen,
  FileText,
  Download,
  Search,
  Calendar,
  ShieldCheck,
  ExternalLink,
  Eye,
} from "lucide-react";

interface PortalDocumentItem {
  id: string;
  name: string;
  type: string;
  shipmentId: string;
  dateUploaded: string;
  statusText: string;
  customsPars?: string;
  mimeType?: string;
  fileSize?: number;
}

export default function DocumentsPage() {
  const { t, language } = useLanguage();
  const [searchShipmentId, setSearchShipmentId] = useState("");
  const [selectedType, setSelectedType] = useState<string>("All");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [clientVisibleDocs, setClientVisibleDocs] = useState<PortalDocumentItem[]>([]);

  useEffect(() => {
    fetch("/api/documents")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setClientVisibleDocs(data.documents);
      })
      .catch(() => {});
  }, []);

  const filteredDocs = clientVisibleDocs.filter((doc) => {
    // Filter by Document Type
    if (selectedType !== "All" && doc.type !== selectedType) {
      return false;
    }

    // Filter by Search (Shipment ID or Document Name)
    if (searchShipmentId.trim()) {
      const q = searchShipmentId.toLowerCase().trim();
      const matchShipment = doc.shipmentId.toLowerCase().includes(q);
      const matchName = doc.name.toLowerCase().includes(q);
      const matchType = doc.type.toLowerCase().includes(q);
      if (!matchShipment && !matchName && !matchType) {
        return false;
      }
    }

    return true;
  });

  const handleDownloadPdf = async (doc: PortalDocumentItem) => {
    setDownloadingId(doc.id);
    try {
      const res = await fetch(`/api/documents/${doc.id}/download`);
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
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
      setDownloadingId(null);
    }
  };

  const documentTypes: { label: string; value: string }[] = [
    { label: language === "fr" ? "Tous les Types" : "All Types", value: "All" },
    { label: "Bill of Lading", value: "Bill of Lading" },
    { label: "Air Waybill", value: "Air Waybill" },
    { label: "Rail Waybill", value: "Rail Waybill" },
    { label: "Proof of Delivery", value: "Proof of Delivery" },
    { label: "Customs Entry", value: "Customs Entry" },
    { label: "Commercial Invoice", value: "Commercial Invoice" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B2545] tracking-tight leading-tight">
          {t.nav.documents}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {language === "fr"
            ? "Accédez à tous les connaissements, reçus de livraison et documents douaniers pour vos expéditions."
            : "All your bills of lading, delivery receipts, and customs paperwork in one place."}
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search by Shipment ID or Doc Name */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={
              language === "fr"
                ? "Rechercher par ID Expédition (ex: TMX-00847) ou nom..."
                : "Search by Shipment ID (e.g. TMX-00847) or file name..."
            }
            value={searchShipmentId}
            onChange={(e) => setSearchShipmentId(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition font-medium text-slate-900"
          />
        </div>

        {/* Filter by Document Type Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap hidden sm:block">
            {language === "fr" ? "Type de Document :" : "Document Type:"}
          </label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0B2545] rounded-xl text-xs font-semibold text-slate-800 outline-none transition cursor-pointer"
          >
            {documentTypes.map((dt) => (
              <option key={dt.value} value={dt.value}>
                {dt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Documents Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredDocs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FolderOpen className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">
              {language === "fr" ? "Aucun document trouvé" : "No Matching Documents Found"}
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {language === "fr"
                ? "Aucun fichier ne correspond à vos critères de recherche ou type sélectionné."
                : "Try adjusting your search query or selecting a different document type."}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500 select-none">
                    <th className="py-3 px-4 sm:px-6">{language === "fr" ? "Nom du Document" : "Document Name"}</th>
                    <th className="py-3 px-4">{language === "fr" ? "Type" : "Document Type"}</th>
                    <th className="py-3 px-4">{language === "fr" ? "Expédition Liée" : "Linked Shipment"}</th>
                    <th className="py-3 px-4">{language === "fr" ? "Date de Téléversement" : "Date Uploaded"}</th>
                    <th className="py-3 px-4">{language === "fr" ? "Statut" : "Verification Status"}</th>
                    <th className="py-3 px-4 sm:px-6 text-right">{language === "fr" ? "Actions" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredDocs.map((doc) => {
                    return (
                      <tr
                        key={doc.id}
                        className="hover:bg-slate-50/80 transition group"
                      >
                        {/* Document Name & Icon (Opens fast in native Chrome viewer) */}
                        <td className="py-4 px-4 sm:px-6">
                          <div className="flex items-center gap-3">
                            <a
                              href={`/api/documents/${doc.id}/view`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-9 h-9 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0 border border-blue-100 transition cursor-pointer"
                              title={language === "fr" ? "Ouvrir dans un nouvel onglet" : "Open in new browser tab"}
                            >
                              <FileText className="w-4 h-4" />
                            </a>
                            <div className="min-w-0">
                              <a
                                href={`/api/documents/${doc.id}/view`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-bold text-slate-900 group-hover:text-[#0B2545] transition truncate max-w-xs sm:max-w-md text-left cursor-pointer hover:underline block"
                                title={language === "fr" ? "Ouvrir dans le visualiseur Chrome" : "Open in Chrome document viewer"}
                              >
                                {doc.name}
                              </a>
                            </div>
                          </div>
                        </td>

                        {/* Document Type Badge */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {doc.type}
                          </span>
                        </td>

                        {/* Linked Shipment ID (Clickable) */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <Link
                            href={`/dashboard/shipments?id=${doc.shipmentId}`}
                            className="inline-flex items-center gap-1 font-mono font-bold text-[#0B2545] hover:text-[#d21f27] transition"
                            title="View Live Shipment Tracking"
                          >
                            <span>{doc.shipmentId}</span>
                            <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-[#d21f27]" />
                          </Link>
                        </td>

                        {/* Date Uploaded */}
                        <td className="py-4 px-4 text-slate-500 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{doc.dateUploaded}</span>
                          </div>
                        </td>

                        {/* Verification Status */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-[11px]">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                            <span>{doc.statusText}</span>
                          </div>
                        </td>

                        {/* Actions: Direct Chrome Tab Viewer + Download PDF */}
                        <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-2">
                            {/* Open in New Tab with Chrome PDF Viewer */}
                            <a
                              href={`/api/documents/${doc.id}/view`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#0B2545] text-xs font-bold rounded-xl border border-blue-200 transition cursor-pointer"
                              title={language === "fr" ? "Ouvrir dans un nouvel onglet" : "Open in Chrome document viewer"}
                            >
                              <Eye className="w-3.5 h-3.5 text-blue-700" />
                              <span>{language === "fr" ? "Afficher" : "View"}</span>
                            </a>

                            {/* Download PDF Button */}
                            <button
                              type="button"
                              onClick={() => handleDownloadPdf(doc)}
                              disabled={downloadingId === doc.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0B2545] hover:bg-[#123661] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                              title={language === "fr" ? "Télécharger le fichier PDF" : "Download PDF file"}
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>
                                {downloadingId === doc.id
                                  ? language === "fr"
                                    ? "..."
                                    : "..."
                                  : "PDF"}
                              </span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards (Phones View) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredDocs.map((doc) => (
                <div key={doc.id} className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <a
                      href={`/api/documents/${doc.id}/view`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0 border border-blue-100 mt-0.5"
                    >
                      <FileText className="w-4 h-4" />
                    </a>
                    <div className="flex-1 min-w-0">
                      <a
                        href={`/api/documents/${doc.id}/view`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-slate-900 text-xs leading-snug text-left hover:underline truncate block w-full"
                      >
                        {doc.name}
                      </a>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {doc.dateUploaded}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap text-[11px]">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {doc.type}
                    </span>
                    <div className="flex items-center gap-1 text-emerald-700 font-semibold text-[10px]">
                      <ShieldCheck className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                      <span>{doc.statusText}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs gap-2">
                    <Link
                      href={`/dashboard/shipments?id=${doc.shipmentId}`}
                      className="inline-flex items-center gap-1 font-mono font-bold text-[#0B2545] text-xs hover:text-[#d21f27] truncate"
                    >
                      <span>Shipment {doc.shipmentId}</span>
                      <ExternalLink className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    </Link>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {/* Mobile View in New Tab Button */}
                      <a
                        href={`/api/documents/${doc.id}/view`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#0B2545] text-xs font-bold rounded-xl border border-blue-200 transition"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-700" />
                        <span>{language === "fr" ? "Afficher" : "View"}</span>
                      </a>

                      {/* Mobile Download Button */}
                      <button
                        type="button"
                        onClick={() => handleDownloadPdf(doc)}
                        disabled={downloadingId === doc.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#0B2545] hover:bg-[#123661] text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{downloadingId === doc.id ? "..." : "PDF"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

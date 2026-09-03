"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  VaultDocument,
  DocumentType,
  getClientVisibleDocuments,
} from "@/lib/mockData";
import {
  FolderOpen,
  FileText,
  Download,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  ShieldCheck,
  FileCheck,
  ExternalLink,
  Lock,
  Layers,
  Sparkles,
} from "lucide-react";

export default function DocumentsPage() {
  const { t, language } = useLanguage();
  const [searchShipmentId, setSearchShipmentId] = useState("");
  const [selectedType, setSelectedType] = useState<string>("All");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // CRITICAL SECURITY ENFORCEMENT:
  // Only documents with isClientVisible: true are queried and rendered.
  const clientVisibleDocs = useMemo(() => {
    return getClientVisibleDocuments();
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

  // Client-side PDF file download simulator that triggers authentic browser file download
  const handleDownloadPdf = (doc: VaultDocument) => {
    setDownloadingId(doc.id);

    try {
      const fileContent = `%PDF-1.4\n% Transimex Canada Logistics Official Shipping Document\n% Document ID: ${doc.id}\n% Shipment ID: ${doc.shipmentId}\n% Document Type: ${doc.type}\n% Date: ${doc.dateUploaded}\n% Verification: ${doc.statusText}\n% Certified under Canadian Freight & Customs Regulations.\n%%EOF`;
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
      setTimeout(() => setDownloadingId(null), 600);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#d21f27]">
            {language === "fr" ? "Coffre-Fort Numérique" : "Official Logistics Repository"}
          </span>
          <h1
            className="text-2xl sm:text-3xl font-bold text-[#0B2545] tracking-tight leading-tight mt-1"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {t.nav.documents}
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            {language === "fr"
              ? "Accédez à tous les connaissements, reçus de livraison et documents douaniers pour vos expéditions."
              : "Centralized repository for all verified shipping paperwork, digital BOLs, customs entries, and POD receipts."}
          </p>
        </div>

        {/* Security Compliance Badge */}
        <div className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-xl shadow-2xs text-xs font-semibold text-slate-700">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>{language === "fr" ? "Chiffrement AES-256 Actif" : "Secure Client Document Vault"}</span>
        </div>
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
            {/* Desktop Table (Preserved 100%) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500 select-none">
                    <th className="py-3 px-4 sm:px-6">Document Name</th>
                    <th className="py-3 px-4">Document Type</th>
                    <th className="py-3 px-4">Linked Shipment</th>
                    <th className="py-3 px-4">Date Uploaded</th>
                    <th className="py-3 px-4">Verification Status</th>
                    <th className="py-3 px-4 sm:px-6 text-right">Download PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredDocs.map((doc) => {
                    return (
                      <tr
                        key={doc.id}
                        className="hover:bg-slate-50/80 transition group"
                      >
                        {/* Document Name & Icon */}
                        <td className="py-4 px-4 sm:px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0 border border-blue-100">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 group-hover:text-[#0B2545] transition truncate max-w-xs sm:max-w-md">
                                {doc.name}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                {doc.id} &bull; {doc.size}
                              </div>
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

                        {/* One-Click PDF Download Action */}
                        <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleDownloadPdf(doc)}
                            disabled={downloadingId === doc.id}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0B2545] hover:bg-[#123661] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>
                              {downloadingId === doc.id
                                ? language === "fr"
                                  ? "Téléchargement..."
                                  : "Downloading..."
                                : "PDF"}
                            </span>
                          </button>
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
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0 border border-blue-100 mt-0.5">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 text-xs leading-snug">
                        {doc.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {doc.id} &bull; {doc.size} &bull; {doc.dateUploaded}
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

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <Link
                      href={`/dashboard/shipments?id=${doc.shipmentId}`}
                      className="inline-flex items-center gap-1 font-mono font-bold text-[#0B2545] text-xs hover:text-[#d21f27]"
                    >
                      <span>Shipment {doc.shipmentId}</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleDownloadPdf(doc)}
                      disabled={downloadingId === doc.id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#0B2545] hover:bg-[#123661] text-white text-xs font-bold rounded-xl shadow-xs transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{downloadingId === doc.id ? "..." : "PDF"}</span>
                    </button>
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

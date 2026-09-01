"use client";

import React, { useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  FolderOpen,
  FileText,
  Download,
  Search,
  CheckCircle2,
  Calendar,
  ShieldCheck,
  FileCheck,
} from "lucide-react";

export default function DocumentsPage() {
  const { t, language } = useLanguage();
  const [search, setSearch] = useState("");

  const docs = [
    {
      id: "DOC-99482",
      name: "Bill of Lading - TMX-00847.pdf",
      type: "Bill of Lading (BOL)",
      shipmentId: "TMX-00847",
      date: "Sep 01, 2026",
      size: "245 KB",
      status: "Verified",
    },
    {
      id: "DOC-99480",
      name: "CBSA_Customs_PARS_Entry_8849.pdf",
      type: "Customs Entry Document",
      shipmentId: "TMX-00839",
      date: "Aug 31, 2026",
      size: "410 KB",
      status: "CBSA Cleared",
    },
    {
      id: "DOC-99475",
      name: "Commercial_Invoice_Laurentian_882.pdf",
      type: "Commercial Invoice",
      shipmentId: "TMX-00810",
      date: "Aug 30, 2026",
      size: "180 KB",
      status: "Signed",
    },
    {
      id: "DOC-99420",
      name: "Proof_of_Delivery_POD_TMX00790.pdf",
      type: "Proof of Delivery (POD)",
      shipmentId: "TMX-00790",
      date: "Aug 28, 2026",
      size: "520 KB",
      status: "Delivered",
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#d21f27]">
            {language === "fr" ? "Documents & Connaissements" : "Customs & Manifest Documents"}
          </span>
          <h1
            className="text-2xl sm:text-3xl font-bold text-[#0B2545] tracking-tight leading-tight mt-1"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {t.nav.documents}
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            {language === "fr"
              ? "Téléchargez vos connaissements (BOL), preuves de livraison (POD) et formulaires CBSA."
              : "Download digital Bills of Lading (BOL), Proof of Delivery (POD), and CBSA customs entries."}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={language === "fr" ? "Rechercher par nom de fichier, TMX-#..." : "Search document name, TMX-#..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {docs.map((doc) => (
          <div
            key={doc.id}
            className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition flex items-center justify-between gap-4"
          >
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">{doc.name}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{doc.type} &bull; {doc.size}</div>
                <div className="text-[10px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  {doc.status} ({doc.date})
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => alert(`Downloading ${doc.name}`)}
              className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-[#0B2545] rounded-xl border border-slate-200 transition cursor-pointer flex-shrink-0"
              title="Download Document"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Truck, FileText, Users, DollarSign, CheckCircle2, ArrowDownToLine } from "lucide-react";

export default function CsvExportSuite() {
  const { language } = useLanguage();

  // Shipments filter
  const [shipmentMode, setShipmentMode] = useState("all");
  const [shipmentStatus, setShipmentStatus] = useState("all");

  // Quotes filter
  const [quoteStatus, setQuoteStatus] = useState("all");

  // Clients filter
  const [clientStatus, setClientStatus] = useState("all");

  // Download states
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const handleDownload = async (exportType: "shipments" | "quotes" | "clients" | "revenue") => {
    try {
      setDownloading(exportType);
      let url = "";

      if (exportType === "shipments") {
        url = `/api/admin/export/shipments?mode=${encodeURIComponent(shipmentMode)}&status=${encodeURIComponent(shipmentStatus)}`;
      } else if (exportType === "quotes") {
        url = `/api/admin/export/quotes?status=${encodeURIComponent(quoteStatus)}`;
      } else if (exportType === "clients") {
        url = `/api/admin/export/clients?status=${encodeURIComponent(clientStatus)}`;
      } else if (exportType === "revenue") {
        url = `/api/admin/export/revenue`;
      }

      // Trigger native browser download
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to generate CSV export");

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      let filename = `transimex_${exportType}_export.csv`;
      if (disposition && disposition.includes("filename=")) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      setDownloadSuccess(exportType);
      setTimeout(() => setDownloadSuccess(null), 3000);
    } catch (err: any) {
      alert(err.message || "Error initiating CSV download");
    } finally {
      setDownloading(null);
    }
  };

  const downloadedLabel = language === "fr" ? "Téléchargé avec Succès" : "Downloaded Successfully";
  const generatingLabel = language === "fr" ? "Génération du CSV..." : "Generating CSV...";

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden space-y-0">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#d21f27]">
            {language === "fr" ? "Vérification et Pipeline de Données" : "Auditing & Data Pipeline"}
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-[#0B2545] tracking-tight mt-1">
            {language === "fr" ? "Exports CSV Opérationnels et Comptables" : "Operational & Accounting CSV Exports"}
          </h2>
          <p className="text-[12px] text-slate-500 mt-0.5">
            {language === "fr"
              ? "Téléchargements instantanés encodés en UTF-8 BOM, compatibles avec Microsoft Excel, Google Sheets et les systèmes de vérification ERP."
              : "Instant downloads encoded in UTF-8 BOM formatted for Microsoft Excel, Google Sheets, and ERP auditing systems."}
          </p>
        </div>
      </div>

      {/* Grid of 4 Export Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 border-b border-slate-100">
        {/* Card 1: Shipments History */}
        <div className="p-5 space-y-4 hover:bg-slate-50/40 transition">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0B2545] text-white flex items-center justify-center flex-shrink-0">
                <Truck className="w-5 h-5 text-[#d21f27]" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  {language === "fr" ? "Rapport d'Historique des Expéditions" : "Shipments History Report"}
                </h4>
                <p className="text-[11px] text-slate-500">
                  {language === "fr"
                    ? "Numéro de suivi, nom du client, origine, destination, transporteur, statut et dates de livraison."
                    : "Tracking ID, client name, origin, destination, carrier, status, and delivery dates."}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                {language === "fr" ? "Mode de Transport" : "Transport Mode"}
              </label>
              <select
                value={shipmentMode}
                onChange={(e) => setShipmentMode(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 outline-none"
              >
                <option value="all">{language === "fr" ? "Tous les Modes" : "All Modes"}</option>
                <option value="Road">{language === "fr" ? "Route (Autoroute)" : "Road (Highway)"}</option>
                <option value="Sea">{language === "fr" ? "Mer (Maritime)" : "Sea (Maritime)"}</option>
                <option value="Air">{language === "fr" ? "Aérien Express" : "Air Express"}</option>
                <option value="Rail">{language === "fr" ? "Rail Intermodal" : "Rail Intermodal"}</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                {language === "fr" ? "Statut Actuel" : "Current Status"}
              </label>
              <select
                value={shipmentStatus}
                onChange={(e) => setShipmentStatus(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 outline-none"
              >
                <option value="all">{language === "fr" ? "Tous les Statuts" : "All Statuses"}</option>
                <option value="Delivered">{language === "fr" ? "Livré" : "Delivered"}</option>
                <option value="In Transit">{language === "fr" ? "En Transit" : "In Transit"}</option>
                <option value="Customs Hold">{language === "fr" ? "Blocage Douanier" : "Customs Hold"}</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            disabled={downloading === "shipments"}
            onClick={() => handleDownload("shipments")}
            className="w-full py-2 bg-[#0B2545] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
          >
            {downloadSuccess === "shipments" ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{downloadedLabel}</span>
              </>
            ) : (
              <>
                <ArrowDownToLine className="w-3.5 h-3.5 text-[#d21f27]" />
                <span>{downloading === "shipments" ? generatingLabel : language === "fr" ? "Télécharger le CSV des Expéditions" : "Download Shipments CSV"}</span>
              </>
            )}
          </button>
        </div>

        {/* Card 2: Quote Requests */}
        <div className="p-5 space-y-4 hover:bg-slate-50/40 transition">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0B2545] text-white flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-[#d21f27]" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  {language === "fr" ? "Demandes de Soumission et Pipeline" : "Quote Requests & Pipeline"}
                </h4>
                <p className="text-[11px] text-slate-500">
                  {language === "fr"
                    ? "ID de soumission, client, dimensions de la cargaison, poids, tarif de transport et statut d'acceptation."
                    : "Quote ID, client, cargo dimensions, weight, quoted linehaul, and acceptance status."}
                </p>
              </div>
            </div>
          </div>

          <div className="text-xs">
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
              {language === "fr" ? "Statut du Pipeline" : "Pipeline Status"}
            </label>
            <select
              value={quoteStatus}
              onChange={(e) => setQuoteStatus(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 outline-none"
            >
              <option value="all">{language === "fr" ? "Toutes les Soumissions" : "All Quotes (New, Reviewing, Accepted, Rejected)"}</option>
              <option value="Accepted">{language === "fr" ? "Acceptées et Converties" : "Accepted & Auto-Converted"}</option>
              <option value="Reviewing">{language === "fr" ? "En Révision par le Personnel" : "Under Staff Review"}</option>
              <option value="New">{language === "fr" ? "Nouvelle Demande" : "New Intake"}</option>
              <option value="Rejected">{language === "fr" ? "Rejetée / Déclinée" : "Rejected / Declined"}</option>
            </select>
          </div>

          <button
            type="button"
            disabled={downloading === "quotes"}
            onClick={() => handleDownload("quotes")}
            className="w-full py-2 bg-[#0B2545] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
          >
            {downloadSuccess === "quotes" ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{downloadedLabel}</span>
              </>
            ) : (
              <>
                <ArrowDownToLine className="w-3.5 h-3.5 text-[#d21f27]" />
                <span>{downloading === "quotes" ? generatingLabel : language === "fr" ? "Télécharger le CSV des Soumissions" : "Download Quotes CSV"}</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
        {/* Card 3: Client Directory */}
        <div className="p-5 space-y-4 hover:bg-slate-50/40 transition">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0B2545] text-white flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-[#d21f27]" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  {language === "fr" ? "Répertoire des Comptes Clients" : "Client Accounts Directory"}
                </h4>
                <p className="text-[11px] text-slate-500">
                  {language === "fr"
                    ? "Noms d'entreprise, coordonnées, étiquettes d'industrie, dépenses et états des comptes."
                    : "Company names, contact credentials, industry tags, spend, and account states."}
                </p>
              </div>
            </div>
          </div>

          <div className="text-xs">
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
              {language === "fr" ? "Filtre de Statut de Compte" : "Account Status Filter"}
            </label>
            <select
              value={clientStatus}
              onChange={(e) => setClientStatus(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 outline-none"
            >
              <option value="all">{language === "fr" ? "Tous les Comptes" : "All Accounts (Active & Deactivated)"}</option>
              <option value="Active">{language === "fr" ? "Accès Portail Actif Seulement" : "Active Portal Access Only"}</option>
              <option value="Deactivated">{language === "fr" ? "Désactivés / Suspendus Seulement" : "Deactivated / Suspended Only"}</option>
            </select>
          </div>

          <button
            type="button"
            disabled={downloading === "clients"}
            onClick={() => handleDownload("clients")}
            className="w-full py-2 bg-[#0B2545] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
          >
            {downloadSuccess === "clients" ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{downloadedLabel}</span>
              </>
            ) : (
              <>
                <ArrowDownToLine className="w-3.5 h-3.5 text-[#d21f27]" />
                <span>{downloading === "clients" ? generatingLabel : language === "fr" ? "Télécharger le CSV des Clients" : "Download Clients CSV"}</span>
              </>
            )}
          </button>
        </div>

        {/* Card 4: Revenue & Financial Accounting */}
        <div className="p-5 space-y-4 hover:bg-slate-50/40 transition">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0B2545] text-white flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  {language === "fr" ? "Vérification du Revenu Financier et Tarifaire" : "Financial & Tariff Revenue Audit"}
                </h4>
                <p className="text-[11px] text-slate-500">
                  {language === "fr"
                    ? "Numéro de suivi, tarif de transport, droits de douane ASFC, taxes TPS/TVH, frais de courtage et totaux."
                    : "Tracking ID, quoted linehaul, CBSA duties, GST/HST taxes, brokerage fees, and totals."}
                </p>
              </div>
            </div>
          </div>

          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-0.5">
            <div>
              &bull;{" "}
              {language === "fr" ? (
                <>Inclut les <strong>ajustements de droits ASFC et taxes</strong></>
              ) : (
                <>Includes <strong>CBSA duty adjustments & taxes</strong></>
              )}
            </div>
            <div>
              &bull;{" "}
              {language === "fr"
                ? "Fret de transport détaillé et surtaxes de carburant"
                : "Itemized linehaul freight + fuel surcharges"}
            </div>
          </div>

          <button
            type="button"
            disabled={downloading === "revenue"}
            onClick={() => handleDownload("revenue")}
            className="w-full py-2 bg-[#0B2545] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
          >
            {downloadSuccess === "revenue" ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{downloadedLabel}</span>
              </>
            ) : (
              <>
                <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-400" />
                <span>{downloading === "revenue" ? generatingLabel : language === "fr" ? "Télécharger le CSV Financier" : "Download Financial CSV"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

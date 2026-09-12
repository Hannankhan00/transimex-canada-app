"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { serializeToCsv } from "@/lib/csvExport";
import {
  Truck,
  Search,
  MapPin,
  Download,
  PackageOpen,
  AlertTriangle,
  ShieldAlert,
  CreditCard,
  Phone,
  Building2,
  X,
  CheckCircle2,
  Copy,
} from "lucide-react";

interface ShipmentListItem {
  id: string;
  origin: string;
  destination: string;
  equipment: string;
  driver: string;
  status: string;
  statusLabel: string;
  date: string;
  eta: string;
  progress: number;
  customsStatus?: string;
  portOfEntry?: string;
  cbsaPars?: string;
  duties?: {
    amountCad?: string;
    taxGstHst?: string;
    brokerageFeeCad?: string;
    totalOwed?: string;
    status?: string;
    dispatchedAt?: string;
  };
}

function ShipmentsContent() {
  const { t, language } = useLanguage();
  const searchParams = useSearchParams();
  const paramId = searchParams.get("id") || "";

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState(paramId);
  const [shipments, setShipments] = useState<ShipmentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPaymentShipment, setSelectedPaymentShipment] = useState<ShipmentListItem | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (paramId) {
      setSearch(paramId);
    }
  }, [paramId]);

  useEffect(() => {
    fetch("/api/shipments")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setShipments(data.shipments);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const customsHoldShipments = shipments.filter(
    (s) =>
      (s.status === "customs" || s.customsStatus === "Held") &&
      s.duties?.status === "Notice Dispatched"
  );

  const filteredShipments = shipments.filter((s) => {
    if (filter !== "all" && s.status !== filter) return false;
    if (
      search &&
      !s.id.toLowerCase().includes(search.toLowerCase()) &&
      !s.destination.toLowerCase().includes(search.toLowerCase()) &&
      !s.origin.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleExportManifest = () => {
    const rows = filteredShipments.map((s) => ({
      id: s.id,
      status: s.statusLabel,
      origin: s.origin,
      destination: s.destination,
      equipment: s.equipment,
      driver: s.driver,
      date: s.date,
      eta: s.eta,
      progress: `${s.progress}%`,
    }));
    const csv = serializeToCsv(rows, [
      { key: "id", label: "Shipment ID" },
      { key: "status", label: "Status" },
      { key: "origin", label: "Origin" },
      { key: "destination", label: "Destination" },
      { key: "equipment", label: "Equipment" },
      { key: "driver", label: "Driver" },
      { key: "date", label: "Date" },
      { key: "eta", label: "ETA" },
      { key: "progress", label: "Progress" },
    ]);
    if (!csv) return;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transimex-shipments-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#d21f27]">
            {language === "fr" ? "Gestion de Fret" : "Freight Manifests"}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B2545] tracking-tight leading-tight mt-1">
            {t.nav.shipments}
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            {language === "fr"
              ? "Suivi télématique par satellite GPS, dédouanement et connaissements en direct."
              : "Live GPS telematics tracking, customs clearance, and digital Bill of Lading (BOL)."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportManifest}
            disabled={filteredShipments.length === 0}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>{language === "fr" ? "Exporter Manifeste" : "Export Manifest"}</span>
          </button>
        </div>
      </div>

      {/* Page-level Alert: Customs Hold & Duties Owed */}
      {customsHoldShipments.length > 0 && (
        <div className="bg-red-50 border border-[#d21f27] rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#d21f27] text-white flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-[#d21f27] text-white text-[10px] font-bold uppercase tracking-wider">
                  {language === "fr" ? "Action Requise — Dédouanement" : "Action Required — Customs Hold"}
                </span>
                <span className="text-xs font-bold text-slate-700">
                  {customsHoldShipments.length}{" "}
                  {language === "fr"
                    ? "envoi(s) sous retenue douanière en attente de paiement"
                    : "shipment(s) on customs hold pending duties settlement"}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-relaxed">
                {language === "fr"
                  ? "Les autorités douanières ont évalué des droits d'importation et taxes sur votre marchandise. Le règlement immédiat des droits auprès de Transimex est nécessaire pour autoriser la mainlevée officielle au port d'entrée."
                  : "Customs authorities have assessed statutory import tariffs and regulatory fees on your cargo. Prompt payment remittance is required to authorize port cargo release."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={language === "fr" ? "Rechercher TMX-#, ville, connaissement..." : "Search TMX-#, city, BOL..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {[
            { id: "all", label: language === "fr" ? "Tous" : "All" },
            { id: "in_transit", label: language === "fr" ? "En Transit" : "In Transit" },
            {
              id: "customs",
              label:
                customsHoldShipments.length > 0
                  ? language === "fr"
                    ? `Douanes (${customsHoldShipments.length})`
                    : `Customs Hold (${customsHoldShipments.length})`
                  : language === "fr"
                  ? "Douanes"
                  : "Customs Hold",
            },
            { id: "delivered", label: language === "fr" ? "Livrées" : "Delivered" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                filter === tab.id
                  ? tab.id === "customs" && customsHoldShipments.length > 0
                    ? "bg-[#d21f27] text-white shadow-xs"
                    : "bg-[#0B2545] text-white shadow-xs"
                  : tab.id === "customs" && customsHoldShipments.length > 0
                  ? "text-[#d21f27] bg-red-50 hover:bg-red-100 font-extrabold"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Shipments List */}
      <div className="space-y-4">
        {filteredShipments.map((shipment) => {
          const hasDutiesNotice =
            (shipment.status === "customs" || shipment.customsStatus === "Held") &&
            shipment.duties?.status === "Notice Dispatched";
          const isTargetParam = paramId && shipment.id.toLowerCase() === paramId.toLowerCase();

          return (
            <div
              key={shipment.id}
              id={`shipment-${shipment.id}`}
              className={`bg-white rounded-2xl p-5 border transition flex flex-col justify-between gap-4 ${
                hasDutiesNotice
                  ? "border-[#d21f27] bg-red-50/20 shadow-xs"
                  : isTargetParam
                  ? "border-2 border-[#0B2545] shadow-md ring-2 ring-[#0B2545]/20"
                  : "border-slate-200 shadow-xs hover:shadow-md"
              }`}
            >
              {/* RED ALERT BANNER: Payment is required to release cargo */}
              {hasDutiesNotice && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-red-200/60 pb-2.5">
                    <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#d21f27]">
                      <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 text-[#d21f27]" />
                      <span>
                        {language === "fr"
                          ? `Les droits de douane de ${shipment.duties?.totalOwed || shipment.duties?.amountCad || "paiement requis"} sont requis. Veuillez contacter l'équipe Transimex.`
                          : `Customs duties of ${shipment.duties?.totalOwed || shipment.duties?.amountCad || "payment required"} are required. Please contact the Transimex team.`}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-mono font-bold self-start sm:self-auto border border-red-200">
                      {language === "fr" ? "RETENUE DOUANIÈRE EN ATTENTE" : "PAYMENT REQUIRED FOR RELEASE"}
                    </span>
                  </div>

                  {/* Duties breakdown tiles */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div className="p-2.5 bg-white rounded-lg border border-red-100">
                      <span className="text-slate-400 block text-[10px] font-semibold">
                        {language === "fr" ? "Droits Tarifaires" : "Tariff Duties"}
                      </span>
                      <span className="font-bold text-slate-900">
                        {shipment.duties?.amountCad || "—"}
                      </span>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-red-100">
                      <span className="text-slate-400 block text-[10px] font-semibold">
                        {language === "fr" ? "TPS / TVH (Taxes)" : "GST / HST (Taxes)"}
                      </span>
                      <span className="font-bold text-slate-900">
                        {shipment.duties?.taxGstHst || "—"}
                      </span>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-red-100">
                      <span className="text-slate-400 block text-[10px] font-semibold">
                        {language === "fr" ? "Frais de Dossier" : "Filing Fee"}
                      </span>
                      <span className="font-bold text-slate-900">
                        {shipment.duties?.brokerageFeeCad || "—"}
                      </span>
                    </div>
                    <div className="p-2.5 bg-red-100/70 rounded-lg border border-red-200">
                      <span className="text-red-700 block text-[10px] font-bold">
                        {language === "fr" ? "Total à Régler" : "Total Owed"}
                      </span>
                      <span className="font-mono font-extrabold text-[#d21f27] text-xs sm:text-sm">
                        {shipment.duties?.totalOwed || shipment.duties?.amountCad || "—"}
                      </span>
                    </div>
                  </div>

                  {/* Port & CBSA info */}
                  {shipment.portOfEntry && (
                    <div className="text-[11px] text-slate-600 flex items-center gap-1.5 pt-0.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-[#d21f27]" />
                      <span>
                        <strong>{language === "fr" ? "Poste frontalier / Port:" : "Port of Entry:"}</strong> {shipment.portOfEntry}
                        {shipment.cbsaPars && ` • CBSA PARS: ${shipment.cbsaPars}`}
                      </span>
                    </div>
                  )}

                  {/* Actions to settle / contact */}
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentShipment(shipment)}
                      className="px-3.5 py-1.5 bg-[#d21f27] hover:bg-[#b51a21] text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>{language === "fr" ? "Instructions de Paiement" : "Payment Instructions"}</span>
                    </button>
                    <Link
                      href="/dashboard/support"
                      className="px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span>{language === "fr" ? "Contacter l'Équipe Transimex" : "Contact Transimex Team"}</span>
                    </Link>
                  </div>
                </div>
              )}

              {/* Main Shipment Details Bar */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left: ID & Route */}
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <span className="text-sm font-bold text-[#0B2545] font-mono">{shipment.id}</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        hasDutiesNotice
                          ? "bg-red-600 text-white shadow-xs"
                          : shipment.status === "in_transit"
                          ? "bg-blue-100 text-blue-800"
                          : shipment.status === "customs"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {hasDutiesNotice
                        ? language === "fr"
                          ? "Retenue Douanière — Paiement Requis"
                          : "Customs Hold — Duties Required"
                        : shipment.statusLabel}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-xs text-slate-700">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <MapPin className="w-3.5 h-3.5 text-[#d21f27]" />
                      <span>{shipment.origin}</span>
                      <span className="text-slate-400">→</span>
                      <span className="text-slate-900">{shipment.destination}</span>
                    </div>
                    <div className="text-slate-500 flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-slate-400" />
                      <span>{shipment.equipment}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full max-w-md pt-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span>
                        {language === "fr" ? "Progression du Transit" : "Transit Progress"} ({shipment.progress}%)
                      </span>
                      <span>ETA: {shipment.eta}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          hasDutiesNotice
                            ? "bg-[#d21f27]"
                            : shipment.status === "delivered"
                            ? "bg-emerald-500"
                            : "bg-[#0B2545]"
                        }`}
                        style={{ width: `${shipment.progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Right: Driver Info */}
                <div className="flex items-center justify-between lg:justify-end gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                  <div className="text-left sm:text-right text-xs">
                    <div className="font-semibold text-slate-900">{shipment.driver}</div>
                    <div className="text-[11px] text-slate-400">{shipment.date}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {!loading && filteredShipments.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
            <PackageOpen className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">
              {language === "fr" ? "Aucune expédition trouvée" : "No Shipments Found"}
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {shipments.length === 0
                ? language === "fr"
                  ? "Vos expéditions apparaîtront ici une fois une soumission acceptée."
                  : "Your shipments will appear here once a freight quote is accepted."
                : language === "fr"
                ? "Aucune expédition ne correspond à vos filtres."
                : "No shipments match your current filter or search."}
            </p>
          </div>
        )}
      </div>

      {/* Payment Instructions Modal */}
      {selectedPaymentShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 text-[#d21f27] flex items-center justify-center flex-shrink-0 font-bold">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[#0B2545] text-base">
                    {language === "fr" ? "Règlement des Droits de Douane" : "Customs Duties Settlement"}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono font-bold">
                    #{selectedPaymentShipment.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPaymentShipment(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Total Required Card */}
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center space-y-1">
              <span className="text-[10px] text-red-700 font-bold uppercase tracking-wider">
                {language === "fr" ? "Montant Total Exigé pour Mainlevée" : "Total Amount Required for Port Release"}
              </span>
              <p className="text-2xl font-mono font-black text-[#d21f27]">
                {selectedPaymentShipment.duties?.totalOwed || selectedPaymentShipment.duties?.amountCad || "$0.00 CAD"}
              </p>
              <div className="text-[11px] text-slate-600 flex items-center justify-center gap-3 pt-1">
                <span>
                  {language === "fr" ? "Droits" : "Duties"}: {selectedPaymentShipment.duties?.amountCad || "—"}
                </span>
                <span>•</span>
                <span>
                  {language === "fr" ? "TPS/TVH" : "GST/HST"}: {selectedPaymentShipment.duties?.taxGstHst || "—"}
                </span>
                <span>•</span>
                <span>
                  {language === "fr" ? "Dossier" : "Filing"}: {selectedPaymentShipment.duties?.brokerageFeeCad || "—"}
                </span>
              </div>
            </div>

            {/* Remittance Banking Instructions */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold text-slate-800">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-[#0B2545]" />
                  <span>{language === "fr" ? "Coordonnées de Virement (EFT / Wire)" : "Electronic Funds Transfer (EFT / Wire)"}</span>
                </span>
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded">
                  {language === "fr" ? "Virement CAD Direct" : "CAD Direct Wire"}
                </span>
              </div>

              <div className="space-y-1.5 text-[11px] text-slate-700 pt-1 font-mono">
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-sans">{language === "fr" ? "Bénéficiaire:" : "Beneficiary:"}</span>
                  <span className="font-bold text-slate-900">Transimex Canada Inc.</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-sans">{language === "fr" ? "Institution bancaire:" : "Bank:"}</span>
                  <span className="font-bold text-slate-900">Royal Bank of Canada (RBC)</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-sans">{language === "fr" ? "Numéro de transit / compte:" : "Transit / Account:"}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-900">00012 - 1048892</span>
                    <button
                      type="button"
                      onClick={() => handleCopy("00012-1048892", "account")}
                      className="text-slate-400 hover:text-slate-700 cursor-pointer"
                      title="Copy"
                    >
                      {copiedField === "account" ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-sans">SWIFT / BIC:</span>
                  <span className="font-bold text-slate-900">ROYCCAT2</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 font-sans">{language === "fr" ? "Référence requise:" : "Required Wire Reference:"}</span>
                  <span className="font-bold text-[#d21f27]">DUTIES-{selectedPaymentShipment.id}</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              {language === "fr"
                ? "Dès réception de la preuve de virement par notre équipe aux douanes, la mainlevée CBSA/CBP est transmise électroniquement dans un délai de 1 à 2 heures."
                : "Upon remittance confirmation or receipt of payment slip, CBSA/CBP electronic release authorization is issued within 1-2 hours."}
            </p>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Link
                href="/dashboard/support"
                className="px-4 py-2 bg-[#0B2545] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{language === "fr" ? "Contacter le Support Douanes" : "Contact Brokerage Support"}</span>
              </Link>
              <button
                type="button"
                onClick={() => setSelectedPaymentShipment(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                {language === "fr" ? "Fermer" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ShipmentsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Freight Manifests...</div>}>
      <ShipmentsContent />
    </Suspense>
  );
}

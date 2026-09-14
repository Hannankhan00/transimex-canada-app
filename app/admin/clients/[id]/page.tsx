"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { ClientProfile, ClientAccountStatus } from "@/lib/clientTypes";
import { VaultDocument } from "@/lib/documentTypes";
import PermissionGuard from "@/components/admin/PermissionGuard";
import {
  ArrowLeft,
  Building2,
  Truck,
  FileText,
  MessageSquare,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Download,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  TrendingUp,
  Radio,
} from "lucide-react";

function ClientInspectorPageInner() {
  const params = useParams();
  const { language } = useLanguage();
  const clientId = params?.id as string;

  const [client, setClient] = useState<ClientProfile | null>(null);
  const [dossier, setDossier] = useState<{
    shipments: any[];
    quotes: any[];
    documents: VaultDocument[];
    tickets: any[];
    metrics: any;
  }>({
    shipments: [],
    quotes: [],
    documents: [],
    tickets: [],
    metrics: {},
  });

  const [activeTab, setActiveTab] = useState<
    "overview" | "shipments" | "quotes" | "documents" | "tickets"
  >("overview");
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastIsError, setToastIsError] = useState(false);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);

  const fetchClientDossier = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/clients/${encodeURIComponent(clientId)}`);
      const data = await res.json();
      if (res.ok && data.client) {
        setClient(data.client);
        if (data.dossier) {
          setDossier(data.dossier);
        }
      }
    } catch (err) {
      console.error("Error loading client dossier:", err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchClientDossier();
  }, [fetchClientDossier]);

  const handleToggleStatus = async () => {
    if (!client) return;
    const newStatus: ClientAccountStatus =
      client.status === "Active" ? "Deactivated" : "Active";
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/admin/clients/${encodeURIComponent(client.id)}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");

      setClient((prev) => (prev ? { ...prev, status: newStatus } : null));
      setToastIsError(false);
      setToastMsg(
        language === "fr"
          ? `Accès client modifié avec succès à ${newStatus === "Active" ? "ACTIF" : "DÉSACTIVÉ"}`
          : `Client access successfully changed to ${newStatus.toUpperCase()}`
      );
      setTimeout(() => setToastMsg(null), 3500);
    } catch (err: any) {
      alert(err.message || "Failed to toggle status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!client) return;
    setResettingPassword(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: client.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send password reset email");

      setToastIsError(false);
      setToastMsg(
        language === "fr"
          ? `Lien de récupération envoyé à ${client.email}`
          : `Recovery credentials link dispatched to ${client.email}`
      );
    } catch (err: any) {
      setToastIsError(true);
      setToastMsg(
        err.message ||
          (language === "fr"
            ? "Échec de l'envoi du lien de récupération."
            : "Failed to send the recovery link.")
      );
    } finally {
      setResettingPassword(false);
      setTimeout(() => setToastMsg(null), 3500);
    }
  };

  const handleDownloadDoc = (doc: VaultDocument) => {
    setDownloadingDocId(doc.id);
    window.open(
      `/api/admin/shipments/${encodeURIComponent(doc.shipmentId)}/documents/${encodeURIComponent(doc.id)}/file`,
      "_blank"
    );
    setTimeout(() => setDownloadingDocId(null), 500);
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 text-sm">
        {language === "fr" ? "Chargement du Dossier Client 360°..." : "Loading Client 360° Dossier..."}
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-12 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
        <h3 className="font-bold text-slate-900 text-lg">
          {language === "fr" ? "Profil Client Introuvable" : "Client Profile Not Found"}
        </h3>
        <p className="text-xs text-slate-500">
          {language === "fr"
            ? "L'identifiant client demandé n'existe pas dans le répertoire."
            : "The requested client ID does not exist in the directory."}
        </p>
        <Link
          href="/admin/clients"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0B2545] text-white text-xs font-bold rounded-xl"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{language === "fr" ? "Retour au Répertoire des Clients" : "Return to Clients Directory"}</span>
        </Link>
      </div>
    );
  }

  const isActive = client.status === "Active";

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 1. BREADCRUMBS & TOP ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <Link
              href="/admin/clients"
              className="hover:text-[#0B2545] flex items-center gap-1 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{language === "fr" ? "Répertoire des Clients" : "Clients Directory"}</span>
            </Link>
            <span>&bull;</span>
            <span className="font-mono text-[#d21f27] font-bold">{client.id}</span>
            <span>&bull;</span>
            <span className="text-slate-800">{language === "fr" ? "Inspecteur 360°" : "360° Inspector"}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0B2545] tracking-tight leading-tight">
              {client.companyName}
            </h1>

            {isActive ? (
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 text-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{language === "fr" ? "Accès Portail Actif" : "Active Portal Access"}</span>
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 font-bold border border-slate-300 text-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span>{language === "fr" ? "Compte Désactivé" : "Deactivated Account"}</span>
              </span>
            )}

            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
              {client.industry}
            </span>
          </div>

          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            {language === "fr" ? "Contact Principal :" : "Primary Contact:"}{" "}
            <strong className="text-slate-800">{client.primaryContact}</strong> (
            {client.contactTitle || (language === "fr" ? "Représentant" : "Representative")}) &bull; {client.email}
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleToggleStatus}
            disabled={updatingStatus}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              isActive
                ? "bg-white text-red-700 border border-red-200 hover:bg-red-50"
                : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
            }`}
          >
            {isActive ? (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                <span>{language === "fr" ? "Désactiver l'Accès" : "Deactivate Access"}</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-white" />
                <span>{language === "fr" ? "Autoriser le Portail" : "Authorize Portal"}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {toastMsg && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150 ${
            toastIsError
              ? "bg-red-50 border border-red-200 text-red-800"
              : "bg-emerald-50 border border-emerald-200 text-emerald-800"
          }`}
        >
          {toastIsError ? (
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          )}
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 2. DOSSIER METRIC COUNTER TILES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            {language === "fr" ? "Revenu Logistique à Vie" : "Lifetime Logistics Revenue"}
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-[#0B2545]">
              {client.lifetimeRevenueCad}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {language === "fr" ? "Contrats de fret payés et tarifs transfrontaliers" : "Paid freight contracts & cross-border tariffs"}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            {language === "fr" ? "Chargements de Fret Complétés" : "Completed Freight Loads"}
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#0B2545]">
              {dossier.metrics?.totalShipmentsCompleted ?? client.totalShipmentsCompleted}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {language === "fr" ? "Manifestes routiers, intermodaux et maritimes" : "Road, intermodal, and marine manifests"}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            {language === "fr" ? "Soumissions en Pipeline" : "Quotes in Pipeline"}
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#0B2545]">
              {dossier.metrics?.activeQuotesCount ?? client.activeQuotesCount}
            </span>
            <span className="text-xs font-semibold text-blue-600">
              {language === "fr" ? "Évaluations Tarifaires" : "Rate Assessments"}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {language === "fr" ? "Demandes de prix soumises par le client" : "Pricing requests submitted by client"}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            {language === "fr" ? "Demandes Client" : "Customer Inquiries"}
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#0B2545]">
              {dossier.tickets?.length || 0}
            </span>
            <span className="text-xs font-semibold text-slate-500">{language === "fr" ? "Consignées" : "Logged"}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {dossier.metrics?.openTicketsCount || 0}{" "}
            {language === "fr" ? "demandes de répartition ouvertes" : "open dispatch inquiries"}
          </p>
        </div>
      </div>

      {/* 3. DOSSIER TABS */}
      <div className="border-b border-slate-200 flex items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2.5 text-xs font-bold transition border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === "overview"
              ? "border-[#d21f27] text-[#0B2545]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>{language === "fr" ? "Aperçu Corporatif" : "Corporate Overview"}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("shipments")}
          className={`px-4 py-2.5 text-xs font-bold transition border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === "shipments"
              ? "border-[#d21f27] text-[#0B2545]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>{language === "fr" ? "Historique des Expéditions" : "Shipment History"} ({dossier.shipments.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("quotes")}
          className={`px-4 py-2.5 text-xs font-bold transition border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === "quotes"
              ? "border-[#d21f27] text-[#0B2545]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>{language === "fr" ? "Pipeline de Soumissions" : "Quote Pipeline"} ({dossier.quotes.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("documents")}
          className={`px-4 py-2.5 text-xs font-bold transition border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === "documents"
              ? "border-[#d21f27] text-[#0B2545]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{language === "fr" ? "Coffre de Documents" : "Document Vault"} ({dossier.documents.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("tickets")}
          className={`px-4 py-2.5 text-xs font-bold transition border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === "tickets"
              ? "border-[#d21f27] text-[#0B2545]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>{language === "fr" ? "Demandes de Support" : "Support Inquiries"} ({dossier.tickets.length})</span>
        </button>
      </div>

      {/* 4. TAB CONTENTS */}

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Company Details */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-5 text-xs">
            <h3 className="font-bold text-[#0B2545] text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#d21f27]" />
              <span>{language === "fr" ? "Profil Corporatif et Coordonnées de Facturation" : "Corporate Profile & Billing Coordinates"}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  {language === "fr" ? "Nom de l'Entité Légale" : "Legal Entity Name"}
                </span>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{client.companyName}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  {language === "fr" ? "Secteur d'Industrie" : "Industry Sector"}
                </span>
                <p className="font-semibold text-slate-800 mt-0.5">{client.industry}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  {language === "fr" ? "Numéro de Taxe / TPS" : "Corporate Tax / GST Number"}
                </span>
                <p className="font-mono font-bold text-slate-800 mt-0.5">{client.taxId || "—"}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  {language === "fr" ? "Conditions de Crédit et de Paiement" : "Credit & Payment Terms"}
                </span>
                <p className="font-bold text-emerald-800 mt-0.5">{client.paymentTerms}</p>
              </div>

              <div className="sm:col-span-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  {language === "fr" ? "Siège Social / Adresse de Facturation" : "Headquarters / Billing Address"}
                </span>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {client.billingAddress}, {client.city}, {client.province} {client.postalCode}, {client.country}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  {language === "fr" ? "Contact de Répartition Principal" : "Primary Dispatch Contact"}
                </span>
                <p className="font-bold text-slate-900 mt-0.5">{client.primaryContact}</p>
                <p className="text-slate-500 text-[11px]">{client.contactTitle}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  {language === "fr" ? "Chargé de Compte Transimex Dédié" : "Dedicated Transimex Account Lead"}
                </span>
                <p className="font-bold text-[#0B2545] mt-0.5">{client.accountManager || "—"}</p>
                <p className="text-slate-500 text-[11px]">
                  {language === "fr" ? "Opérations Commerciales Transimex" : "Transimex Commercial Operations"}
                </p>
              </div>
            </div>

            {/* Internal Staff Notes */}
            <div className="pt-3 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                {language === "fr" ? "Notes Internes du Compte et Préférences d'Acheminement" : "Internal Account Notes & Routing Preferences"}
              </span>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 leading-relaxed">
                {client.notes ||
                  (language === "fr"
                    ? "Aucune instruction de manutention spéciale précisée pour ce compte."
                    : "No special handling instructions specified for this account.")}
              </div>
            </div>
          </div>

          {/* Account Security & Fast Actions */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4 text-xs">
              <h3 className="font-bold text-[#0B2545] text-sm border-b border-slate-100 pb-2 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>{language === "fr" ? "Contrôle d'Accès au Portail" : "Portal Access Gatekeeper"}</span>
              </h3>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">
                    {language === "fr" ? "Autorisation du Compte :" : "Account Authorization:"}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isActive ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                    }`}
                  >
                    {client.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {isActive
                    ? language === "fr"
                      ? "L'expéditeur a un accès complet pour réserver du fret, suivre les étapes d'expédition et télécharger les documents douaniers vérifiés."
                      : "Shipper has full access to book freight, track shipment milestones, and download verified customs paperwork."
                    : language === "fr"
                    ? "L'accès est suspendu. L'expéditeur ne peut pas s'authentifier ni soumettre de nouvelles demandes."
                    : "Access is suspended. Shipper cannot authenticate or submit new requests."}
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleToggleStatus}
                  disabled={updatingStatus}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition cursor-pointer text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>
                    {language === "fr" ? "Basculer l'Accès" : "Toggle Access"} (
                    {isActive
                      ? language === "fr"
                        ? "Désactiver"
                        : "Deactivate"
                      : language === "fr"
                      ? "Activer"
                      : "Activate"}
                    )
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handlePasswordReset}
                  disabled={resettingPassword}
                  className="w-full py-2 bg-[#0B2545] hover:bg-slate-800 text-white font-bold rounded-xl transition cursor-pointer text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <KeyRound className="w-3.5 h-3.5 text-[#d21f27]" />
                  <span>
                    {resettingPassword
                      ? language === "fr"
                        ? "Envoi..."
                        : "Sending..."
                      : language === "fr"
                      ? "Envoyer le Lien de Réinitialisation"
                      : "Send Password Reset Link"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SHIPMENT HISTORY */}
      {activeTab === "shipments" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4">{language === "fr" ? "N° de Suivi" : "Tracking ID"}</th>
                  <th className="py-3.5 px-4">{language === "fr" ? "Corridor d'Itinéraire" : "Route Corridor"}</th>
                  <th className="py-3.5 px-4">{language === "fr" ? "Équipement et Cargaison" : "Equipment & Cargo"}</th>
                  <th className="py-3.5 px-4">{language === "fr" ? "Statut Douanier" : "Customs Status"}</th>
                  <th className="py-3.5 px-4">{language === "fr" ? "Tarif (CAD)" : "Rate (CAD)"}</th>
                  <th className="py-3.5 px-4">{language === "fr" ? "Transporteur" : "Carrier"}</th>
                  <th className="py-3.5 px-4 text-right">{language === "fr" ? "Action" : "Action"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {dossier.shipments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      {language === "fr" ? "Aucune expédition trouvée pour ce client." : "No shipments found for this client."}
                    </td>
                  </tr>
                ) : (
                  dossier.shipments.map((s: any) => (
                    <tr key={s.trackingNumber || s.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#0B2545]">
                        {s.trackingNumber || s.id}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {s.route?.origin} &rarr; {s.route?.destination}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-semibold text-slate-900 block">
                          {s.cargo?.equipment || "53' Dry Van"}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {s.cargo?.commodity || "General Cargo"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            s.customsStatus === "Held"
                              ? "bg-red-50 text-[#d21f27] border border-red-200"
                              : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          }`}
                        >
                          {s.customsStatus || s.status || "Released"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        {s.rateCad || (language === "fr" ? "En Attente" : "Pending")}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                        {s.assignedCarrier || (language === "fr" ? "Non Assigné" : "Unassigned")}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/admin/shipments/${encodeURIComponent(s.trackingNumber || s.id)}/customs`}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-[#0B2545] hover:text-white text-[#0B2545] font-bold text-[11px] transition inline-flex items-center gap-1"
                        >
                          <span>{language === "fr" ? "Douanes" : "Customs"}</span>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: QUOTE PIPELINE */}
      {activeTab === "quotes" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4">{language === "fr" ? "Réf. Soumission" : "Quote Ref"}</th>
                  <th className="py-3.5 px-4">{language === "fr" ? "Corridor" : "Corridor"}</th>
                  <th className="py-3.5 px-4">{language === "fr" ? "Équipement" : "Equipment"}</th>
                  <th className="py-3.5 px-4">{language === "fr" ? "Date de Soumission" : "Submitted Date"}</th>
                  <th className="py-3.5 px-4">{language === "fr" ? "Tarif Soumis" : "Quoted Tariff"}</th>
                  <th className="py-3.5 px-4">{language === "fr" ? "Statut du Pipeline" : "Pipeline Status"}</th>
                  <th className="py-3.5 px-4 text-right">{language === "fr" ? "Expédition Liée" : "Linked Shipment"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {dossier.quotes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      {language === "fr" ? "Aucune soumission de fret demandée par ce client pour le moment." : "No freight quotes requested by this client yet."}
                    </td>
                  </tr>
                ) : (
                  dossier.quotes.map((q: any) => (
                    <tr key={q.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#0B2545]">
                        {q.id}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {q.origin} &rarr; {q.destination}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-800">
                        {q.equipment}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500">
                        {q.submittedDate}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {q.priceCad || (language === "fr" ? "En Attente" : "Pending")}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {q.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-right font-bold text-[#d21f27]">
                        {q.shipmentId || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: DOCUMENT VAULT */}
      {activeTab === "documents" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4">{language === "fr" ? "Nom du Document" : "Document Name"}</th>
                  <th className="py-3.5 px-4">{language === "fr" ? "Type" : "Type"}</th>
                  <th className="py-3.5 px-4">{language === "fr" ? "Manifeste d'Expédition" : "Shipment Manifest"}</th>
                  <th className="py-3.5 px-4">{language === "fr" ? "Date de Téléversement" : "Upload Date"}</th>
                  <th className="py-3.5 px-4">{language === "fr" ? "Visibilité" : "Visibility"}</th>
                  <th className="py-3.5 px-4 text-right">{language === "fr" ? "Téléchargement" : "Download"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {dossier.documents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      {language === "fr"
                        ? "Aucun document lié aux expéditions de ce client."
                        : "No documents linked to this client's shipments."}
                    </td>
                  </tr>
                ) : (
                  dossier.documents.map((doc: VaultDocument) => (
                    <tr key={doc.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-semibold text-slate-900 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="truncate max-w-xs">{doc.name}</span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                          {doc.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        {doc.shipmentId}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {doc.dateUploaded}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {doc.isClientVisible ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-[10px] border border-emerald-200">
                            {language === "fr" ? "Public dans le Portail" : "Public in Portal"}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] border border-slate-200">
                            {language === "fr" ? "Interne Uniquement" : "Internal Only"}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDownloadDoc(doc)}
                          disabled={downloadingDocId === doc.id}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: SUPPORT TICKETS */}
      {activeTab === "tickets" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-[#0B2545] text-sm">
              {language === "fr" ? "Historique des Demandes et du Support Client" : "Customer Inquiry & Support History"}
            </h3>
            <span className="text-[11px] text-slate-500">
              {dossier.tickets.length} {language === "fr" ? "Demandes Consignées" : "Inquiries Logged"}
            </span>
          </div>

          <div className="space-y-3">
            {dossier.tickets.map((t: any) => (
              <div
                key={t.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#0B2545]">{t.id}</span>
                    <span className="font-bold text-slate-800 text-xs">{t.subject}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        t.status === "Resolved"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {t.status}
                    </span>
                    <span className="text-[11px] text-slate-400">{t.date}</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-600">{t.lastMessage}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClientInspectorPage() {
  return (
    <PermissionGuard module="clients">
      <ClientInspectorPageInner />
    </PermissionGuard>
  );
}

"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  CustomsClearanceStatus,
  CustomsComplianceRecord,
  getCustomsRecordForShipment,
  getStoredDocuments,
  VaultDocument,
} from "@/lib/mockData";
import CustomsStatusBadge from "@/components/admin/customs/CustomsStatusBadge";
import DutiesAlertModal from "@/components/admin/customs/DutiesAlertModal";
import CloudinaryUploader from "@/components/admin/customs/CloudinaryUploader";
import DocumentVisibilityToggle from "@/components/admin/customs/DocumentVisibilityToggle";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Truck,
  MapPin,
  Calendar,
  DollarSign,
  Send,
  Building2,
  FileText,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  Lock,
  Save,
  CheckCircle2,
  Barcode,
} from "lucide-react";

const STANDARD_BROKERS = [
  "Transimex In-House Customs Gateway",
  "Livingston International Brokerage",
  "FedEx Trade Networks Transport & Brokerage",
  "Cole International Customs Brokers",
  "A.N. Deringer Customs Brokerage",
  "Farrow Canadian Brokerage Logistics",
];

const STANDARD_PORTS = [
  "Ambassador Bridge (Windsor / Detroit)",
  "Lacolle / Champlain Crossing (QC / NY)",
  "Dorval Customs Terminal (QC)",
  "Montreal Port Berth 42 (QC)",
  "Blue Water Bridge (Sarnia / Port Huron)",
  "Pacific Highway Border (Surrey / Blaine BC)",
  "Emerson / Pembina Crossing (MB / ND)",
];

export default function ShipmentCustomsCompliancePage() {
  const params = useParams();
  const router = useRouter();
  const { language } = useLanguage();

  const shipmentId = (params?.id as string) || "TMX-00839";

  // State
  const [customsRecord, setCustomsRecord] = useState<CustomsComplianceRecord | null>(null);
  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [status, setStatus] = useState<CustomsClearanceStatus>("Pending");
  const [broker, setBroker] = useState("");
  const [portOfEntry, setPortOfEntry] = useState("");
  const [cbsaPars, setCbsaPars] = useState("");
  const [cbsaNotes, setCbsaNotes] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDutiesModalOpen, setIsDutiesModalOpen] = useState(false);

  // Client info for duties notifications
  const clientInfo = {
    name: "Marc Tremblay",
    companyName: "Laurentian Global Logistics Ltd.",
    email: "dispatch@laurentianglobal.ca",
  };

  // Load record and documents
  const loadData = useCallback(() => {
    const record = getCustomsRecordForShipment(shipmentId);
    setCustomsRecord(record);
    setStatus(record.status);
    setBroker(record.broker);
    setPortOfEntry(record.portOfEntry);
    setCbsaPars(record.cbsaPars);
    setCbsaNotes(record.cbsaNotes);

    // Load documents linked to this shipment
    const allDocs = getStoredDocuments();
    const linked = allDocs.filter(
      (d) => d.shipmentId.toLowerCase() === shipmentId.toLowerCase()
    );
    setDocuments(linked);
  }, [shipmentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Customs Status Switch (Pending, In Review, Released, Held)
  const handleStatusChange = async (newStatus: CustomsClearanceStatus) => {
    setStatus(newStatus);
    setSaveError(null);
    try {
      const res = await fetch(`/api/admin/shipments/${encodeURIComponent(shipmentId)}/customs`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          broker,
          portOfEntry,
          cbsaPars,
          cbsaNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update clearance status");
      }

      setCustomsRecord((prev) => (prev ? { ...prev, status: newStatus } : null));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err: any) {
      setSaveError(err.message || "Failed to switch status");
    }
  };

  // Handle Save Broker & Port Notes
  const handleSaveComplianceRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/admin/shipments/${encodeURIComponent(shipmentId)}/customs`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          broker,
          portOfEntry,
          cbsaPars,
          cbsaNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save customs compliance details");
      }

      setCustomsRecord((prev) =>
        prev
          ? {
              ...prev,
              broker,
              portOfEntry,
              cbsaPars,
              cbsaNotes,
              status,
            }
          : null
      );

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      setSaveError(err.message || "Failed to save compliance record");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Document Uploaded
  const handleDocumentUploaded = (newDoc: VaultDocument) => {
    setDocuments((prev) => [newDoc, ...prev]);
  };

  // Handle Visibility Toggled
  const handleVisibilityToggled = (docId: string, newVisibility: boolean) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, isClientVisible: newVisibility } : d))
    );
  };

  // Handle Duties Dispatched
  const handleNoticeDispatched = (dutiesData: any) => {
    setCustomsRecord((prev) =>
      prev
        ? {
            ...prev,
            duties: dutiesData,
            status: prev.status === "Released" ? "Released" : "Held",
          }
        : null
    );
    setStatus((prev) => (prev === "Released" ? "Released" : "Held"));
  };

  const isHeld = status === "Held";
  const isReleased = status === "Released";

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 1. TOP BREADCRUMB & BACK LINK */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <Link
              href="/admin/shipments"
              className="hover:text-[#0B2545] flex items-center gap-1 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Shipments Directory</span>
            </Link>
            <span>&bull;</span>
            <span className="font-mono text-[#d21f27] font-bold">{shipmentId}</span>
            <span>&bull;</span>
            <span className="text-slate-800">Border Compliance</span>
          </div>

          <h1
            className="text-3xl sm:text-4xl font-bold text-[#0B2545] tracking-tight leading-tight"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Customs Compliance Center
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Manage CBSA / CBP border clearance, tariff duty notifications, and client document permissions.
          </p>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2.5">
          <Link
            href={`/dashboard/shipments?id=${encodeURIComponent(shipmentId)}`}
            target="_blank"
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#0B2545] shadow-2xs transition cursor-pointer flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#d21f27]" />
            <span>Preview Client Tracking</span>
          </Link>
          <button
            type="button"
            onClick={loadData}
            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition cursor-pointer"
            title="Reload Record"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Customs regulatory status and broker details successfully updated in database.</span>
        </div>
      )}

      {saveError && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* 2. REGULATORY STATUS SWITCHER BANNER */}
      <div
        className={`p-5 sm:p-6 rounded-2xl border transition-all ${
          isHeld
            ? "bg-red-50/70 border-red-300 shadow-sm"
            : isReleased
            ? "bg-emerald-50/60 border-emerald-300 shadow-2xs"
            : "bg-white border-slate-200 shadow-2xs"
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-sm font-bold text-[#0B2545] px-2 py-0.5 rounded bg-white border border-slate-200">
                {shipmentId}
              </span>
              <CustomsStatusBadge status={status} size="lg" />
            </div>
            <p className="text-xs text-slate-600 pt-1">
              {isHeld ? (
                <strong className="text-red-700 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Cargo is currently under Customs Detention. Client portal banner is illuminated red.
                </strong>
              ) : isReleased ? (
                <strong className="text-emerald-700 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Customs Cleared. Cargo released for immediate final delivery or carrier dispatch.
                </strong>
              ) : (
                "Cross-border clearance paperwork submitted and awaiting officer or broker inspection."
              )}
            </p>
          </div>

          {/* Prominent Clearance Status Switcher Buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
            {(["Pending", "In Review", "Released", "Held"] as CustomsClearanceStatus[]).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => handleStatusChange(st)}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  status === st
                    ? st === "Held"
                      ? "bg-[#d21f27] text-white shadow-xs"
                      : st === "Released"
                      ? "bg-[#10b981] text-white shadow-xs"
                      : st === "In Review"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-[#0B2545] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <span>{st}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. BROKER & PORT RECORDS + DUTIES DISPATCHER GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Broker & Port Notes Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-[#0B2545] text-base flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#0B2545]" />
                  <span>Brokerage &amp; Port Crossing Documentation</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Assigned broker filing credentials, crossing ports, and internal CBSA inspector audit notes.
                </p>
              </div>
              <span className="font-mono text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                ACI / eManifest Staged
              </span>
            </div>

            <form onSubmit={handleSaveComplianceRecord} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Assigned Customs Broker */}
                <div>
                  <label className="font-bold text-slate-800 block mb-1">
                    Assigned Customs Broker
                  </label>
                  <select
                    value={broker}
                    onChange={(e) => setBroker(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#0B2545] focus:bg-white rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold outline-none transition"
                  >
                    {STANDARD_BROKERS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Port of Entry / Crossing */}
                <div>
                  <label className="font-bold text-slate-800 block mb-1">
                    Port of Entry / Crossing Terminal
                  </label>
                  <select
                    value={portOfEntry}
                    onChange={(e) => setPortOfEntry(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#0B2545] focus:bg-white rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold outline-none transition"
                  >
                    {STANDARD_PORTS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* CBSA PARS / Barcode */}
              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  CBSA PARS / PAPS Entry Barcode Number
                </label>
                <div className="relative">
                  <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={cbsaPars}
                    onChange={(e) => setCbsaPars(e.target.value)}
                    placeholder="e.g. PARS-8849-QC"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#0B2545] focus:bg-white rounded-xl pl-9 pr-3 py-2 text-xs font-mono font-bold text-slate-900 outline-none transition"
                  />
                </div>
              </div>

              {/* CBSA & Officer Notes (CONFIDENTIAL) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Port &amp; CBSA Notes (Internal Staff Only)</span>
                  </label>
                  <span className="text-[10px] text-amber-700 font-bold uppercase">
                    Hidden from Client
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={cbsaNotes}
                  onChange={(e) => setCbsaNotes(e.target.value)}
                  placeholder="Record officer badge numbers, bay numbers, secondary inspection codes, or tariff inquiries..."
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#0B2545] focus:bg-white rounded-xl p-3 text-xs text-slate-800 outline-none leading-relaxed transition"
                />
              </div>

              {/* Submit */}
              <div className="flex items-center justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2.5 bg-[#0B2545] hover:bg-slate-800 text-white rounded-xl font-bold shadow-xs transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? "Saving Compliance..." : "Save Compliance Record"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right 1 Col: Duties & Tax Alert Dispatcher */}
        <div className="space-y-6">
          <div className="bg-[#0B2545] text-white p-5 rounded-2xl shadow-md border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="font-bold uppercase tracking-wider text-xs text-amber-400 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4" />
                <span>Duties &amp; Tax Alert Dispatcher</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400">RESEND GATEWAY</span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Assessed Tariff &amp; Taxes</span>
                <p className="text-xl font-mono font-bold text-white">
                  {customsRecord?.duties?.totalOwed || "$0.00 CAD"}
                </p>
                <div className="text-[11px] text-slate-300 space-y-0.5 pt-1">
                  <div>Customs Duties: {customsRecord?.duties?.amountCad || "$0.00"}</div>
                  <div>GST / HST: {customsRecord?.duties?.taxGstHst || "$0.00"}</div>
                  <div>Filing Fee: {customsRecord?.duties?.brokerageFee || "$0.00"}</div>
                </div>
              </div>

              <div className="p-2.5 bg-black/20 rounded-xl text-[11px] text-slate-300 flex items-center justify-between">
                <span>Notice Status:</span>
                <span className="font-bold text-amber-400">
                  {customsRecord?.duties?.status || "Unassessed"}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsDutiesModalOpen(true)}
              className="w-full py-2.5 bg-[#d21f27] hover:bg-[#b51a21] text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Calculate &amp; Dispatch Duties Notice</span>
            </button>

            <p className="text-[10px] text-slate-400 leading-snug">
              Triggers transactional payment notification via Resend with wire transfer instructions and activates the customs payment hold banner in the client portal.
            </p>
          </div>
        </div>
      </div>

      {/* 4. CLOUDINARY DOCUMENT UPLOADER */}
      <CloudinaryUploader
        shipmentId={shipmentId}
        onDocumentUploaded={handleDocumentUploaded}
      />

      {/* 5. PERMISSION VISIBILITY SWITCH TABLE (isClientVisible) */}
      <DocumentVisibilityToggle
        documents={documents}
        shipmentId={shipmentId}
        onVisibilityToggled={handleVisibilityToggled}
      />

      {/* Duties Alert Modal */}
      <DutiesAlertModal
        isOpen={isDutiesModalOpen}
        onClose={() => setIsDutiesModalOpen(false)}
        shipmentId={shipmentId}
        client={clientInfo}
        initialDuties={customsRecord?.duties}
        onNoticeDispatched={handleNoticeDispatched}
      />
    </div>
  );
}

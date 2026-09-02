"use client";

import React, { useState } from "react";
import {
  Download,
  FileSpreadsheet,
  Truck,
  FileText,
  Users,
  DollarSign,
  CheckCircle2,
  Filter,
  ArrowDownToLine,
  Sparkles,
} from "lucide-react";

export default function CsvExportSuite() {
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

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden space-y-0">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#d21f27]">
              Auditing &amp; Data Pipeline
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-mono font-bold">
              ONE-CLICK EXPORT SUITE
            </span>
          </div>
          <h2
            className="text-xl sm:text-2xl font-bold text-[#0B2545] tracking-tight mt-1"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Operational &amp; Accounting CSV Exports
          </h2>
          <p className="text-[12px] text-slate-500 mt-0.5">
            Instant downloads encoded in UTF-8 BOM formatted for Microsoft Excel, Google Sheets, and ERP auditing systems.
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
                <h4 className="font-bold text-slate-900 text-sm">Shipments History Report</h4>
                <p className="text-[11px] text-slate-500">
                  Tracking ID, client name, origin, destination, carrier, status, and delivery dates.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                Transport Mode
              </label>
              <select
                value={shipmentMode}
                onChange={(e) => setShipmentMode(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 outline-none"
              >
                <option value="all">All Modes</option>
                <option value="Road">Road (Highway)</option>
                <option value="Sea">Sea (Maritime)</option>
                <option value="Air">Air Express</option>
                <option value="Rail">Rail Intermodal</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                Current Status
              </label>
              <select
                value={shipmentStatus}
                onChange={(e) => setShipmentStatus(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="Delivered">Delivered</option>
                <option value="In Transit">In Transit</option>
                <option value="Customs Hold">Customs Hold</option>
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
                <span>Downloaded Successfully</span>
              </>
            ) : (
              <>
                <ArrowDownToLine className="w-3.5 h-3.5 text-[#d21f27]" />
                <span>{downloading === "shipments" ? "Generating CSV..." : "Download Shipments CSV"}</span>
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
                <h4 className="font-bold text-slate-900 text-sm">Quote Requests &amp; Pipeline</h4>
                <p className="text-[11px] text-slate-500">
                  Quote ID, client, cargo dimensions, weight, quoted linehaul, and acceptance status.
                </p>
              </div>
            </div>
          </div>

          <div className="text-xs">
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
              Pipeline Status
            </label>
            <select
              value={quoteStatus}
              onChange={(e) => setQuoteStatus(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 outline-none"
            >
              <option value="all">All Quotes (New, Reviewing, Accepted, Rejected)</option>
              <option value="Accepted">Accepted &amp; Auto-Converted</option>
              <option value="Reviewing">Under Staff Review</option>
              <option value="New">New Intake</option>
              <option value="Rejected">Rejected / Declined</option>
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
                <span>Downloaded Successfully</span>
              </>
            ) : (
              <>
                <ArrowDownToLine className="w-3.5 h-3.5 text-[#d21f27]" />
                <span>{downloading === "quotes" ? "Generating CSV..." : "Download Quotes CSV"}</span>
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
                <h4 className="font-bold text-slate-900 text-sm">Client Accounts Directory</h4>
                <p className="text-[11px] text-slate-500">
                  Company names, contact credentials, industry tags, spend, and account states.
                </p>
              </div>
            </div>
          </div>

          <div className="text-xs">
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
              Account Status Filter
            </label>
            <select
              value={clientStatus}
              onChange={(e) => setClientStatus(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 outline-none"
            >
              <option value="all">All Accounts (Active &amp; Deactivated)</option>
              <option value="Active">Active Portal Access Only</option>
              <option value="Deactivated">Deactivated / Suspended Only</option>
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
                <span>Downloaded Successfully</span>
              </>
            ) : (
              <>
                <ArrowDownToLine className="w-3.5 h-3.5 text-[#d21f27]" />
                <span>{downloading === "clients" ? "Generating CSV..." : "Download Clients CSV"}</span>
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
                <h4 className="font-bold text-slate-900 text-sm">Financial &amp; Tariff Revenue Audit</h4>
                <p className="text-[11px] text-slate-500">
                  Tracking ID, quoted linehaul, CBSA duties, GST/HST taxes, brokerage fees, and totals.
                </p>
              </div>
            </div>
          </div>

          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-0.5">
            <div>&bull; Includes <strong>CBSA duty adjustments &amp; taxes</strong></div>
            <div>&bull; Itemized linehaul freight + fuel surcharges</div>
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
                <span>Downloaded Successfully</span>
              </>
            ) : (
              <>
                <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-400" />
                <span>{downloading === "revenue" ? "Generating CSV..." : "Download Financial CSV"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

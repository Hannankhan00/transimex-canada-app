"use client";

import React, { useState, useMemo } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { InvoiceItem, InvoiceStatus } from "@/lib/invoiceTypes";
import InvoiceStatusBadge from "./InvoiceStatusBadge";
import { Search, RefreshCw, Eye, Receipt } from "lucide-react";

interface InvoiceDataTableProps {
  invoices: InvoiceItem[];
  counts: { all: number; unpaid: number; pending_verification: number; paid: number };
  activeTab: "all" | InvoiceStatus;
  onTabChange: (tab: "all" | InvoiceStatus) => void;
  onSelectInvoice: (invoice: InvoiceItem) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export default function InvoiceDataTable({
  invoices,
  counts,
  activeTab,
  onTabChange,
  onSelectInvoice,
  onRefresh,
  isRefreshing = false,
}: InvoiceDataTableProps) {
  const { language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredInvoices = useMemo(() => {
    if (!searchQuery.trim()) return invoices;
    const q = searchQuery.toLowerCase().trim();
    return invoices.filter(
      (inv) =>
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.quoteRefNumber.toLowerCase().includes(q) ||
        inv.shipmentTrackingNumber.toLowerCase().includes(q) ||
        inv.client.name.toLowerCase().includes(q) ||
        (inv.client.companyName || "").toLowerCase().includes(q)
    );
  }, [invoices, searchQuery]);

  const tabs: { key: "all" | InvoiceStatus; labelEn: string; labelFr: string; count: number }[] = [
    { key: "all", labelEn: "All", labelFr: "Toutes", count: counts.all },
    { key: "unpaid", labelEn: "Unpaid", labelFr: "Impayées", count: counts.unpaid },
    { key: "pending_verification", labelEn: "Pending Verification", labelFr: "Vérification", count: counts.pending_verification },
    { key: "paid", labelEn: "Paid", labelFr: "Payées", count: counts.paid },
  ];

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(language === "fr" ? "fr-CA" : "en-US", { year: "numeric", month: "short", day: "2-digit" });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === tab.key
                  ? "bg-[#0B2545] text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <span>{language === "fr" ? tab.labelFr : tab.labelEn}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  activeTab === tab.key ? "bg-white/20" : "bg-slate-100 text-slate-500"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === "fr" ? "Rechercher..." : "Search..."}
              className="pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0B2545] w-full sm:w-56"
            />
          </div>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
              title={language === "fr" ? "Actualiser" : "Refresh"}
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
          )}
        </div>
      </div>

      {filteredInvoices.length === 0 ? (
        <div className="p-12 text-center">
          <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm font-medium">
            {language === "fr" ? "Aucune facture trouvée." : "No invoices found."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                <th className="py-3 px-4">{language === "fr" ? "Facture" : "Invoice"}</th>
                <th className="py-3 px-4">{language === "fr" ? "Type" : "Type"}</th>
                <th className="py-3 px-4">{language === "fr" ? "Client" : "Client"}</th>
                <th className="py-3 px-4">{language === "fr" ? "Expédition" : "Shipment"}</th>
                <th className="py-3 px-4">{language === "fr" ? "Montant" : "Amount"}</th>
                <th className="py-3 px-4">{language === "fr" ? "Échéance" : "Due"}</th>
                <th className="py-3 px-4">{language === "fr" ? "Statut" : "Status"}</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.map((inv) => (
                <tr
                  key={inv.id}
                  onClick={() => onSelectInvoice(inv)}
                  className="hover:bg-slate-50/70 cursor-pointer transition"
                >
                  <td className="py-3.5 px-4 font-mono font-bold text-[#0B2545] text-xs whitespace-nowrap">{inv.invoiceNumber}</td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        inv.kind === "duties"
                          ? "bg-amber-50 text-amber-700 border-amber-200/60"
                          : "bg-sky-50 text-sky-700 border-sky-200/60"
                      }`}
                    >
                      {inv.kind === "duties"
                        ? language === "fr" ? "Douanes" : "Duties"
                        : language === "fr" ? "Fret" : "Freight"}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="text-xs font-semibold text-slate-800">{inv.client.name}</div>
                    {inv.client.companyName && <div className="text-[11px] text-slate-400">{inv.client.companyName}</div>}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs text-slate-600 whitespace-nowrap">{inv.shipmentTrackingNumber}</td>
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900 text-xs whitespace-nowrap">{inv.amountDisplay}</td>
                  <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">{fmtDate(inv.dueDate)}</td>
                  <td className="py-3.5 px-4">
                    <InvoiceStatusBadge status={inv.status} />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Eye className="w-4 h-4 text-slate-400" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

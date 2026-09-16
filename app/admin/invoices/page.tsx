"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { InvoiceItem, InvoiceStatus } from "@/lib/invoiceTypes";
import InvoiceDataTable from "@/components/admin/invoices/InvoiceDataTable";
import InvoiceReviewDrawer from "@/components/admin/invoices/InvoiceReviewDrawer";
import PermissionGuard from "@/components/admin/PermissionGuard";
import { RefreshCw, Clock, AlertTriangle, CheckCircle2, Receipt } from "lucide-react";

export default function AdminInvoicesPage() {
  const { language } = useLanguage();
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [counts, setCounts] = useState({ all: 0, unpaid: 0, pending_verification: 0, paid: 0 });
  const [activeTab, setActiveTab] = useState<"all" | InvoiceStatus>("all");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchInvoices = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch(`/api/admin/invoices?status=${activeTab}`);
      const data = await res.json();
      if (res.ok && data.invoices) {
        setInvoices(data.invoices);
        if (data.counts) setCounts(data.counts);
      }
    } catch (err) {
      console.error("Error fetching invoices:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleSelectInvoice = (invoice: InvoiceItem) => {
    setSelectedInvoice(invoice);
    setIsDrawerOpen(true);
  };

  const handleInvoiceUpdated = (updated: InvoiceItem) => {
    setInvoices((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    setSelectedInvoice(updated);
    fetchInvoices();
  };

  return (
    <PermissionGuard module="invoices">
      <div className="space-y-8 animate-in fade-in duration-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#d21f27]">
              {language === "fr" ? "Facturation et Paiements" : "Billing & Payments"}
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0B2545] tracking-tight leading-tight mt-1">
              {language === "fr" ? "Factures Clients" : "Client Invoices"}
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl">
              {language === "fr"
                ? "Suivez les factures générées automatiquement à l'acceptation des soumissions et vérifiez les preuves de paiement téléversées par les clients."
                : "Track invoices auto-generated when quotes are accepted, and verify the payment proofs clients upload."}
            </p>
          </div>

          <button
            type="button"
            onClick={fetchInvoices}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs transition cursor-pointer flex items-center gap-1.5 self-start"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{language === "fr" ? "Actualiser" : "Refresh"}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {language === "fr" ? "Total des Factures" : "Total Invoices"}
              </span>
              <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5 text-2xl sm:text-3xl font-bold text-[#0B2545]">{counts.all}</div>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {language === "fr" ? "Impayées" : "Unpaid"}
              </span>
              <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5 text-2xl sm:text-3xl font-bold text-[#0B2545]">{counts.unpaid}</div>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {language === "fr" ? "Vérification en Cours" : "Pending Verification"}
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5 text-2xl sm:text-3xl font-bold text-[#0B2545]">{counts.pending_verification}</div>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {language === "fr" ? "Payées" : "Paid"}
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5 text-2xl sm:text-3xl font-bold text-[#0B2545]">{counts.paid}</div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-12 text-center text-slate-400 text-sm">
            {language === "fr" ? "Chargement des factures..." : "Loading invoices..."}
          </div>
        ) : (
          <InvoiceDataTable
            invoices={invoices}
            counts={counts}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onSelectInvoice={handleSelectInvoice}
            onRefresh={fetchInvoices}
            isRefreshing={isRefreshing}
          />
        )}

        <InvoiceReviewDrawer
          invoice={selectedInvoice}
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          onInvoiceUpdated={handleInvoiceUpdated}
        />
      </div>
    </PermissionGuard>
  );
}

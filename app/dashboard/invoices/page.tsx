"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { InvoiceItem, InvoiceStatus } from "@/lib/invoiceTypes";
import {
  Receipt,
  Search,
  Calendar,
  ExternalLink,
  Clock,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

export default function ClientInvoicesPage() {
  const { t, language } = useLanguage();
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | InvoiceStatus>("all");

  useEffect(() => {
    fetch("/api/invoices")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setInvoices(data.invoices);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = invoices.filter((inv) => {
    if (statusFilter !== "all" && inv.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      if (
        !inv.invoiceNumber.toLowerCase().includes(q) &&
        !inv.shipmentTrackingNumber.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  const statusBadge = (status: InvoiceStatus) => {
    const map: Record<InvoiceStatus, { labelEn: string; labelFr: string; cls: string; Icon: any }> = {
      unpaid: { labelEn: "Unpaid", labelFr: "Impayée", cls: "bg-slate-100 text-slate-600", Icon: Clock },
      pending_verification: {
        labelEn: "Pending Verification",
        labelFr: "Vérification en Cours",
        cls: "bg-amber-50 text-amber-700",
        Icon: AlertTriangle,
      },
      paid: { labelEn: "Paid", labelFr: "Payée", cls: "bg-emerald-50 text-emerald-700", Icon: CheckCircle2 },
    };
    const { labelEn, labelFr, cls, Icon } = map[status];
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${cls}`}>
        <Icon className="w-3 h-3" />
        {language === "fr" ? labelFr : labelEn}
      </span>
    );
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(language === "fr" ? "fr-CA" : "en-US", { year: "numeric", month: "short", day: "2-digit" });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B2545] tracking-tight leading-tight">
          {t.nav.invoices}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {language === "fr"
            ? "Consultez vos factures, téléchargez le PDF et téléversez votre preuve de paiement."
            : "View your invoices, download the PDF, and upload your proof of payment."}
        </p>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={language === "fr" ? "Rechercher par no. de facture ou d'expédition..." : "Search by invoice # or shipment #..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition font-medium text-slate-900"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | InvoiceStatus)}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0B2545] rounded-xl text-xs font-semibold text-slate-800 outline-none transition cursor-pointer"
          >
            <option value="all">{language === "fr" ? "Tous les statuts" : "All Statuses"}</option>
            <option value="unpaid">{language === "fr" ? "Impayées" : "Unpaid"}</option>
            <option value="pending_verification">{language === "fr" ? "Vérification en Cours" : "Pending Verification"}</option>
            <option value="paid">{language === "fr" ? "Payées" : "Paid"}</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">{language === "fr" ? "Chargement..." : "Loading..."}</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Receipt className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">
              {language === "fr" ? "Aucune facture trouvée" : "No Invoices Found"}
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {language === "fr"
                ? "Les factures apparaissent ici automatiquement une fois une soumission acceptée."
                : "Invoices appear here automatically once a quote is accepted."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500 select-none">
                  <th className="py-3 px-4 sm:px-6">{language === "fr" ? "Facture" : "Invoice"}</th>
                  <th className="py-3 px-4">{language === "fr" ? "Expédition" : "Shipment"}</th>
                  <th className="py-3 px-4">{language === "fr" ? "Montant" : "Amount"}</th>
                  <th className="py-3 px-4">{language === "fr" ? "Échéance" : "Due Date"}</th>
                  <th className="py-3 px-4">{language === "fr" ? "Statut" : "Status"}</th>
                  <th className="py-3 px-4 sm:px-6 text-right">{language === "fr" ? "Actions" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition group">
                    <td className="py-4 px-4 sm:px-6 font-mono font-bold text-[#0B2545]">{inv.invoiceNumber}</td>
                    <td className="py-4 px-4 font-mono text-slate-600">{inv.shipmentTrackingNumber}</td>
                    <td className="py-4 px-4 font-mono font-bold text-slate-900">{inv.amountDisplay}</td>
                    <td className="py-4 px-4 text-slate-500 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {fmtDate(inv.dueDate)}
                      </div>
                    </td>
                    <td className="py-4 px-4">{statusBadge(inv.status)}</td>
                    <td className="py-4 px-4 sm:px-6 text-right">
                      <Link
                        href={`/dashboard/invoices/${inv.invoiceNumber}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0B2545] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                      >
                        <span>{language === "fr" ? "Voir" : "View"}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

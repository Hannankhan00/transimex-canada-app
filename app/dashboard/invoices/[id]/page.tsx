"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { InvoiceItem } from "@/lib/invoiceTypes";
import PaymentProofUploader from "@/components/portal/PaymentProofUploader";
import {
  ArrowLeft,
  Download,
  Landmark,
  Copy,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  Calendar,
} from "lucide-react";

export default function ClientInvoiceDetailPage() {
  const { language } = useLanguage();
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [invoice, setInvoice] = useState<InvoiceItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const fetchInvoice = useCallback(async () => {
    try {
      const res = await fetch(`/api/invoices/${encodeURIComponent(id)}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setInvoice(data.invoice);
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchInvoice();
  }, [id, fetchInvoice]);

  const handleDownloadPdf = async () => {
    if (!invoice) return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.invoiceNumber}/pdf`);
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
    } finally {
      setDownloading(false);
    }
  };

  const handleCopy = (label: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(language === "fr" ? "fr-CA" : "en-US", { year: "numeric", month: "short", day: "2-digit" });

  if (loading) {
    return <div className="p-12 text-center text-slate-400 text-sm">{language === "fr" ? "Chargement..." : "Loading..."}</div>;
  }

  if (notFound || !invoice) {
    return (
      <div className="p-12 text-center space-y-3">
        <h4 className="text-sm font-bold text-slate-700">{language === "fr" ? "Facture introuvable" : "Invoice Not Found"}</h4>
        <Link href="/dashboard/invoices" className="text-xs font-bold text-[#0B2545] hover:underline">
          {language === "fr" ? "Retour aux Factures" : "Back to Invoices"}
        </Link>
      </div>
    );
  }

  const bankRows: { label: string; value?: string }[] = invoice.bankSnapshot?.bankName
    ? [
        { label: language === "fr" ? "Banque" : "Bank", value: invoice.bankSnapshot.bankName },
        { label: language === "fr" ? "Bénéficiaire" : "Beneficiary", value: invoice.bankSnapshot.beneficiaryName },
        { label: language === "fr" ? "Numéro de Compte" : "Account Number", value: invoice.bankSnapshot.accountNumber },
        { label: language === "fr" ? "No. de Transit" : "Transit Number", value: invoice.bankSnapshot.transitNumber },
        { label: language === "fr" ? "No. d'Institution" : "Institution Number", value: invoice.bankSnapshot.institutionNumber },
        { label: "SWIFT / BIC", value: invoice.bankSnapshot.swiftBic },
      ].filter((r) => r.value)
    : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-3xl">
      <button
        type="button"
        onClick={() => router.push("/dashboard/invoices")}
        className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#0B2545] cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {language === "fr" ? "Retour aux Factures" : "Back to Invoices"}
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-slate-500">{invoice.invoiceNumber}</span>
            {invoice.status === "unpaid" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
                <Clock className="w-3 h-3" />
                {language === "fr" ? "Impayée" : "Unpaid"}
              </span>
            )}
            {invoice.status === "pending_verification" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700">
                <AlertTriangle className="w-3 h-3" />
                {language === "fr" ? "Vérification en Cours" : "Pending Verification"}
              </span>
            )}
            {invoice.status === "paid" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="w-3 h-3" />
                {language === "fr" ? "Payée" : "Paid"}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B2545] tracking-tight leading-tight mt-1">
            {invoice.amountDisplay}
          </h1>
          <p className="text-slate-500 text-xs mt-1 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {language === "fr" ? "Échéance" : "Due"} {fmtDate(invoice.dueDate)}
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={downloading}
          className="px-4 py-2.5 bg-[#0B2545] hover:bg-slate-800 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5 self-start"
        >
          <Download className="w-4 h-4" />
          {downloading ? (language === "fr" ? "Téléchargement..." : "Downloading...") : language === "fr" ? "Télécharger le PDF" : "Download PDF"}
        </button>
      </div>

      {/* Line items */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {language === "fr" ? "Détails de la Facture" : "Invoice Details"}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            {invoice.route.origin} &rarr; {invoice.route.destination} &bull; {language === "fr" ? "Expédition" : "Shipment"} {invoice.shipmentTrackingNumber}
          </p>
        </div>
        <div>
          {invoice.lineItems.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between px-4 sm:px-5 py-3 text-sm border-b border-slate-50">
              <span className="text-slate-600">{item.description}</span>
              <span className="font-mono font-semibold text-slate-800">
                ${item.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })} {invoice.currency}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between px-4 sm:px-5 py-4 bg-slate-50">
            <span className="font-bold text-[#0B2545]">{language === "fr" ? "Total Dû" : "Total Due"}</span>
            <span className="font-mono font-extrabold text-lg text-[#d21f27]">{invoice.amountDisplay}</span>
          </div>
        </div>
      </div>

      {/* Paid state */}
      {invoice.status === "paid" && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold">{language === "fr" ? "Paiement vérifié" : "Payment Verified"}</p>
            <p className="text-xs mt-0.5">
              {language === "fr" ? "Merci ! Cette facture a été payée intégralement." : "Thank you! This invoice has been paid in full."}
              {invoice.verifiedAt ? ` (${fmtDate(invoice.verifiedAt)})` : ""}
            </p>
          </div>
        </div>
      )}

      {/* Unpaid or rejected: payment instructions + upload */}
      {invoice.status !== "paid" && (
        <>
          {invoice.paymentRejectionReason && (
            <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold">
                  {language === "fr" ? "Votre preuve de paiement doit être revue" : "Your payment proof needs another look"}
                </p>
                <p className="text-xs mt-0.5">{invoice.paymentRejectionReason}</p>
              </div>
            </div>
          )}

          {invoice.status === "pending_verification" ? (
            <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-800">
                  {language === "fr" ? "En attente de vérification" : "Awaiting Verification"}
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  {language === "fr"
                    ? "Nous avons reçu votre preuve de paiement. Notre équipe la vérifiera sous peu."
                    : "We've received your payment proof. Our team will verify it shortly."}
                </p>
              </div>
            </div>
          ) : (
            <>
              {invoice.bankSnapshot?.bankName && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-[#d21f27]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      {language === "fr" ? "Instructions de Virement Bancaire" : "Wire Transfer Instructions"}
                    </h3>
                  </div>
                  <div className="p-4 sm:p-5 space-y-2.5">
                    {bankRows.map((row) => (
                      <div key={row.label} className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-semibold">{row.label}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(row.label, row.value!)}
                          className="flex items-center gap-1.5 font-mono font-bold text-slate-800 hover:text-[#0B2545] cursor-pointer"
                        >
                          {row.value}
                          {copiedField === row.label ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </button>
                      </div>
                    ))}
                    <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-semibold">{language === "fr" ? "Référence Requise" : "Required Reference"}</span>
                      <span className="font-mono font-bold text-[#d21f27]">{invoice.invoiceNumber}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {language === "fr" ? "Téléverser la Preuve de Paiement" : "Upload Payment Proof"}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {language === "fr"
                    ? "Après avoir envoyé le paiement, téléversez une capture d'écran ou un reçu pour vérification."
                    : "After sending payment, upload a screenshot or receipt so our team can verify it."}
                </p>
                <PaymentProofUploader invoiceNumber={invoice.invoiceNumber} onUploaded={fetchInvoice} />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

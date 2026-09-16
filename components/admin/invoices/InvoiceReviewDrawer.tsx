"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { InvoiceItem } from "@/lib/invoiceTypes";
import InvoiceStatusBadge from "./InvoiceStatusBadge";
import {
  X,
  Building2,
  Mail,
  Download,
  CheckCircle2,
  XCircle,
  Landmark,
  FileImage,
  AlertTriangle,
  Truck,
} from "lucide-react";

interface InvoiceReviewDrawerProps {
  invoice: InvoiceItem | null;
  isOpen: boolean;
  onClose: () => void;
  onInvoiceUpdated: (updated: InvoiceItem) => void;
}

export default function InvoiceReviewDrawer({ invoice, isOpen, onClose, onInvoiceUpdated }: InvoiceReviewDrawerProps) {
  const { language } = useLanguage();
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setShowRejectForm(false);
    setRejectReason("");
    setActionError(null);
  }, [invoice?.id]);

  if (!isOpen || !invoice) return null;

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(language === "fr" ? "fr-CA" : "en-US", { year: "numeric", month: "short", day: "2-digit" });

  const handleVerify = async () => {
    try {
      setIsVerifying(true);
      setActionError(null);
      const res = await fetch(`/api/admin/invoices/${invoice.invoiceNumber}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to verify payment");
      onInvoiceUpdated(data.invoice);
    } catch (err: any) {
      setActionError(err.message || "Failed to verify payment");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleReject = async () => {
    try {
      setIsRejecting(true);
      setActionError(null);
      const res = await fetch(`/api/admin/invoices/${invoice.invoiceNumber}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", reason: rejectReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reject payment proof");
      onInvoiceUpdated(data.invoice);
      setShowRejectForm(false);
      setRejectReason("");
    } catch (err: any) {
      setActionError(err.message || "Failed to reject payment proof");
    } finally {
      setIsRejecting(false);
    }
  };

  const proofIsImage = invoice.paymentProof?.mimeType?.startsWith("image/");

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-250">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-[#0B2545] text-white flex items-center justify-between border-b border-white/10 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-white/10 text-slate-200">
                {invoice.invoiceNumber}
              </span>
              <InvoiceStatusBadge status={invoice.status} />
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/10 text-slate-200">
                {invoice.kind === "duties"
                  ? language === "fr" ? "Droits Douaniers" : "Customs Duties"
                  : language === "fr" ? "Fret" : "Freight"}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight mt-1 text-white">
              {language === "fr" ? "Détails de la Facture" : "Invoice Details"}
            </h2>
            <p className="text-slate-300 text-xs mt-0.5">
              {language === "fr" ? "Expédition" : "Shipment"} {invoice.shipmentTrackingNumber}
              {invoice.kind !== "duties" && (
                <>
                  {" "}&bull; {language === "fr" ? "Soumission" : "Quote"} {invoice.quoteRefNumber}
                </>
              )}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 cursor-pointer flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Client */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2.5">
              {language === "fr" ? "Client" : "Client"}
            </h3>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              {invoice.client.name} {invoice.client.companyName ? `(${invoice.client.companyName})` : ""}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              {invoice.client.email}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
              <Truck className="w-3.5 h-3.5 text-slate-400" />
              {invoice.route.origin} &rarr; {invoice.route.destination}
            </div>
          </div>

          {/* Line items */}
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2.5">
              {language === "fr" ? "Postes de Facturation" : "Line Items"}
            </h3>
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              {invoice.lineItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between px-4 py-2.5 text-xs border-b border-slate-100 last:border-b-0">
                  <span className="text-slate-600">{item.description}</span>
                  <span className="font-mono font-semibold text-slate-800">
                    ${item.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })} {invoice.currency}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between px-4 py-3 text-sm bg-slate-50">
                <span className="font-bold text-[#0B2545]">{language === "fr" ? "Total Dû" : "Total Due"}</span>
                <span className="font-mono font-extrabold text-[#d21f27]">{invoice.amountDisplay}</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              {language === "fr" ? "Émise" : "Issued"} {fmtDate(invoice.issueDate)} &bull; {language === "fr" ? "Échéance" : "Due"} {fmtDate(invoice.dueDate)}
            </p>
          </div>

          {/* Bank used */}
          {invoice.bankSnapshot?.bankName && (
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5" />
                {language === "fr" ? "Compte Bancaire Utilisé" : "Bank Account Used"}
              </h3>
              <div className="border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 font-mono space-y-1">
                <div>{invoice.bankSnapshot.bankName} &bull; {invoice.bankSnapshot.beneficiaryName}</div>
                <div>{language === "fr" ? "Compte" : "Account"}: {invoice.bankSnapshot.accountNumber}</div>
                {invoice.bankSnapshot.transitNumber && <div>{language === "fr" ? "Transit" : "Transit"}: {invoice.bankSnapshot.transitNumber}</div>}
                {invoice.bankSnapshot.swiftBic && <div>SWIFT/BIC: {invoice.bankSnapshot.swiftBic}</div>}
              </div>
            </div>
          )}

          {/* Payment proof */}
          {invoice.paymentProof && (invoice.paymentProof.fileKey || invoice.paymentProof.uploadedAt) && (
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                {language === "fr" ? "Preuve de Paiement" : "Payment Proof"}
              </h3>
              <div className="border border-slate-200 rounded-2xl p-4">
                {proofIsImage ? (
                  <a href={`/api/invoices/${invoice.invoiceNumber}/payment-proof`} target="_blank" rel="noreferrer">
                    <img
                      src={`/api/invoices/${invoice.invoiceNumber}/payment-proof`}
                      alt="Payment proof"
                      className="max-h-72 w-auto rounded-xl border border-slate-200 mx-auto"
                    />
                  </a>
                ) : (
                  <a
                    href={`/api/invoices/${invoice.invoiceNumber}/payment-proof`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-xs font-bold text-[#0B2545] hover:underline"
                  >
                    <FileImage className="w-4 h-4" />
                    {language === "fr" ? "Voir la preuve de paiement" : "View payment proof file"}
                  </a>
                )}
                <p className="text-[11px] text-slate-400 mt-2">
                  {language === "fr" ? "Téléversé le" : "Uploaded"} {invoice.paymentProof.uploadedAt ? fmtDate(invoice.paymentProof.uploadedAt) : ""}
                </p>
              </div>
            </div>
          )}

          {invoice.status === "unpaid" && invoice.paymentRejectionReason && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                {language === "fr" ? "Dernière preuve rejetée : " : "Last proof rejected: "}
                {invoice.paymentRejectionReason}
              </span>
            </div>
          )}

          {invoice.status === "paid" && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              {language === "fr" ? "Paiement vérifié" : "Payment verified"}
              {invoice.verifiedBy ? ` — ${invoice.verifiedBy}` : ""}
              {invoice.verifiedAt ? ` (${fmtDate(invoice.verifiedAt)})` : ""}
            </div>
          )}

          {actionError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">{actionError}</div>
          )}

          {showRejectForm && (
            <div className="border border-slate-200 rounded-2xl p-4 space-y-2.5">
              <label className="text-[11px] font-bold text-slate-600">
                {language === "fr" ? "Motif du rejet (optionnel)" : "Rejection reason (optional)"}
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={2}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#0B2545]"
                placeholder={language === "fr" ? "Ex. Montant illisible sur la capture d'écran" : "e.g. Amount is illegible in the screenshot"}
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRejectForm(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  {language === "fr" ? "Annuler" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={isRejecting}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#d21f27] hover:bg-[#b51a21] disabled:opacity-60 text-white cursor-pointer"
                >
                  {isRejecting ? (language === "fr" ? "Rejet..." : "Rejecting...") : language === "fr" ? "Confirmer le Rejet" : "Confirm Rejection"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-white flex-shrink-0 flex flex-wrap items-center gap-2.5">
          <a
            href={`/api/admin/invoices/${invoice.invoiceNumber}/pdf`}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs transition cursor-pointer flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            {language === "fr" ? "Télécharger PDF" : "Download PDF"}
          </a>

          {invoice.status === "pending_verification" && !showRejectForm && (
            <>
              <button
                type="button"
                onClick={() => setShowRejectForm(true)}
                className="px-3.5 py-2 bg-white hover:bg-red-50 border border-slate-200 rounded-xl text-xs font-bold text-[#d21f27] shadow-2xs transition cursor-pointer flex items-center gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" />
                {language === "fr" ? "Rejeter" : "Reject"}
              </button>
              <button
                type="button"
                onClick={handleVerify}
                disabled={isVerifying}
                className="ml-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isVerifying ? (language === "fr" ? "Vérification..." : "Verifying...") : language === "fr" ? "Vérifier le Paiement" : "Verify Payment"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

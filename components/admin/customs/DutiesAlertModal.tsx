"use client";

import React, { useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { X, Send, AlertTriangle, DollarSign, CheckCircle2 } from "lucide-react";

interface DutiesAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipmentId: string;
  client: {
    name: string;
    companyName: string;
    email: string;
  };
  initialDuties?: {
    amountCad: string;
    taxGstHst: string;
    brokerageFee: string;
    totalOwed: string;
  };
  onNoticeDispatched: (dutiesData: any) => void;
}

export default function DutiesAlertModal({
  isOpen,
  onClose,
  shipmentId,
  client,
  initialDuties,
  onNoticeDispatched,
}: DutiesAlertModalProps) {
  const { language } = useLanguage();
  // No prior assessment exists for most shipments — leave every field blank rather
  // than seeding it with an example number, so staff must enter this shipment's
  // real duties before a notice can be dispatched to the client.
  const [dutiesAmount, setDutiesAmount] = useState(initialDuties?.amountCad || "");
  const [taxGstHst, setTaxGstHst] = useState(initialDuties?.taxGstHst || "");
  const [brokerageFee, setBrokerageFee] = useState(initialDuties?.brokerageFee || "");
  const [currency, setCurrency] = useState<"CAD" | "USD">("CAD");
  const [paymentInstructions, setPaymentInstructions] = useState(
    language === "fr"
      ? "Veuillez remettre les fonds par virement électronique (EFT) ou carte de crédit corporative dans votre portail client Transimex. La libération de la cargaison sera autorisée immédiatement après confirmation du paiement."
      : "Please remit funds via Electronic Funds Transfer (EFT) or corporate credit card in your Transimex client portal. Cargo release will be authorized immediately upon payment confirmation."
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const parseVal = (str: string) => {
    const cleaned = str.replace(/[^0-9.]/g, "");
    return parseFloat(cleaned) || 0;
  };

  const calculatedTotal =
    parseVal(dutiesAmount) + parseVal(taxGstHst) + parseVal(brokerageFee);

  const formattedTotal = `$${calculatedTotal.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (calculatedTotal <= 0) {
      setError(
        language === "fr"
          ? "Le total des droits et taxes réglementaires doit être supérieur à zéro."
          : "Total duties and regulatory taxes must be greater than zero."
      );
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/admin/shipments/${encodeURIComponent(shipmentId)}/duties-alert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dutiesAmount: `$${dutiesAmount} ${currency}`,
          taxesAmount: `$${taxGstHst} ${currency}`,
          brokerageFee: `$${brokerageFee} ${currency}`,
          totalOwed: formattedTotal,
          wirePaymentInstructions: paymentInstructions,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to dispatch duties payment alert");
      }

      setSuccess(true);
      onNoticeDispatched({
        amountCad: `$${dutiesAmount} ${currency}`,
        taxGstHst: `$${taxGstHst} ${currency}`,
        brokerageFee: `$${brokerageFee} ${currency}`,
        totalOwed: formattedTotal,
        status: "Notice Dispatched",
        dispatchedAt: new Date().toLocaleString(),
      });

      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Failed to dispatch duties notice");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-bold text-[#0B2545] text-base leading-tight">
                {language === "fr" ? "Envoyer l'Avis de Droits et Taxes" : "Dispatch Duties & Taxes Notice"}
              </h3>
              <p className="text-[11px] text-slate-500">
                {language === "fr" ? "Expédition :" : "Shipment:"}{" "}
                <span className="font-mono font-bold text-slate-700">{shipmentId}</span> &bull;{" "}
                {client.companyName || client.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="p-6 text-center space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
            <h4 className="font-bold text-slate-900 text-sm">
              {language === "fr" ? "Avis de Droits Envoyé avec Succès" : "Duties Notice Dispatched Successfully"}
            </h4>
            <p className="text-xs text-slate-500">
              {language === "fr" ? (
                <>
                  Courriel transactionnel livré à <strong>{client.email}</strong>. Alerte du portail client
                  illuminée.
                </>
              ) : (
                <>
                  Transactional email delivered to <strong>{client.email}</strong>. Client portal alert
                  illuminated.
                </>
              )}
            </p>
          </div>
        ) : (
          <form onSubmit={handleDispatch} className="space-y-4 text-xs">
            {/* Recipient summary banner */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  {language === "fr" ? "Destinataire de l'Avis" : "Notice Recipient"}
                </span>
                <p className="font-bold text-slate-900 text-xs">{client.name} &bull; {client.companyName}</p>
                <p className="text-[11px] text-slate-500">{client.email}</p>
              </div>
            </div>

            {/* Currency selector */}
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700">
                {language === "fr" ? "Devise de Règlement :" : "Settlement Currency:"}
              </span>
              <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setCurrency("CAD")}
                  className={`px-2.5 py-1 rounded cursor-pointer ${
                    currency === "CAD" ? "bg-[#0B2545] text-white" : "text-slate-600"
                  }`}
                >
                  CAD
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency("USD")}
                  className={`px-2.5 py-1 rounded cursor-pointer ${
                    currency === "USD" ? "bg-[#0B2545] text-white" : "text-slate-600"
                  }`}
                >
                  USD
                </button>
              </div>
            </div>

            {/* Breakdown Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {language === "fr" ? "Droit de Douane" : "Customs Duty"} ({currency})
                </label>
                <input
                  type="text"
                  placeholder="1,850.00"
                  value={dutiesAmount}
                  onChange={(e) => setDutiesAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#0B2545] focus:bg-white rounded-xl px-3 py-2 text-xs text-slate-800 outline-none font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {language === "fr" ? "Taxes TPS / TVH" : "GST / HST Taxes"} ({currency})
                </label>
                <input
                  type="text"
                  placeholder="420.00"
                  value={taxGstHst}
                  onChange={(e) => setTaxGstHst(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#0B2545] focus:bg-white rounded-xl px-3 py-2 text-xs text-slate-800 outline-none font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {language === "fr" ? "Frais de Dossier du Courtier" : "Broker Filing Fee"}
                </label>
                <input
                  type="text"
                  placeholder="150.00"
                  value={brokerageFee}
                  onChange={(e) => setBrokerageFee(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#0B2545] focus:bg-white rounded-xl px-3 py-2 text-xs text-slate-800 outline-none font-mono"
                />
              </div>
            </div>

            {/* Total Duties Owed Display */}
            <div className="p-3.5 bg-[#0B2545] text-white rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-300 uppercase font-bold tracking-wider block">
                  {language === "fr" ? "Total des Droits Dus (Payable par l'Expéditeur)" : "Total Duties Owed (Payable by Shipper)"}
                </span>
                <span className="text-xl font-mono font-bold text-amber-400">
                  {formattedTotal}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-bold border border-amber-400/30">
                {language === "fr" ? "EN ATTENTE DE DÉDOUANEMENT" : "PENDING CLEARANCE"}
              </span>
            </div>

            {/* Payment Instructions */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                {language === "fr" ? "Instructions de Règlement et de Virement" : "Wire & Payment Settlement Instructions"}
              </label>
              <textarea
                rows={2}
                value={paymentInstructions}
                onChange={(e) => setPaymentInstructions(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#0B2545] focus:bg-white rounded-xl p-2.5 text-xs text-slate-800 outline-none"
              />
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                {language === "fr" ? "Annuler" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-[#d21f27] hover:bg-[#b51a21] text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {loading
                    ? language === "fr"
                      ? "Envoi..."
                      : "Dispatching Notice..."
                    : language === "fr"
                    ? "Envoyer l'Avis de Droits"
                    : "Dispatch Duties Notice"}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

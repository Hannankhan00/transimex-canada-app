"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { QuoteItem } from "@/lib/quoteTypes";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  X,
  Truck,
  MapPin,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  Package,
  Phone,
  PhoneCall,
  MessageSquare,
  Sparkles,
  Send,
  HelpCircle,
} from "lucide-react";

interface QuoteDetailsModalProps {
  quote: QuoteItem | null;
  isOpen: boolean;
  onClose: () => void;
  onQuoteUpdated?: (updatedQuote: QuoteItem) => void;
}

const CLIENT_REJECTION_REASONS = [
  "Rate exceeds our logistics budget",
  "Secured lower quote from a competing carrier",
  "Cargo pickup / delivery dates have shifted",
  "Need different equipment or accessorial specifications",
  "Fuel surcharge or secondary fees too high",
  "Other / Custom Explanation",
];

export default function QuoteDetailsModal({
  quote,
  isOpen,
  onClose,
  onQuoteUpdated,
}: QuoteDetailsModalProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const isFr = language === "fr";

  const [expediting, setExpediting] = useState(false);

  // Accept flow state
  const [isAccepting, setIsAccepting] = useState(false);
  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);
  const [acceptSuccess, setAcceptSuccess] = useState<{
    trackingId: string;
    message: string;
  } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Decline & Negotiate flow state
  const [isNegotiating, setIsNegotiating] = useState(false);
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [clientPhone, setClientPhone] = useState("");
  const [selectedReason, setSelectedReason] = useState(CLIENT_REJECTION_REASONS[0]);
  const [customExplanation, setCustomExplanation] = useState("");
  const [counterBudget, setCounterBudget] = useState("");
  const [declineSuccess, setDeclineSuccess] = useState(false);

  useEffect(() => {
    if (quote) {
      setClientPhone(quote.clientPhone || "");
      setShowAcceptConfirm(false);
      setShowDeclineForm(false);
      setAcceptSuccess(null);
      setDeclineSuccess(false);
      setActionError(null);
      setCustomExplanation("");
      setCounterBudget("");
      setSelectedReason(CLIENT_REJECTION_REASONS[0]);
    }
  }, [quote]);

  if (!isOpen || !quote) return null;

  const isRejected = quote.status === "rejected";
  const isAccepted = quote.status === "accepted";
  const isQuoted = quote.status === "quoted";
  const isClientRejected = quote.status === "client_rejected";
  const isPending = quote.status === "under_review" || quote.status === "reviewing";

  // Handle Client Accepting the Price Offer
  const handleAcceptOffer = async () => {
    setActionError(null);
    try {
      setIsAccepting(true);
      const res = await fetch(`/api/quotes/${encodeURIComponent(quote.id)}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to accept quote offer");
      }

      setAcceptSuccess({
        trackingId: data.trackingId,
        message: data.message || "Shipment created successfully!",
      });

      if (data.quote && onQuoteUpdated) {
        onQuoteUpdated(data.quote);
      }
    } catch (err: any) {
      setActionError(err.message || "Failed to process quote acceptance");
    } finally {
      setIsAccepting(false);
      setShowAcceptConfirm(false);
    }
  };

  // Handle Client Declining & Submitting Phone + Reason for Negotiation
  const handleSubmitDeclineAndNegotiate = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    if (!clientPhone || clientPhone.trim().length < 7) {
      setActionError(
        isFr
          ? "Veuillez entrer un numéro de téléphone direct valide pour la négociation."
          : "Please enter a valid direct phone number so our team can reach you."
      );
      return;
    }

    const isCustom = selectedReason === "Other / Custom Explanation";
    const finalReason = isCustom
      ? customExplanation.trim()
      : customExplanation.trim()
      ? `${selectedReason}: ${customExplanation.trim()}`
      : selectedReason;

    if (!finalReason || finalReason.trim().length < 4) {
      setActionError(
        isFr
          ? "Veuillez préciser le motif de refus de cette tarification."
          : "Please state your reason for declining this rate."
      );
      return;
    }

    try {
      setIsNegotiating(true);
      const res = await fetch(`/api/quotes/${encodeURIComponent(quote.id)}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: clientPhone.trim(),
          reason: finalReason,
          counterBudget: counterBudget.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit negotiation request");
      }

      setDeclineSuccess(true);
      setShowDeclineForm(false);
      if (data.quote && onQuoteUpdated) {
        onQuoteUpdated(data.quote);
      }
    } catch (err: any) {
      setActionError(err.message || "Failed to submit negotiation request");
    } finally {
      setIsNegotiating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0B2545]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-mono font-bold text-[#0B2545] bg-slate-100 px-2.5 py-1 rounded-lg">
                {quote.id}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                  quote.status === "under_review" || quote.status === "reviewing"
                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                    : quote.status === "quoted"
                    ? "bg-sky-100 text-sky-800 border border-sky-300 ring-2 ring-sky-300/40"
                    : quote.status === "client_rejected"
                    ? "bg-purple-100 text-purple-800 border border-purple-200"
                    : quote.status === "accepted"
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : quote.status === "rejected"
                    ? "bg-red-100 text-red-800 border border-red-200"
                    : "bg-slate-100 text-slate-600 border border-slate-200"
                }`}
              >
                {isFr ? quote.statusLabelFr : quote.statusLabelEn}
              </span>
            </div>
            <h3
              className="text-xl sm:text-2xl font-bold text-[#0B2545] mt-2"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {isFr ? "Détails de la Soumission" : "Freight Quote Details"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Error Alert */}
        {actionError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Accept Success Banner */}
        {acceptSuccess && (
          <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-2 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>{isFr ? "Réservation Confirmée !" : "Freight Booking Confirmed!"}</span>
            </div>
            <p className="text-emerald-700">
              {isFr
                ? `Votre soumission a été convertie en expédition commerciale active. Numéro de suivi attribué : `
                : `Your freight quote has been finalized and converted to an active commercial shipment. Tracking manifest: `}
              <strong className="font-mono bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-950">
                {acceptSuccess.trackingId}
              </strong>
            </p>
            <button
              type="button"
              onClick={() => {
                onClose();
                router.push(`/dashboard/shipments?id=${acceptSuccess.trackingId}`);
              }}
              className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0B2545] hover:bg-[#123661] text-white text-xs font-bold rounded-lg transition cursor-pointer"
            >
              <span>{isFr ? "Accéder à l'Expédition" : "View Active Shipment"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Decline Success Banner */}
        {declineSuccess && (
          <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 space-y-1 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 font-bold text-sm text-purple-800">
              <PhoneCall className="w-4 h-4 text-purple-600" />
              <span>{isFr ? "Demande de Négociation Transmise" : "Negotiation Request Submitted"}</span>
            </div>
            <p className="text-purple-800 leading-relaxed">
              {isFr
                ? `Merci de vos commentaires. Un coordonnateur Transimex a été avisé et vous contactera au ${clientPhone} pour discuter des ajustements tarifaires.`
                : `Thank you for your feedback. Our logistics coordinator has received your request and will contact you directly at ${clientPhone} to discuss adjusted pricing.`}
            </p>
          </div>
        )}

        {/* Content Body */}
        <div className="space-y-5 mt-5">
          {/* 1. RATE OFFER CARD (when quote is in 'quoted' status) */}
          {isQuoted && !acceptSuccess && !declineSuccess && (
            <div className="p-4 sm:p-5 bg-gradient-to-br from-slate-900 via-[#0B2545] to-slate-900 text-white rounded-2xl shadow-lg border border-slate-700 space-y-4">
              <div className="flex items-center justify-between border-b border-white/15 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-sm uppercase tracking-wide text-amber-400">
                    {isFr ? "Offre Tarifaire Garantie" : "Official Guaranteed Rate Offer"}
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                  {isFr ? "DÉCISION REQUISE" : "DECISION REQUIRED"}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                <div>
                  <span className="text-[11px] text-slate-300 block uppercase font-semibold">
                    {isFr ? "Tarif de Fret Calculé (Total)" : "Calculated Freight Rate (CAD Total)"}
                  </span>
                  <div className="text-2xl sm:text-3xl font-mono font-bold text-amber-400 mt-0.5">
                    {quote.priceCad}
                  </div>
                </div>

                <div className="text-right text-xs text-slate-300">
                  <div className="text-[10px] uppercase text-slate-400 font-semibold">{isFr ? "Validité de l'offre" : "Offer Validity"}</div>
                  <div className="font-medium text-slate-200">{quote.validUntil || "7 Days from Dispatch"}</div>
                </div>
              </div>

              {quote.breakdown && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-white/10 text-xs">
                  <div className="bg-white/5 p-2 rounded-lg">
                    <span className="text-[10px] text-slate-400 block font-semibold">Line Haul</span>
                    <span className="font-mono font-bold text-slate-100">{quote.breakdown.lineHaul}</span>
                  </div>
                  <div className="bg-white/5 p-2 rounded-lg">
                    <span className="text-[10px] text-slate-400 block font-semibold">Fuel (FSC)</span>
                    <span className="font-mono font-bold text-slate-100">{quote.breakdown.fuelSurcharge}</span>
                  </div>
                  <div className="bg-white/5 p-2 rounded-lg">
                    <span className="text-[10px] text-slate-400 block font-semibold">Cross-Border</span>
                    <span className="font-mono font-bold text-slate-100">{quote.breakdown.crossBorderFee || "$0.00"}</span>
                  </div>
                  <div className="bg-white/5 p-2 rounded-lg">
                    <span className="text-[10px] text-slate-400 block font-semibold">Accessorials</span>
                    <span className="font-mono font-bold text-slate-100">{quote.breakdown.accessorials || "$0.00"}</span>
                  </div>
                </div>
              )}

              {/* Action Buttons for Offer */}
              {!showAcceptConfirm && !showDeclineForm && (
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowAcceptConfirm(true)}
                    className="w-full sm:flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isFr ? "Accepter le Tarif & Réserver" : "Accept Rate & Book Shipment"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDeclineForm(true)}
                    className="w-full sm:flex-1 py-2.5 px-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <MessageSquare className="w-4 h-4 text-amber-300" />
                    <span>{isFr ? "Refuser & Négocier" : "Decline & Negotiate Rate"}</span>
                  </button>
                </div>
              )}

              {/* Confirmation state for Accept */}
              {showAcceptConfirm && (
                <div className="p-3.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl space-y-2 text-xs animate-in fade-in duration-150">
                  <p className="font-semibold text-emerald-200">
                    {isFr
                      ? `Êtes-vous sûr de vouloir confirmer cette soumission à ${quote.priceCad} ? Une expédition sera immédiatement créée.`
                      : `Are you sure you want to accept this quote at ${quote.priceCad}? An active shipment will be booked immediately.`}
                  </p>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAcceptConfirm(false)}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      {isFr ? "Annuler" : "Cancel"}
                    </button>
                    <button
                      type="button"
                      disabled={isAccepting}
                      onClick={handleAcceptOffer}
                      className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isAccepting ? (isFr ? "Confirmation..." : "Booking...") : isFr ? "Oui, Confirmer" : "Yes, Confirm Booking"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Decline / Negotiate Form */}
              {showDeclineForm && (
                <form
                  onSubmit={handleSubmitDeclineAndNegotiate}
                  className="p-4 bg-slate-800/90 border border-amber-500/40 rounded-xl space-y-3 text-xs animate-in fade-in duration-150"
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="font-bold text-amber-400 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{isFr ? "Négociation & Motif de Refus" : "Decline & Negotiation Feedback"}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowDeclineForm(false)}
                      className="text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Mandatory Phone Number */}
                  <div>
                    <label className="font-semibold text-slate-200 block mb-1">
                      {isFr ? "Votre Numéro de Téléphone Direct" : "Your Direct Phone Number"}{" "}
                      <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+1 (514) 555-0199"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {isFr
                        ? "Notre coordonnateur vous contactera à ce numéro pour ajuster les modalités."
                        : "Our dispatch coordinator will call you directly at this number to negotiate."}
                    </p>
                  </div>

                  {/* Standard Reason Dropdown */}
                  <div>
                    <label className="font-semibold text-slate-200 block mb-1">
                      {isFr ? "Motif Principal de Refus" : "Primary Reason for Declining"}{" "}
                      <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={selectedReason}
                      onChange={(e) => setSelectedReason(e.target.value)}
                      className="w-full bg-slate-900 border border-white/20 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    >
                      {CLIENT_REJECTION_REASONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Optional Target Budget */}
                  <div>
                    <label className="font-semibold text-slate-200 block mb-1">
                      {isFr ? "Budget Cible Souhaité (CAD - Optionnel)" : "Target / Counter Budget (CAD - Optional)"}
                    </label>
                    <input
                      type="text"
                      placeholder="$4,200.00 CAD"
                      value={counterBudget}
                      onChange={(e) => setCounterBudget(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                    />
                  </div>

                  {/* Explanation details */}
                  <div>
                    <label className="font-semibold text-slate-200 block mb-1">
                      {isFr ? "Précisions Additionnelles" : "Additional Negotiation Notes"}
                    </label>
                    <textarea
                      rows={2}
                      placeholder={
                        isFr
                          ? "Expliquez vos contraintes de budget ou de délai..."
                          : "State any specific constraints, competitor pricing, or schedule requirements..."
                      }
                      value={customExplanation}
                      onChange={(e) => setCustomExplanation(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 focus:border-amber-400 rounded-xl p-2.5 text-xs text-white outline-none"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setShowDeclineForm(false)}
                      className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      {isFr ? "Annuler" : "Cancel"}
                    </button>

                    <button
                      type="submit"
                      disabled={isNegotiating}
                      className="px-4 py-2 bg-[#d21f27] hover:bg-[#b51a21] text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>
                        {isNegotiating
                          ? isFr
                            ? "Envoi..."
                            : "Submitting..."
                          : isFr
                          ? "Soumettre pour Négociation"
                          : "Submit for Negotiation"}
                      </span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* 2. NEGOTIATING BANNER (if client previously declined) */}
          {isClientRejected && (
            <div className="p-4 bg-purple-50/90 border border-purple-200 rounded-xl text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-purple-900">
                  <PhoneCall className="w-4 h-4 text-purple-700" />
                  <span>{isFr ? "Négociation en Cours avec la Répartition" : "Negotiation in Progress with Dispatch"}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-purple-200 text-purple-900 font-bold text-[10px]">
                  {isFr ? "EN ATTENTE D'APPEL" : "CALLBACK PENDING"}
                </span>
              </div>
              <p className="text-purple-800 leading-relaxed">
                {isFr
                  ? `Vous avez refusé le tarif initial et demandé une réévaluation tarifaire. Notre équipe communiquera avec vous au `
                  : `You declined the offered rate and requested a revised quote. Our freight specialist will reach out to you at `}
                <strong className="font-mono text-purple-950 font-bold">
                  {quote.clientNegotiationPhone || quote.clientPhone || "your phone"}
                </strong>
                .
              </p>
              {quote.clientRejectionReason && (
                <div className="p-2.5 bg-white/80 rounded-lg border border-purple-100 text-[11px] text-purple-900">
                  <strong>{isFr ? "Motif enregistré : " : "Your stated feedback: "}</strong>
                  <span>{quote.clientRejectionReason}</span>
                </div>
              )}
            </div>
          )}

          {/* 3. REJECTION ALERT (if rejected by admin dispatch) */}
          {isRejected && (
            <div className="p-4 bg-red-50/80 border-l-4 border-[#d21f27] rounded-xl text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-red-900">
                <ShieldAlert className="w-4 h-4 text-[#d21f27]" />
                <span>
                  {isFr
                    ? "Motif de Refus de l'Administration Transimex"
                    : "Transimex Dispatch Rejection Notice"}
                </span>
              </div>
              <p className="text-red-800 leading-relaxed pl-6 font-medium">
                {quote.rejectionReason || "No reason was provided."}
              </p>
            </div>
          )}

          {/* Route Overview */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {isFr ? "Itinéraire & Adresses" : "Route & Logistics Corridor"}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{isFr ? "Origine" : "Origin"}</span>
                </div>
                <p className="text-slate-600 pl-5 leading-relaxed font-medium">
                  {quote.originDetail || quote.origin}
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <MapPin className="w-4 h-4 text-[#d21f27] flex-shrink-0" />
                  <span>{isFr ? "Destination" : "Destination"}</span>
                </div>
                <p className="text-slate-600 pl-5 leading-relaxed font-medium">
                  {quote.destinationDetail || quote.destination}
                </p>
              </div>
            </div>
          </div>

          {/* Freight & Equipment Specs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                {isFr ? "Mode" : "Mode"}
              </span>
              <span className="font-bold text-slate-900 mt-0.5 block truncate">
                {quote.transportMode}
              </span>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                {isFr ? "Équipement" : "Equipment"}
              </span>
              <span className="font-bold text-slate-900 mt-0.5 block truncate">
                {quote.equipment}
              </span>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                {isFr ? "Poids" : "Weight"}
              </span>
              <span className="font-bold text-slate-900 mt-0.5 block">
                {quote.weight}
              </span>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                {isFr ? "Marchandise" : "Commodity"}
              </span>
              <span className="font-bold text-slate-900 mt-0.5 block truncate">
                {quote.commodity}
              </span>
            </div>
          </div>

          {/* Status info for pending review */}
          {isPending && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-600">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>
                  {isFr
                    ? "Tarif en cours de calcul par la répartition"
                    : "Tariff calculation in progress by Transimex dispatch"}
                </span>
              </div>
              <span className="font-mono font-bold text-slate-800">
                {quote.priceCad || "Pending"}
              </span>
            </div>
          )}

          {/* Admin / Dispatch Notes */}
          {quote.adminNotes && (
            <div className="text-xs text-slate-500 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
              <span className="font-bold text-slate-700 block mb-0.5">
                {isFr ? "Notes de Répartition :" : "Dispatch Note:"}
              </span>
              <p>{quote.adminNotes}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-5 mt-5 border-t border-slate-100">
          <div className="text-[11px] text-slate-400">
            {isFr ? "Soumis le :" : "Submitted:"} {quote.submittedDate} &bull; {isFr ? "Validité :" : "Valid until:"} {quote.validUntil}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              {isFr ? "Fermer" : "Close"}
            </button>

            {isAccepted && quote.shipmentId && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.push(`/dashboard/shipments?id=${quote.shipmentId}`);
                }}
                className="px-4 py-2 bg-[#0B2545] hover:bg-[#123661] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <span>{isFr ? "Voir l'Expédition" : "View Shipment"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {isPending && (
              <button
                type="button"
                disabled={expediting}
                onClick={async () => {
                  setExpediting(true);
                  try {
                    await fetch("/api/support", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        subject: `Priority expedite request for quote ${quote.id}`,
                        category: "General Logistics Inquiry",
                        linkedShipmentId: "",
                        priority: "High",
                        message: `Please expedite pricing review for freight quote ${quote.id} (${quote.origin} → ${quote.destination}).`,
                      }),
                    });
                    onClose();
                  } catch {
                    // Non-critical
                  } finally {
                    setExpediting(false);
                  }
                }}
                className="px-4 py-2 bg-[#d21f27] hover:bg-[#b51a21] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-60"
              >
                {expediting
                  ? isFr
                    ? "Envoi..."
                    : "Sending..."
                  : isFr
                  ? "Accélérer la Réponse"
                  : "Expedite Quote"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

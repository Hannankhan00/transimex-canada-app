"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { QuoteItem } from "@/lib/quoteTypes";
import StatusBadge from "./StatusBadge";
import RejectionModal from "./RejectionModal";
import {
  X,
  Truck,
  MapPin,
  Calendar,
  DollarSign,
  FileText,
  User,
  Building2,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Package,
  Layers,
  Sparkles,
  Send,
  Clock,
  Edit3,
} from "lucide-react";

interface QuoteReviewDrawerProps {
  quote: QuoteItem | null;
  isOpen: boolean;
  onClose: () => void;
  onQuoteUpdated: (updatedQuote: QuoteItem) => void;
}

export default function QuoteReviewDrawer({
  quote,
  isOpen,
  onClose,
  onQuoteUpdated,
}: QuoteReviewDrawerProps) {
  // Rate Breakdown State
  const [currency, setCurrency] = useState<"CAD" | "USD">("CAD");
  const [lineHaul, setLineHaul] = useState("");
  const [fuelSurcharge, setFuelSurcharge] = useState("");
  const [crossBorderFee, setCrossBorderFee] = useState("");
  const [accessorials, setAccessorials] = useState("");
  const [totalRate, setTotalRate] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  // Action states
  const [isAccepting, setIsAccepting] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [conversionSuccess, setConversionSuccess] = useState<{
    trackingId: string;
    message: string;
  } | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  // Initialize drawer inputs from quote
  useEffect(() => {
    if (quote) {
      setAdminNotes(quote.adminNotes || "");
      setConversionSuccess(null);
      setActionError(null);

      if (quote.breakdown) {
        setLineHaul(quote.breakdown.lineHaul || "");
        setFuelSurcharge(quote.breakdown.fuelSurcharge || "");
        setCrossBorderFee(quote.breakdown.crossBorderFee || "");
        setAccessorials(quote.breakdown.accessorials || "");
        setTotalRate(quote.breakdown.total || quote.priceCad || "");
      } else if (quote.priceCad && quote.priceCad !== "Pending Rate Calculation" && !quote.priceCad.includes("Pending")) {
        setTotalRate(quote.priceCad);
        setLineHaul(quote.priceCad);
      } else {
        // Defaults for quick evaluation
        setLineHaul("4,850.00");
        setFuelSurcharge("650.00");
        setCrossBorderFee("150.00");
        setAccessorials("200.00");
        setTotalRate("$5,850.00 CAD");
      }
    }
  }, [quote]);

  // Recalculate total when individual fields change
  const handleRecalculateTotal = (
    lh: string,
    fuel: string,
    cb: string,
    acc: string
  ) => {
    const parseVal = (str: string) => {
      const cleaned = str.replace(/[^0-9.]/g, "");
      return parseFloat(cleaned) || 0;
    };
    const total = parseVal(lh) + parseVal(fuel) + parseVal(cb) + parseVal(acc);
    if (total > 0) {
      setTotalRate(`$${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`);
    }
  };

  if (!isOpen || !quote) return null;

  const isAccepted = quote.status === "accepted";
  const isRejected = quote.status === "rejected";

  // Handle Accept & Generate Shipment
  const handleAcceptAndGenerateShipment = async () => {
    setActionError(null);
    if (!totalRate || totalRate.trim() === "") {
      setActionError("Please input or calculate a final freight rate before accepting.");
      return;
    }

    try {
      setIsAccepting(true);
      const res = await fetch(`/api/admin/quotes/${encodeURIComponent(quote.id)}/accept`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceCad: totalRate,
          breakdown: {
            lineHaul: `$${lineHaul} ${currency}`,
            fuelSurcharge: `$${fuelSurcharge} ${currency}`,
            crossBorderFee: `$${crossBorderFee} ${currency}`,
            accessorials: `$${accessorials} ${currency}`,
            total: totalRate,
          },
          adminNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to convert quote into shipment");
      }

      setConversionSuccess({
        trackingId: data.trackingId,
        message: data.message || "Shipment created successfully",
      });

      if (data.quote) {
        onQuoteUpdated(data.quote);
      }
    } catch (err: any) {
      setActionError(err.message || "Failed to process quote acceptance");
    } finally {
      setIsAccepting(false);
    }
  };

  // Handle Save Internal Notes / Mark Reviewing
  const handleSaveNotes = async (newStatus?: "reviewing") => {
    setActionError(null);
    try {
      setIsSavingNotes(true);
      const res = await fetch(`/api/admin/quotes/${encodeURIComponent(quote.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminNotes,
          ...(newStatus ? { status: newStatus } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save internal notes");
      }

      onQuoteUpdated(data.quote || { ...quote, adminNotes, status: newStatus || quote.status });
    } catch (err: any) {
      setActionError(err.message || "Failed to save internal notes");
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Handle Rejection
  const handleConfirmRejection = async (reason: string, notes?: string) => {
    const res = await fetch(`/api/admin/quotes/${encodeURIComponent(quote.id)}/reject`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reason,
        adminNotes: notes || adminNotes,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to reject quote");
    }

    if (data.quote) {
      onQuoteUpdated(data.quote);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Drawer Container */}
      <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-250">
        {/* Drawer Header */}
        <div className="p-5 sm:p-6 bg-[#0B2545] text-white flex items-center justify-between border-b border-white/10 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-white/10 text-slate-200">
                {quote.id}
              </span>
              <StatusBadge status={quote.status} size="sm" />
            </div>
            <h2
              className="text-xl sm:text-2xl font-bold tracking-tight mt-1 text-white"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Freight Assessment &amp; Rate Assignment
            </h2>
            <p className="text-slate-300 text-xs mt-0.5">
              Submitted on {quote.submittedDate} &bull; Valid until {quote.validUntil}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
            aria-label="Close Drawer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Action Error Alert */}
        {actionError && (
          <div className="p-3.5 bg-red-50 border-b border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Auto-Conversion Success Banner */}
        {conversionSuccess && (
          <div className="p-4 bg-emerald-50 border-b border-emerald-200 text-emerald-900 flex items-start gap-3 animate-in zoom-in-95 duration-150">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-emerald-800 text-sm">
                Shipment Generated Successfully!
              </p>
              <p className="mt-0.5 text-emerald-700 leading-relaxed">
                Unique Tracking ID assigned:{" "}
                <span className="font-mono font-bold text-[#0B2545] bg-emerald-100 px-1.5 py-0.5 rounded">
                  {conversionSuccess.trackingId}
                </span>
                . Resend email dispatched to client with tracking portal link.
              </p>
              <div className="mt-2 flex items-center gap-3">
                <Link
                  href={`/dashboard/shipments?id=${conversionSuccess.trackingId}`}
                  target="_blank"
                  className="inline-flex items-center gap-1 font-bold text-[#0B2545] hover:underline"
                >
                  View Shipment in Portal <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Linked Shipment Notice if already accepted */}
        {isAccepted && quote.shipmentId && !conversionSuccess && (
          <div className="p-3.5 bg-emerald-50/80 border-b border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-700" />
              <span>
                Active Shipment:{" "}
                <strong className="font-mono font-bold">{quote.shipmentId}</strong>
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-bold text-[10px]">
              DISPATCHED
            </span>
          </div>
        )}

        {/* Rejection Notice if rejected */}
        {isRejected && (
          <div className="p-3.5 bg-red-50 border-b border-red-200 text-xs text-red-900 space-y-1">
            <div className="flex items-center gap-2 font-bold text-red-800">
              <XCircle className="w-4 h-4 text-[#d21f27]" />
              <span>Quote Declined by Transimex Operations</span>
            </div>
            {quote.rejectionReason && (
              <p className="text-[11px] text-red-700 pl-6 leading-snug">
                <strong>Reason:</strong> {quote.rejectionReason}
              </p>
            )}
          </div>
        )}

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-xs text-slate-700 select-text">
          {/* 1. ROUTE CORRIDOR PANE */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="font-bold uppercase tracking-wider text-[11px] text-slate-500 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#d21f27]" /> Route &amp; Facilities
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                {quote.transportMode}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Origin Terminal</span>
                <p className="font-bold text-slate-900 text-sm">{quote.origin}</p>
                <p className="text-slate-500 text-[11px] mt-0.5 leading-snug">{quote.originDetail}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Destination Terminal</span>
                <p className="font-bold text-slate-900 text-sm">{quote.destination}</p>
                <p className="text-slate-500 text-[11px] mt-0.5 leading-snug">{quote.destinationDetail}</p>
              </div>
            </div>
          </div>

          {/* 2. CARGO SPECS PANE */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-bold uppercase tracking-wider text-[11px] text-slate-500 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-[#0B2545]" /> Cargo Specifications (Immutable)
              </span>
              <span className="text-[10px] font-bold text-[#d21f27]">
                {quote.cargoType || "General Freight"}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-semibold block">Total Weight</span>
                <span className="font-bold text-slate-900 text-xs">{quote.weight}</span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-semibold block">Pallet Count</span>
                <span className="font-bold text-slate-900 text-xs">{quote.palletCount || "FTL Volume"} Pallets</span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-400 font-semibold block">Trailer Equipment</span>
                <span className="font-bold text-slate-900 text-xs truncate block">{quote.equipment}</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-1 text-[11px]">
              <div>
                <strong className="text-slate-700">Commodity Description:</strong>{" "}
                <span className="text-slate-600">{quote.commodity}</span>
              </div>
              {quote.dimensions && (
                <div>
                  <strong className="text-slate-700">Dimensions:</strong>{" "}
                  <span className="text-slate-600">{quote.dimensions}</span>
                </div>
              )}
              {quote.preferredPickupDate && (
                <div>
                  <strong className="text-slate-700">Preferred Pickup Window:</strong>{" "}
                  <span className="text-slate-600">{quote.preferredPickupDate}</span>
                </div>
              )}
              {quote.specialInstructions && (
                <div className="p-2.5 bg-amber-50/80 border border-amber-200/60 rounded-xl text-amber-900 mt-2">
                  <strong className="block text-[10px] uppercase font-bold text-amber-800 mb-0.5">
                    Shipper Accessorial Requirements
                  </strong>
                  {quote.specialInstructions}
                </div>
              )}
            </div>
          </div>

          {/* 3. CLIENT INFORMATION PANE */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-bold uppercase tracking-wider text-[11px] text-slate-500 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#0B2545]" /> Client &amp; Enterprise Account
              </span>
              <Link
                href="/admin/clients"
                className="text-[11px] font-bold text-[#0B2545] hover:underline flex items-center gap-1"
              >
                Client Profile <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Company</span>
                  <span className="font-bold text-slate-900">{quote.clientCompany || "—"}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Contact Person</span>
                  <span className="font-bold text-slate-900">{quote.clientName || "—"}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Email</span>
                  <span className="font-semibold text-slate-800 truncate block">{quote.clientEmail || "—"}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Phone</span>
                  <span className="font-semibold text-slate-800">{quote.clientPhone || "+1 (514) 555-0199"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. RATE ASSIGNMENT & PRICING ENGINE */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-4 shadow-md">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="font-bold uppercase tracking-wider text-xs text-amber-400 flex items-center gap-2">
                <DollarSign className="w-4 h-4" /> Freight Rate Calculation Engine
              </span>
              <div className="flex items-center bg-white/10 rounded-lg p-0.5 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setCurrency("CAD");
                    handleRecalculateTotal(lineHaul, fuelSurcharge, crossBorderFee, accessorials);
                  }}
                  className={`px-2 py-1 rounded cursor-pointer ${
                    currency === "CAD" ? "bg-[#d21f27] text-white" : "text-slate-300"
                  }`}
                >
                  CAD
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurrency("USD");
                    handleRecalculateTotal(lineHaul, fuelSurcharge, crossBorderFee, accessorials);
                  }}
                  className={`px-2 py-1 rounded cursor-pointer ${
                    currency === "USD" ? "bg-[#d21f27] text-white" : "text-slate-300"
                  }`}
                >
                  USD
                </button>
              </div>
            </div>

            {/* Breakdown Inputs */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Linehaul Base Rate ({currency})</label>
                <input
                  type="text"
                  placeholder="4,850.00"
                  value={lineHaul}
                  disabled={isAccepted}
                  onChange={(e) => {
                    setLineHaul(e.target.value);
                    handleRecalculateTotal(e.target.value, fuelSurcharge, crossBorderFee, accessorials);
                  }}
                  className="w-full bg-white/10 border border-white/15 focus:border-[#d21f27] rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Fuel Surcharge ({currency})</label>
                <input
                  type="text"
                  placeholder="650.00"
                  value={fuelSurcharge}
                  disabled={isAccepted}
                  onChange={(e) => {
                    setFuelSurcharge(e.target.value);
                    handleRecalculateTotal(lineHaul, e.target.value, crossBorderFee, accessorials);
                  }}
                  className="w-full bg-white/10 border border-white/15 focus:border-[#d21f27] rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Cross-Border / Customs ({currency})</label>
                <input
                  type="text"
                  placeholder="150.00"
                  value={crossBorderFee}
                  disabled={isAccepted}
                  onChange={(e) => {
                    setCrossBorderFee(e.target.value);
                    handleRecalculateTotal(lineHaul, fuelSurcharge, e.target.value, accessorials);
                  }}
                  className="w-full bg-white/10 border border-white/15 focus:border-[#d21f27] rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Accessorials &amp; Tailgate</label>
                <input
                  type="text"
                  placeholder="200.00"
                  value={accessorials}
                  disabled={isAccepted}
                  onChange={(e) => {
                    setAccessorials(e.target.value);
                    handleRecalculateTotal(lineHaul, fuelSurcharge, crossBorderFee, e.target.value);
                  }}
                  className="w-full bg-white/10 border border-white/15 focus:border-[#d21f27] rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                />
              </div>
            </div>

            {/* Total Rate Display */}
            <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  Final Calculated Freight Rate
                </span>
                <input
                  type="text"
                  value={totalRate}
                  disabled={isAccepted}
                  onChange={(e) => setTotalRate(e.target.value)}
                  placeholder="$5,850.00 CAD"
                  className="text-xl sm:text-2xl font-bold text-amber-400 bg-transparent border-none outline-none font-mono block w-full mt-0.5"
                />
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                BINDING TARIFF
              </span>
            </div>
          </div>

          {/* 5. INTERNAL DISPATCH NOTES */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="font-bold uppercase tracking-wider text-[11px] text-slate-500 flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5 text-[#0B2545]" /> Internal Notes (Staff Eyes Only)
              </span>
              {quote.status === "under_review" && (
                <button
                  type="button"
                  onClick={() => handleSaveNotes("reviewing")}
                  disabled={isSavingNotes}
                  className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  Mark as In Review
                </button>
              )}
            </div>

            <textarea
              rows={2}
              placeholder="Internal pricing calculation notes, carrier inquiries, or equipment staging status..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-[#0B2545] focus:bg-white rounded-xl p-3 text-xs text-slate-800 outline-none transition"
            />
          </div>
        </div>

        {/* Drawer Action Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {!isRejected && (
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(true)}
                className="flex-1 sm:flex-none justify-center px-3.5 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-100/70 border border-red-200 transition cursor-pointer flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject Quote</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleSaveNotes()}
              disabled={isSavingNotes}
              className="flex-1 sm:flex-none justify-center px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-200 border border-slate-200 transition cursor-pointer"
            >
              {isSavingNotes ? "Saving..." : "Save Notes"}
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {!isAccepted ? (
              <button
                type="button"
                onClick={handleAcceptAndGenerateShipment}
                disabled={isAccepting}
                className="w-full sm:w-auto justify-center px-5 py-2.5 bg-[#d21f27] hover:bg-[#b51a21] text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isAccepting ? "Converting..." : "Accept & Generate Shipment"}</span>
              </button>
            ) : (
              <div className="w-full sm:w-auto justify-center px-4 py-2 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Accepted &amp; Dispatched</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rejection Modal */}
      <RejectionModal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        quoteId={quote.id}
        clientName={quote.clientName || "Client"}
        clientCompany={quote.clientCompany}
        onConfirm={handleConfirmRejection}
      />
    </div>
  );
}

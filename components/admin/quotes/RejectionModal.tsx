"use client";

import React, { useState } from "react";
import { X, AlertTriangle, Send, ShieldAlert } from "lucide-react";

interface RejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  quoteId: string;
  clientName: string;
  clientCompany?: string;
  onConfirm: (reason: string, adminNotes?: string) => Promise<void>;
}

const STANDARDIZED_REASONS = [
  "Route Unavailable / Corridors Currently Restricted or Out of Authority",
  "Cargo Type Restricted: Hazardous or Prohibited Materials Unsupported",
  "Axle Load Limit Exceeded: Highway corridor thaw weight limits prevent heavy haul",
  "Equipment Capacity Exhausted: No compliant 53' Reefer/Flatbed units available in requested window",
  "Transit Time Infeasible: Standard highway hours of service cannot meet requested ETA",
  "Custom Operational Explanation",
];

export default function RejectionModal({
  isOpen,
  onClose,
  quoteId,
  clientName,
  clientCompany,
  onConfirm,
}: RejectionModalProps) {
  const [selectedReason, setSelectedReason] = useState(STANDARDIZED_REASONS[0]);
  const [customExplanation, setCustomExplanation] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const isCustom = selectedReason === "Custom Operational Explanation";
    if (isCustom && !customExplanation.trim()) {
      setError("Please provide an explicit explanation for the custom decline reason.");
      return;
    }

    const finalReason = isCustom
      ? customExplanation.trim()
      : customExplanation.trim()
      ? `${selectedReason}: ${customExplanation.trim()}`
      : selectedReason;

    try {
      setLoading(true);
      await onConfirm(finalReason, internalNotes);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to submit quote rejection");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-100 text-[#d21f27] flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-bold text-[#0B2545] text-base leading-tight">
                Decline Freight Request
              </h3>
              <p className="text-[11px] text-slate-500">
                Reference: <span className="font-mono font-bold text-slate-700">{quoteId}</span> &bull; {clientName}
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
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Standardized Reason */}
          <div>
            <label className="font-bold text-slate-800 block mb-1">
              Standardized Decline Reason <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-[#0B2545] focus:bg-white rounded-xl px-3 py-2 text-xs text-slate-800 outline-none transition"
            >
              {STANDARDIZED_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Explanation to client */}
          <div>
            <label className="font-bold text-slate-800 block mb-1">
              Detailed Explanation for Client Notification
            </label>
            <textarea
              rows={3}
              placeholder="Provide context or instructions for alternative freight booking..."
              value={customExplanation}
              onChange={(e) => setCustomExplanation(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-[#0B2545] focus:bg-white rounded-xl p-3 text-xs text-slate-800 outline-none transition"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              This message will be included in the automated client email notification.
            </p>
          </div>

          {/* Internal Staff Notes */}
          <div>
            <label className="font-bold text-slate-800 block mb-1">
              Internal Dispatch Audit Log (Staff Eyes Only)
            </label>
            <input
              type="text"
              placeholder="e.g. Advised by driver dispatch Hamza, carrier fleet rate too high"
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-[#0B2545] focus:bg-white rounded-xl px-3 py-2 text-xs text-slate-800 outline-none transition"
            />
          </div>

          {/* Warning Banner */}
          <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-[11px] text-amber-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="leading-snug">
              Declining this quote will mark status as <strong>Rejected</strong> and trigger an automated email to{" "}
              <strong>{clientCompany || clientName}</strong>.
            </p>
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-[#d21f27] hover:bg-[#b51a21] text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{loading ? "Processing..." : "Confirm & Send Rejection"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

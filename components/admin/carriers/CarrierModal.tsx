"use client";

import React, { useState, useEffect } from "react";
import { CarrierVendor, TransportModeType, VendorStatusType } from "@/lib/carrierTypes";
import {
  X,
  Truck,
  Ship,
  Plane,
  Train,
  Shield,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Save,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface CarrierModalProps {
  isOpen: boolean;
  onClose: () => void;
  carrierToEdit?: CarrierVendor | null;
  onCarrierSaved: (carrier: CarrierVendor) => void;
}

export default function CarrierModal({
  isOpen,
  onClose,
  carrierToEdit,
  onCarrierSaved,
}: CarrierModalProps) {
  const isEditing = !!carrierToEdit;

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [primaryMode, setPrimaryMode] = useState<TransportModeType>("Road");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [headquarters, setHeadquarters] = useState("");
  const [operatingLanesStr, setOperatingLanesStr] = useState("");
  const [fleetSize, setFleetSize] = useState("");
  const [rating, setRating] = useState("4.8");
  const [policyNumber, setPolicyNumber] = useState("");
  const [coverageAmount, setCoverageAmount] = useState("$5,000,000 CAD");
  const [expiryDate, setExpiryDate] = useState("2027-12-31");
  const [status, setStatus] = useState<VendorStatusType>("Active");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (carrierToEdit) {
      setName(carrierToEdit.name);
      setCode(carrierToEdit.code);
      setPrimaryMode(carrierToEdit.primaryMode);
      setContactName(carrierToEdit.dispatchContact.name);
      setPhone(carrierToEdit.dispatchContact.phone);
      setEmail(carrierToEdit.dispatchContact.email);
      setEmergencyPhone(carrierToEdit.dispatchContact.emergencyPhone || "");
      setHeadquarters(carrierToEdit.headquarters);
      setOperatingLanesStr(carrierToEdit.operatingLanes.join(", "));
      setFleetSize(carrierToEdit.fleetSize);
      setRating(carrierToEdit.rating.toString());
      setPolicyNumber(carrierToEdit.insurance.policyNumber);
      setCoverageAmount(carrierToEdit.insurance.coverageAmount);
      setExpiryDate(carrierToEdit.insurance.expiryDate);
      setStatus(carrierToEdit.status);
      setNotes(carrierToEdit.notes || "");
    } else {
      // Reset defaults for new partner
      setName("");
      setCode("");
      setPrimaryMode("Road");
      setContactName("");
      setPhone("");
      setEmail("");
      setEmergencyPhone("");
      setHeadquarters("Montreal, QC");
      setOperatingLanesStr("Montreal <-> Detroit, Toronto <-> Chicago");
      setFleetSize("50+ Dedicated Units");
      setRating("4.8");
      setPolicyNumber(`POL-${Math.floor(1000 + Math.random() * 9000)}`);
      setCoverageAmount("$5,000,000 CAD");
      setExpiryDate("2027-12-31");
      setStatus("Active");
      setNotes("");
    }
  }, [carrierToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !code.trim() || !phone.trim() || !email.trim()) {
      setError("Carrier Name, SCAC/Code, Dispatch Phone, and Email are required.");
      return;
    }

    const lanes = operatingLanesStr
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean);

    const payload = {
      name,
      code: code.toUpperCase(),
      primaryMode,
      supportedModes: [primaryMode],
      dispatchContact: {
        name: contactName || "Primary Dispatch Desk",
        phone,
        email,
        emergencyPhone,
      },
      headquarters,
      operatingLanes: lanes,
      fleetSize: fleetSize || "Dedicated Units",
      rating: parseFloat(rating) || 4.8,
      insurance: {
        policyNumber,
        coverageAmount,
        expiryDate,
        isCompliant: true,
      },
      status,
      notes,
    };

    try {
      setLoading(true);
      const url = isEditing
        ? `/api/admin/carriers/${encodeURIComponent(carrierToEdit.id)}`
        : "/api/admin/carriers";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save carrier details");
      }

      onCarrierSaved(data.carrier);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save carrier");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0B2545] text-white flex items-center justify-center flex-shrink-0">
              <Truck className="w-5 h-5 text-[#d21f27]" />
            </div>
            <div>
              <h3 className="font-bold text-[#0B2545] text-base leading-tight">
                {isEditing ? `Edit Logistics Partner: ${carrierToEdit.name}` : "Add New Logistics Carrier Partner"}
              </h3>
              <p className="text-[11px] text-slate-500">
                Register authorized carrier credentials, compliance insurance, and standard operating corridors.
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

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Section 1: Carrier Entity Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="font-bold text-slate-700 block mb-1">Company Name</label>
              <input
                type="text"
                placeholder="e.g. Bison Transport Expedited"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#0B2545] focus:bg-white rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">SCAC / DOT Code</label>
              <input
                type="text"
                placeholder="e.g. BISO"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#0B2545] focus:bg-white rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 outline-none uppercase"
              />
            </div>
          </div>

          {/* Section 2: Mode & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Primary Mode</label>
              <select
                value={primaryMode}
                onChange={(e) => setPrimaryMode(e.target.value as TransportModeType)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none"
              >
                <option value="Road">Road (Highway)</option>
                <option value="Sea">Sea (Maritime)</option>
                <option value="Air">Air (Express)</option>
                <option value="Rail">Rail (Intermodal)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Carrier Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as VendorStatusType)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none"
              >
                <option value="Active">Active &amp; Compliant</option>
                <option value="Under Review">Under Review</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Reliability Rating (1.0 - 5.0)</label>
              <input
                type="number"
                step="0.1"
                min="1.0"
                max="5.0"
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
              />
            </div>
          </div>

          {/* Section 3: Dispatch Contacts */}
          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Primary Dispatch Contact
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Dispatcher Name</label>
                <input
                  type="text"
                  placeholder="e.g. Greg Sutherland"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Dispatch Hotline Phone</label>
                <input
                  type="text"
                  placeholder="+1 (800) 555-0199"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Dispatch Notification Email</label>
                <input
                  type="email"
                  placeholder="dispatch@carrier.ca"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Emergency 24/7 Phone</label>
                <input
                  type="text"
                  placeholder="+1 (514) 555-9988"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Operational Corridors & Fleet */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Headquarters Terminal</label>
              <input
                type="text"
                placeholder="e.g. Winnipeg, MB"
                value={headquarters}
                onChange={(e) => setHeadquarters(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Fleet Description</label>
              <input
                type="text"
                placeholder="e.g. 450+ Dry Van & Reefer Tandems"
                value={fleetSize}
                onChange={(e) => setFleetSize(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-bold text-slate-700 block mb-1">
                Standard Operating Lanes (Comma-separated)
              </label>
              <input
                type="text"
                placeholder="e.g. Montreal <-> Detroit, Toronto <-> Chicago, Calgary <-> Vancouver"
                value={operatingLanesStr}
                onChange={(e) => setOperatingLanesStr(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
              />
            </div>
          </div>

          {/* Section 5: Insurance & Compliance */}
          <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/80 space-y-3">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
              Insurance &amp; Regulatory Compliance
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Policy Number</label>
                <input
                  type="text"
                  placeholder="POL-BISO-99824"
                  value={policyNumber}
                  onChange={(e) => setPolicyNumber(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Coverage Limit</label>
                <input
                  type="text"
                  placeholder="$10,000,000 CAD"
                  value={coverageAmount}
                  onChange={(e) => setCoverageAmount(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 6: Internal Notes */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">Internal Operations Notes</label>
            <textarea
              rows={2}
              placeholder="Dispatch instructions, preferred equipment types, performance observations..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none"
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-[#0B2545] hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5 text-[#d21f27]" />
              <span>{loading ? "Saving Partner..." : isEditing ? "Update Partner" : "Add Carrier Partner"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

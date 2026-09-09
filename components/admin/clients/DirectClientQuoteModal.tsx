"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Check,
  Copy,
  Building2,
  User,
  Mail,
  Phone,
  Truck,
  DollarSign,
  MapPin,
  Calendar,
  Sparkles,
  ShieldCheck,
  Layers,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  ExternalLink,
  Info,
} from "lucide-react";

interface DirectClientQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const TRANSPORT_MODES = [
  "53' Dry Van (Standard)",
  "53' Temperature-Controlled Reefer",
  "Flatbed / Step Deck (Specialized)",
  "LTL Consolidated (Palletized)",
  "Dedicated Team Expedited",
  "Intermodal Rail + Drayage",
];

const INDUSTRIES = [
  "Industrial",
  "Manufacturing",
  "Automotive",
  "Pharma",
  "Retail",
  "Food",
  "Other",
];

const PROVINCES = ["QC", "ON", "BC", "AB", "MB", "SK", "NS", "NB", "NL", "PE", "NT", "YT", "NU"];

export default function DirectClientQuoteModal({
  isOpen,
  onClose,
  onSuccess,
}: DirectClientQuoteModalProps) {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Success State
  const [successData, setSuccessData] = useState<{
    user: {
      name: string;
      email: string;
      companyName: string;
      isNewUser: boolean;
      temporaryPassword?: string | null;
    };
    quote: {
      id: string;
      status: string;
      priceCad: string;
      origin: string;
      destination: string;
      commodity: string;
      transportMode: string;
      validUntil: string;
    };
  } | null>(null);
  const [copiedPass, setCopiedPass] = useState(false);

  // Form State: Client Profile
  const [clientName, setClientName] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [industry, setIndustry] = useState("Industrial");
  const [city, setCity] = useState("Montreal");
  const [province, setProvince] = useState("QC");
  const [billingAddress, setBillingAddress] = useState("");

  // Form State: Cargo & Route
  const [originCity, setOriginCity] = useState("Montreal");
  const [originProvince, setOriginProvince] = useState("QC");
  const [originPostal, setOriginPostal] = useState("");
  const [destinationCity, setDestinationCity] = useState("Toronto");
  const [destinationProvince, setDestinationProvince] = useState("ON");
  const [destinationPostal, setDestinationPostal] = useState("");
  const [transportMode, setTransportMode] = useState("53' Dry Van (Standard)");
  const [equipment, setEquipment] = useState("");
  const [commodity, setCommodity] = useState("");
  const [weightLbs, setWeightLbs] = useState("");
  const [palletCount, setPalletCount] = useState("");
  const [dimLengthIn, setDimLengthIn] = useState("");
  const [dimWidthIn, setDimWidthIn] = useState("");
  const [dimHeightIn, setDimHeightIn] = useState("");
  const [cargoType, setCargoType] = useState<"General Freight" | "Hazardous Materials" | "Perishable / Cold-Chain" | "Heavy Haul Oversize">("General Freight");
  const [pickupDate, setPickupDate] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");

  // Form State: Agreed Pricing
  const [priceCad, setPriceCad] = useState("");
  const [priceUsd, setPriceUsd] = useState("");
  const [validUntil, setValidUntil] = useState("7 Business Days from Issuance");
  const [adminNotes, setAdminNotes] = useState("");

  if (!isOpen) return null;

  const handleResetForm = () => {
    setActiveStep(1);
    setSubmitting(false);
    setErrorMsg(null);
    setSuccessData(null);
    setCopiedPass(false);
    setClientName("");
    setClientCompany("");
    setClientEmail("");
    setClientPhone("");
    setCommodity("");
    setWeightLbs("");
    setPalletCount("");
    setPriceCad("");
    setPriceUsd("");
    setAdminNotes("");
  };

  const handleClose = () => {
    handleResetForm();
    onClose();
  };

  const validateStep1 = () => {
    if (!clientName.trim()) {
      setErrorMsg("Please enter the client's full contact name.");
      return false;
    }
    if (!clientEmail.trim() || !clientEmail.includes("@")) {
      setErrorMsg("Please enter a valid corporate email address.");
      return false;
    }
    setErrorMsg(null);
    return true;
  };

  const validateStep2 = () => {
    if (!originCity.trim() || !destinationCity.trim()) {
      setErrorMsg("Origin and destination cities are required.");
      return false;
    }
    if (!commodity.trim()) {
      setErrorMsg("Please provide a commodity description.");
      return false;
    }
    if (!weightLbs.trim() || isNaN(Number(weightLbs.replace(/[^0-9.]/g, "")))) {
      setErrorMsg("Please provide a valid freight weight (lbs).");
      return false;
    }
    setErrorMsg(null);
    return true;
  };

  const validateStep3 = () => {
    if (!priceCad.trim() || isNaN(Number(priceCad.replace(/[^0-9.]/g, "")))) {
      setErrorMsg("Please provide a valid agreed freight tariff (CAD).");
      return false;
    }
    setErrorMsg(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep1() || !validateStep2() || !validateStep3()) return;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/admin/clients/direct-onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName,
          clientCompany,
          clientEmail,
          clientPhone,
          industry,
          city,
          province,
          billingAddress,
          originCity,
          originProvince,
          originPostal,
          destinationCity,
          destinationProvince,
          destinationPostal,
          transportMode,
          equipment: equipment || transportMode,
          commodity,
          weightLbs,
          palletCount,
          dimLengthIn,
          dimWidthIn,
          dimHeightIn,
          cargoType,
          pickupDate,
          specialInstructions,
          priceCad,
          priceUsd,
          validUntil,
          adminNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to onboard client and generate quote.");
      }

      setSuccessData({
        user: data.user,
        quote: data.quote,
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error("Direct onboarding error:", err);
      setErrorMsg(err.message || "An unexpected error occurred during onboarding.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPass(true);
    setTimeout(() => setCopiedPass(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* HEADER BAR */}
        <div className="bg-[#0B2545] text-white px-6 py-5 flex items-center justify-between relative">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#d21f27] bg-white/10 px-2 py-0.5 rounded-sm">
                In-Person &amp; Direct Consultation
              </span>
              <span className="text-[10px] text-slate-300 font-mono">ADMIN WORKFLOW</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight mt-1 flex items-center gap-2">
              <span>Direct Client Onboarding &amp; Pre-Priced Quote</span>
            </h2>
            <p className="text-xs text-slate-300 mt-0.5 max-w-xl">
              Provisions a client account with an auto-generated password and issues a pre-priced freight quote ready for immediate client acceptance.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* STEP PROGRESS TRACKER (Only shown when not in success view) */}
        {!successData && (
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-6 sm:gap-8">
              {/* Step 1 */}
              <button
                type="button"
                onClick={() => setActiveStep(1)}
                className={`flex items-center gap-2 font-semibold transition cursor-pointer ${
                  activeStep === 1 ? "text-[#0B2545]" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    activeStep === 1
                      ? "bg-[#0B2545] text-white"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  1
                </div>
                <span>Client Profile</span>
              </button>

              <ArrowRight className="w-3.5 h-3.5 text-slate-300" />

              {/* Step 2 */}
              <button
                type="button"
                onClick={() => {
                  if (validateStep1()) setActiveStep(2);
                }}
                className={`flex items-center gap-2 font-semibold transition cursor-pointer ${
                  activeStep === 2 ? "text-[#0B2545]" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    activeStep === 2
                      ? "bg-[#0B2545] text-white"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  2
                </div>
                <span>Route &amp; Cargo Specs</span>
              </button>

              <ArrowRight className="w-3.5 h-3.5 text-slate-300" />

              {/* Step 3 */}
              <button
                type="button"
                onClick={() => {
                  if (validateStep1() && validateStep2()) setActiveStep(3);
                }}
                className={`flex items-center gap-2 font-semibold transition cursor-pointer ${
                  activeStep === 3 ? "text-[#0B2545]" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    activeStep === 3
                      ? "bg-[#0B2545] text-white"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  3
                </div>
                <span>Agreed Tariff</span>
              </button>
            </div>

            <span className="hidden sm:inline text-slate-500 font-mono text-[11px]">
              Step {activeStep} of 3
            </span>
          </div>
        )}

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-700 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ----------------- SUCCESS VIEW ----------------- */}
          {successData ? (
            <div className="space-y-6 py-2 animate-in fade-in zoom-in-95 duration-200">
              {/* Success Banner */}
              <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Check className="w-6 h-6 stroke-[3]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                      Onboarding Completed &amp; Quote Dispatched
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-bold font-mono">
                      READY FOR ACCEPTANCE
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                    Account Provisioned for {successData.user.name}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Quote <strong className="text-[#0B2545] font-mono">{successData.quote.id}</strong> has been created with agreed freight tariff of <strong className="text-emerald-700">{successData.quote.priceCad}</strong>. An email confirmation has been dispatched.
                  </p>
                </div>
              </div>

              {/* Login Credentials Box (Crucial for In-Person sharing) */}
              {successData.user.isNewUser && successData.user.temporaryPassword && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#0B2545] uppercase tracking-wider">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Generated Shipper Portal Credentials</span>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                      Share with client
                    </span>
                  </div>

                  <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-sans">
                        Client Username / Email
                      </span>
                      <span className="text-[#0B2545] font-bold select-all">
                        {successData.user.email}
                      </span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-sans">
                          Auto-Generated Password
                        </span>
                        <span className="text-[#d21f27] font-bold tracking-wider select-all">
                          {successData.user.temporaryPassword}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(
                            `Email: ${successData.user.email}\nPassword: ${successData.user.temporaryPassword}`
                          )
                        }
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-sans font-medium transition cursor-pointer flex items-center gap-1 shrink-0"
                        title="Copy credentials"
                      >
                        {copiedPass ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700 text-[11px] font-bold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-600" />
                            <span className="text-[11px]">Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 mt-2.5 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    These credentials have also been emailed to {successData.user.email}. The client can immediately sign in and click &quot;Accept Rate&quot; to initiate freight dispatch.
                  </p>
                </div>
              )}

              {/* Quote Snapshot Card */}
              <div className="bg-[#0B2545] text-white rounded-2xl p-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-300">
                      Dispatched Freight Quote
                    </span>
                    <div className="text-base font-bold font-mono text-white">
                      {successData.quote.id}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase tracking-wider text-slate-300">
                      Agreed Rate
                    </span>
                    <div className="text-lg font-bold text-emerald-400">
                      {successData.quote.priceCad}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Corridor</span>
                    <span className="font-semibold text-slate-100 truncate block">
                      {successData.quote.origin} &rarr; {successData.quote.destination}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Mode</span>
                    <span className="font-semibold text-slate-100 truncate block">
                      {successData.quote.transportMode}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Commodity</span>
                    <span className="font-semibold text-slate-100 truncate block">
                      {successData.quote.commodity}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Done &amp; Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    router.push("/admin/quotes");
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 bg-[#0B2545] hover:bg-[#133E6D] text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>View in Quote Pipeline</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            /* ----------------- MULTI-STEP INPUT FORM ----------------- */
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* STEP 1: CLIENT PROFILE */}
              {activeStep === 1 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3.5 text-xs text-blue-900 flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-semibold">Face-to-Face Onboarding:</strong> Enter the client&apos;s contact details. An activated account will be created with an auto-generated password and sent to their email along with the direct quote.
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Client Contact Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Jean-Pierre Tremblay"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#0B2545] bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Company / Commercial Entity Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Apex Industrial Manufacturing Ltd"
                        value={clientCompany}
                        onChange={(e) => setClientCompany(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#0B2545] bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Corporate Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. j.tremblay@apexmfg.com"
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#0B2545] bg-white"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Login credentials and quotation link will be delivered here.
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        placeholder="e.g. +1 (514) 555-0199"
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#0B2545] bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Industry Vertical
                      </label>
                      <select
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#0B2545] bg-white"
                      >
                        {INDUSTRIES.map((ind) => (
                          <option key={ind} value={ind}>
                            {ind}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#0B2545] bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Province
                      </label>
                      <select
                        value={province}
                        onChange={(e) => setProvince(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#0B2545] bg-white"
                      >
                        {PROVINCES.map((prov) => (
                          <option key={prov} value={prov}>
                            {prov}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Billing Address (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1420 Boulevard Saint-Laurent, Suite 400"
                      value={billingAddress}
                      onChange={(e) => setBillingAddress(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#0B2545] bg-white"
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: ROUTE & CARGO SPECIFICATIONS */}
              {activeStep === 2 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* Origin & Destination */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#0B2545]">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Origin Facility / Pickup</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          required
                          placeholder="Origin City (e.g. Montreal)"
                          value={originCity}
                          onChange={(e) => setOriginCity(e.target.value)}
                          className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white"
                        />
                        <select
                          value={originProvince}
                          onChange={(e) => setOriginProvince(e.target.value)}
                          className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white"
                        >
                          {PROVINCES.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </div>
                      <input
                        type="text"
                        placeholder="Postal Code / Terminal Details"
                        value={originPostal}
                        onChange={(e) => setOriginPostal(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                      />
                    </div>

                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#0B2545]">
                        <MapPin className="w-3.5 h-3.5 text-red-600" />
                        <span>Destination / Consignee</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          required
                          placeholder="Dest City (e.g. Toronto)"
                          value={destinationCity}
                          onChange={(e) => setDestinationCity(e.target.value)}
                          className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white"
                        />
                        <select
                          value={destinationProvince}
                          onChange={(e) => setDestinationProvince(e.target.value)}
                          className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white"
                        >
                          {PROVINCES.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </div>
                      <input
                        type="text"
                        placeholder="Postal Code / Consignee Details"
                        value={destinationPostal}
                        onChange={(e) => setDestinationPostal(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                      />
                    </div>
                  </div>

                  {/* Transport Mode & Commodity */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Transport Mode &amp; Trailer Equipment <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={transportMode}
                        onChange={(e) => setTransportMode(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#0B2545] bg-white"
                      >
                        {TRANSPORT_MODES.map((mode) => (
                          <option key={mode} value={mode}>
                            {mode}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Commodity Description <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Commercial Machinery, Auto Parts"
                        value={commodity}
                        onChange={(e) => setCommodity(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#0B2545] bg-white"
                      />
                    </div>
                  </div>

                  {/* Weight, Pallets, Cargo Classification */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Total Weight (lbs) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 38,500"
                        value={weightLbs}
                        onChange={(e) => setWeightLbs(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#0B2545] bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Pallet Count
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 26"
                        value={palletCount}
                        onChange={(e) => setPalletCount(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#0B2545] bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Cargo Classification
                      </label>
                      <select
                        value={cargoType}
                        onChange={(e: any) => setCargoType(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#0B2545] bg-white"
                      >
                        <option value="General Freight">General Freight</option>
                        <option value="Perishable / Cold-Chain">Perishable / Cold-Chain</option>
                        <option value="Hazardous Materials">Hazardous Materials</option>
                        <option value="Heavy Haul Oversize">Heavy Haul Oversize</option>
                      </select>
                    </div>
                  </div>

                  {/* Dimensions & Pickup Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Dimensions (L x W x H in inches)
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          placeholder="Length"
                          value={dimLengthIn}
                          onChange={(e) => setDimLengthIn(e.target.value)}
                          className="px-2.5 py-2 text-xs rounded-lg border border-slate-200 bg-white text-center"
                        />
                        <input
                          type="text"
                          placeholder="Width"
                          value={dimWidthIn}
                          onChange={(e) => setDimWidthIn(e.target.value)}
                          className="px-2.5 py-2 text-xs rounded-lg border border-slate-200 bg-white text-center"
                        />
                        <input
                          type="text"
                          placeholder="Height"
                          value={dimHeightIn}
                          onChange={(e) => setDimHeightIn(e.target.value)}
                          className="px-2.5 py-2 text-xs rounded-lg border border-slate-200 bg-white text-center"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Preferred Pickup Window
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Tomorrow 08:00 AM or Sep 12"
                        value={pickupDate}
                        onChange={(e) => setPickupDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#0B2545] bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Handling Instructions / Special Requirements
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Liftgate required at delivery; driver check-in at security dock #4."
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#0B2545] bg-white resize-none"
                    />
                  </div>
                </div>
              )}

              {/* STEP 3: AGREED PRICING & TERMS */}
              {activeStep === 3 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-900 flex items-start gap-2.5">
                    <DollarSign className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-semibold">Agreed Tariff (Pre-Approved):</strong> This price was agreed upon directly with the client. The quote will be issued in status <strong>&quot;Rate Offered&quot;</strong>, allowing the client to accept it with 1 click in their portal to generate the active shipment manifest.
                    </div>
                  </div>

                  {/* Pricing Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Agreed Freight Rate (CAD) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                          $
                        </span>
                        <input
                          type="text"
                          required
                          placeholder="2,450.00"
                          value={priceCad}
                          onChange={(e) => setPriceCad(e.target.value)}
                          className="w-full pl-8 pr-16 py-2.5 text-sm font-bold text-[#0B2545] rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#0B2545] bg-white"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                          CAD
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Equivalent Rate (USD, Optional)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                          $
                        </span>
                        <input
                          type="text"
                          placeholder="1,820.00"
                          value={priceUsd}
                          onChange={(e) => setPriceUsd(e.target.value)}
                          className="w-full pl-8 pr-16 py-2.5 text-sm font-semibold text-slate-700 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#0B2545] bg-white"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                          USD
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Rate Validity Window
                    </label>
                    <select
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#0B2545] bg-white"
                    >
                      <option value="7 Business Days from Issuance">7 Business Days from Issuance</option>
                      <option value="14 Business Days from Issuance">14 Business Days from Issuance</option>
                      <option value="30 Calendar Days from Issuance">30 Calendar Days from Issuance</option>
                      <option value="Guaranteed for Current Month">Guaranteed for Current Month</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Internal Consultation &amp; Dispatch Notes
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Face-to-face consultation at Transimex Montreal terminal. Rate includes linehaul and fuel surcharge. Client confirmed trailer staging for Friday."
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#0B2545] bg-white resize-none"
                    />
                  </div>

                  {/* Summary recap box */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
                    <div className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                      Quick Consultation Summary
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-slate-600">
                      <div>
                        <strong>Client:</strong> {clientName || "—"}{" "}
                        {clientCompany ? `(${clientCompany})` : ""}
                      </div>
                      <div>
                        <strong>Email:</strong> {clientEmail || "—"}
                      </div>
                      <div>
                        <strong>Corridor:</strong> {originCity} &rarr; {destinationCity}
                      </div>
                      <div>
                        <strong>Mode:</strong> {transportMode}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* FOOTER BUTTONS */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                {activeStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg(null);
                      setActiveStep((prev) => (prev - 1) as any);
                    }}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2.5 text-slate-500 hover:text-slate-800 text-xs font-semibold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                )}

                {activeStep < 3 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (activeStep === 1 && validateStep1()) {
                        setActiveStep(2);
                      } else if (activeStep === 2 && validateStep2()) {
                        setActiveStep(3);
                      }
                    }}
                    className="px-5 py-2.5 bg-[#0B2545] hover:bg-[#133E6D] text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Next: {activeStep === 1 ? "Route & Cargo" : "Agreed Rate"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 bg-[#d21f27] hover:bg-[#b51a21] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition cursor-pointer flex items-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Provisioning &amp; Issuing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Provision Account &amp; Issue Quote</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

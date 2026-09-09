"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { TRANSPORT_CATEGORIES, findCategoryForMode } from "@/lib/transportModes";
import {
  X,
  Check,
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
  Package,
  Boxes,
  Zap,
} from "lucide-react";

interface DirectClientQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

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

  // Form State: Step 1 - Client Profile
  const [clientName, setClientName] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [industry, setIndustry] = useState("Industrial");
  const [city, setCity] = useState("Montreal");
  const [province, setProvince] = useState("QC");
  const [billingAddress, setBillingAddress] = useState("");

  // Form State: Step 2 - Exact Quote Form replicating Client-Side (NewQuoteModal)
  const [activeCategory, setActiveCategory] = useState<string>("truck");
  const [transportMode, setTransportMode] = useState("53' Dry Van");
  const [originCity, setOriginCity] = useState("");
  const [originProvince, setOriginProvince] = useState("");
  const [originPostal, setOriginPostal] = useState("");
  const [destinationCity, setDestinationCity] = useState("");
  const [destinationProvince, setDestinationProvince] = useState("");
  const [destinationPostal, setDestinationPostal] = useState("");
  const [weightLbs, setWeightLbs] = useState("");
  const [palletCount, setPalletCount] = useState("");
  const [pickupDate, setPickupDate] = useState(
    new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0]
  );
  const [dimLengthIn, setDimLengthIn] = useState("");
  const [dimWidthIn, setDimWidthIn] = useState("");
  const [dimHeightIn, setDimHeightIn] = useState("");
  const [commodityType, setCommodityType] = useState("");
  const [temperatureControlled, setTemperatureControlled] = useState(false);
  const [hazmat, setHazmat] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState("");

  // Form State: Step 3 - Agreed Freight Tariff & Admin Consultation
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
    setClientName("");
    setClientCompany("");
    setClientEmail("");
    setClientPhone("");
    setOriginCity("");
    setOriginProvince("");
    setOriginPostal("");
    setDestinationCity("");
    setDestinationProvince("");
    setDestinationPostal("");
    setTransportMode("53' Dry Van");
    setActiveCategory("truck");
    setWeightLbs("");
    setPalletCount("");
    setDimLengthIn("");
    setDimWidthIn("");
    setDimHeightIn("");
    setCommodityType("");
    setTemperatureControlled(false);
    setHazmat(false);
    setSpecialInstructions("");
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
    if (!originCity.trim() || !originProvince.trim() || !originPostal.trim()) {
      setErrorMsg("Origin pickup city, province/state, and postal/ZIP code are required.");
      return false;
    }
    if (!destinationCity.trim() || !destinationProvince.trim() || !destinationPostal.trim()) {
      setErrorMsg("Destination city, province/state, and postal/ZIP code are required.");
      return false;
    }
    if (!transportMode) {
      setErrorMsg("Please select a transport mode and equipment type.");
      return false;
    }
    if (!weightLbs.trim() || isNaN(Number(weightLbs.replace(/[^0-9.]/g, "")))) {
      setErrorMsg("Please provide a valid freight weight in lbs.");
      return false;
    }
    if (!pickupDate) {
      setErrorMsg("Please select a pickup date.");
      return false;
    }
    if (!commodityType.trim()) {
      setErrorMsg("Commodity description is required.");
      return false;
    }
    setErrorMsg(null);
    return true;
  };

  const validateStep3 = () => {
    if (!priceCad.trim() || isNaN(Number(priceCad.replace(/[^0-9.]/g, "")))) {
      setErrorMsg("Please provide a valid agreed freight tariff in CAD.");
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
          equipment: transportMode,
          commodity: commodityType,
          commodityType,
          weightLbs,
          palletCount,
          dimLengthIn,
          dimWidthIn,
          dimHeightIn,
          temperatureControlled,
          hazmat,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* HEADER BAR */}
        <div className="bg-[#0B2545] text-white px-6 py-4 flex items-center justify-between border-b border-white/10 relative">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#d21f27] text-white flex items-center justify-center shadow-xs">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#ff8f94]">
                  Direct Consultation Intake
                </span>
                <span className="text-[10px] text-slate-300 font-mono">B2B PORTAL</span>
              </div>
              <h2
                className="text-lg sm:text-xl font-bold tracking-tight text-white mt-0.5"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Direct Client Onboarding &amp; Pre-Priced Quote
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
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
                <span>Quote Form (Freight Specs)</span>
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
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 max-h-[72vh]">
          {errorMsg && (
            <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-700 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ----------------- SUCCESS VIEW (PASSWORD NOT SHOWN TO ADMIN) ----------------- */}
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
                      Account Provisioned &amp; Quote Dispatched
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-bold font-mono">
                      PRE-PRICED
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                    Account Created for {successData.user.name}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Quote <strong className="text-[#0B2545] font-mono">{successData.quote.id}</strong> has been created with agreed freight tariff of <strong className="text-emerald-700">{successData.quote.priceCad}</strong>.
                  </p>
                </div>
              </div>

              {/* Confidential Password Notice: ONLY sent to client email */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="text-xs text-slate-700 space-y-1">
                  <div className="font-bold text-[#0B2545]">
                    Login Credentials Delivered to Client
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    A secure, auto-generated temporary password and account setup details were sent directly to <strong>{successData.user.email}</strong>.
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium pt-1">
                    * For privacy and security policies, the auto-generated password is not displayed to administrators and is accessible exclusively by the client in their email inbox.
                  </p>
                </div>
              </div>

              {/* Quote Snapshot Card */}
              <div className="bg-[#0B2545] text-white rounded-2xl p-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-300">
                      Pre-Approved Freight Quote
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
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* STEP 1: CLIENT PROFILE */}
              {activeStep === 1 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3.5 text-xs text-blue-900 flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-semibold">Face-to-Face Onboarding:</strong> Enter the client&apos;s corporate contact details. The system will create an active account with an auto-generated password and email it directly to the client with their quote.
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
                        Auto-generated password &amp; quote link will be sent directly here.
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

              {/* STEP 2: EXACT REPLICA OF CLIENT-SIDE QUOTE FORM */}
              {activeStep === 2 && (
                <div className="space-y-4 animate-in fade-in duration-150 text-xs">
                  {/* Visual Blurred Diagram Banner (identical to client-side modal) */}
                  <div className="relative overflow-hidden bg-gradient-to-r from-[#0B2545] via-[#123661] to-[#1E3A8A] text-white p-4 rounded-2xl border border-slate-200 shadow-md">
                    <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-3">
                      {/* Origin Box */}
                      <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-3 flex-1 w-full text-center sm:text-left">
                        <div className="flex items-center justify-center sm:justify-start gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          <span>Origin Terminal</span>
                        </div>
                        <div className="text-xs font-bold text-white mt-1 truncate">
                          {originCity || "Montreal"}, {originProvince || "QC"}
                        </div>
                        <div className="text-[10px] text-slate-300 font-mono">
                          Commercial Pickup Hub
                        </div>
                      </div>

                      {/* Connecting Corridor Graphic */}
                      <div className="flex flex-col items-center justify-center px-2 py-0.5 text-center">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1 mb-1">
                          <Sparkles className="w-3 h-3" />
                          <span>{transportMode}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-[2px] w-6 sm:w-10 bg-gradient-to-r from-emerald-400 to-[#d21f27]" />
                          <div className="w-7 h-7 rounded-full bg-[#d21f27] text-white flex items-center justify-center shadow-md animate-pulse">
                            <Truck className="w-3.5 h-3.5" />
                          </div>
                          <div className="h-[2px] w-6 sm:w-10 bg-gradient-to-r from-[#d21f27] to-red-400" />
                        </div>
                        <div className="text-[9px] text-slate-300 mt-1 font-mono">
                          {weightLbs ? `${Number(weightLbs.replace(/[^0-9.]/g, "")).toLocaleString()} lbs` : "Full Payload"}
                        </div>
                      </div>

                      {/* Destination Box */}
                      <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-3 flex-1 w-full text-center sm:text-right">
                        <div className="flex items-center justify-center sm:justify-end gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#ff8f94]">
                          <MapPin className="w-3 h-3 text-[#d21f27]" />
                          <span>Destination Receiving</span>
                        </div>
                        <div className="text-xs font-bold text-white mt-1 truncate">
                          {destinationCity || "Toronto"}, {destinationProvince || "ON"}
                        </div>
                        <div className="text-[10px] text-slate-300 font-mono">
                          Direct Receiving Facility
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 1. Origin & Destination Section */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                    <span className="font-bold text-[#0B2545] text-xs flex items-center gap-1.5 uppercase tracking-wider">
                      <MapPin className="w-3.5 h-3.5 text-[#d21f27]" />
                      <span>1. Origin &amp; Destination Addresses</span>
                    </span>

                    {/* Origin Inputs */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-700 text-[11px] uppercase">
                        Origin Pickup *
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          required
                          placeholder="Origin City (Montreal)"
                          value={originCity}
                          onChange={(e) => setOriginCity(e.target.value)}
                          className="px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#0B2545]"
                        />
                        <input
                          required
                          placeholder="Prov (QC)"
                          value={originProvince}
                          onChange={(e) => setOriginProvince(e.target.value)}
                          className="px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#0B2545]"
                        />
                        <input
                          required
                          placeholder="Postal (H4E 4N4)"
                          value={originPostal}
                          onChange={(e) => setOriginPostal(e.target.value)}
                          className="px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#0B2545]"
                        />
                      </div>
                    </div>

                    {/* Destination Inputs */}
                    <div className="space-y-1.5 pt-1">
                      <label className="font-bold text-slate-700 text-[11px] uppercase">
                        Destination Delivery *
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          required
                          placeholder="Dest City (Toronto)"
                          value={destinationCity}
                          onChange={(e) => setDestinationCity(e.target.value)}
                          className="px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#0B2545]"
                        />
                        <input
                          required
                          placeholder="State / Prov (ON)"
                          value={destinationProvince}
                          onChange={(e) => setDestinationProvince(e.target.value)}
                          className="px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#0B2545]"
                        />
                        <input
                          required
                          placeholder="ZIP / Postal (M5V 2T6)"
                          value={destinationPostal}
                          onChange={(e) => setDestinationPostal(e.target.value)}
                          className="px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#0B2545]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2. Equipment & Freight Specifications Section */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                    <span className="font-bold text-[#0B2545] text-xs flex items-center gap-1.5 uppercase tracking-wider">
                      <Truck className="w-3.5 h-3.5 text-[#d21f27]" />
                      <span>2. Equipment &amp; Cargo Specifications</span>
                    </span>

                    {/* Transport Category Selector */}
                    <div className="grid grid-cols-4 gap-2">
                      {TRANSPORT_CATEGORIES.map((cat) => {
                        const isActiveCat = activeCategory === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setActiveCategory(cat.id);
                              if (!cat.modes.some((m) => m.id === transportMode)) {
                                setTransportMode(cat.modes[0].id);
                              }
                            }}
                            className={`p-2.5 rounded-xl border transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                              isActiveCat
                                ? "bg-[#0B2545] text-white border-[#0B2545] shadow-xs"
                                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            <cat.icon
                              className={`w-4 h-4 shrink-0 ${
                                isActiveCat ? "text-[#ff8f94]" : "text-slate-400"
                              }`}
                            />
                            <span className="font-bold text-[11px]">{cat.name}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Equipment Sub-Options for Selected Category */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {TRANSPORT_CATEGORIES.find((cat) => cat.id === activeCategory)!.modes.map(
                        (mode) => {
                          const isSelected = transportMode === mode.id;
                          return (
                            <label
                              key={mode.id}
                              title={mode.desc}
                              className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-1.5 ${
                                isSelected
                                  ? "bg-[#d21f27] text-white border-[#d21f27] shadow-xs"
                                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <mode.icon
                                  className={`w-3.5 h-3.5 shrink-0 ${
                                    isSelected ? "text-white" : "text-slate-400"
                                  }`}
                                />
                                <span className="font-bold text-[11px] truncate">{mode.name}</span>
                              </div>
                              <input
                                type="radio"
                                name="transportMode"
                                value={mode.id}
                                checked={isSelected}
                                onChange={() => setTransportMode(mode.id)}
                                className="hidden"
                              />
                              {isSelected && <Check className="w-3 h-3 text-white shrink-0" />}
                            </label>
                          );
                        }
                      )}
                    </div>

                    {/* Weight, Pallets, Pickup Date */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                          Weight (lbs) *
                        </label>
                        <input
                          required
                          placeholder="e.g. 42000"
                          value={weightLbs}
                          onChange={(e) => setWeightLbs(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#0B2545]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                          Pallet Count
                        </label>
                        <input
                          type="number"
                          placeholder="e.g. 24"
                          value={palletCount}
                          onChange={(e) => setPalletCount(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#0B2545]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                          Pickup Date *
                        </label>
                        <input
                          type="date"
                          required
                          value={pickupDate}
                          onChange={(e) => setPickupDate(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#0B2545]"
                        />
                      </div>
                    </div>

                    {/* Dimensions */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                        Dimensions (in)
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          placeholder="Length"
                          value={dimLengthIn}
                          onChange={(e) => setDimLengthIn(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#0B2545] text-center"
                        />
                        <input
                          placeholder="Width"
                          value={dimWidthIn}
                          onChange={(e) => setDimWidthIn(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#0B2545] text-center"
                        />
                        <input
                          placeholder="Height"
                          value={dimHeightIn}
                          onChange={(e) => setDimHeightIn(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#0B2545] text-center"
                        />
                      </div>
                    </div>

                    {/* Commodity Description */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                        Commodity Description *
                      </label>
                      <input
                        required
                        placeholder="e.g. Industrial Machinery, Frozen Food, Electronics"
                        value={commodityType}
                        onChange={(e) => setCommodityType(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#0B2545]"
                      />
                    </div>

                    {/* Temperature and Hazmat Toggles */}
                    <div className="flex items-center gap-4 pt-0.5">
                      <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={temperatureControlled}
                          onChange={(e) => setTemperatureControlled(e.target.checked)}
                          className="w-3.5 h-3.5 text-[#d21f27] rounded border-slate-300"
                        />
                        <span>Refrigerated / Temperature Controlled</span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={hazmat}
                          onChange={(e) => setHazmat(e.target.checked)}
                          className="w-3.5 h-3.5 text-[#d21f27] rounded border-slate-300"
                        />
                        <span>Dangerous Goods / Hazmat</span>
                      </label>
                    </div>

                    {/* Special Instructions */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                        Special Instructions / Driver Notes
                      </label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Liftgate required at delivery; driver check-in at security dock #4."
                        value={specialInstructions}
                        onChange={(e) => setSpecialInstructions(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#0B2545] resize-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: AGREED PRICING & TERMS */}
              {activeStep === 3 && (
                <div className="space-y-4 animate-in fade-in duration-150 text-xs">
                  <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 text-emerald-900 flex items-start gap-2.5">
                    <DollarSign className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-semibold">Agreed Tariff (Pre-Approved):</strong> This price was agreed upon face-to-face. The quote will be created in status <strong>&quot;Rate Offered&quot;</strong> so the client can immediately accept it in their portal to generate the shipment.
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
                      placeholder="e.g. Face-to-face consultation. Agreed rate includes linehaul and fuel surcharge. Client confirmed trailer staging for Friday."
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#0B2545] bg-white resize-none"
                    />
                  </div>

                  {/* Summary recap box */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
                    <div className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                      Consultation Recap
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
                        <strong>Corridor:</strong> {originCity || "—"} &rarr; {destinationCity || "—"}
                      </div>
                      <div>
                        <strong>Equipment:</strong> {transportMode}
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
                    <span>Next: {activeStep === 1 ? "Quote Form" : "Agreed Rate"}</span>
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

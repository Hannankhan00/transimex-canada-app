"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { quoteRequestSchema, QuoteRequestFormData } from "@/lib/validations/quote";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { api } from "@/lib/api";
import { getStoredAddresses } from "@/lib/mockData";
import { SavedAddress } from "@/lib/validations/address";
import { TRANSPORT_CATEGORIES } from "@/lib/transportModes";
import TransimexLogo from "@/components/TransimexLogo";
import {
  MapPin,
  Truck,
  Building2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
  Check,
  Lock,
  Loader2,
  Mail,
} from "lucide-react";

type WizardStep = 1 | 2 | 3;

const STEP_FIELDS: Record<WizardStep, (keyof QuoteRequestFormData)[]> = {
  1: ["transportMode"],
  2: [
    "originCity",
    "originProvince",
    "originPostal",
    "destinationCity",
    "destinationProvince",
    "destinationPostal",
    "weightLbs",
    "pickupDate",
    "dimLengthIn",
    "dimWidthIn",
    "dimHeightIn",
    "commodityType",
  ],
  3: ["contactName", "contactEmail", "contactPhone"],
};

export default function PublicQuotePage() {
  const { language } = useLanguage();
  const isFr = language === "fr";

  const [authState, setAuthState] = useState<"loading" | "guest" | "authed">("loading");
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [step, setStep] = useState<WizardStep>(1);
  const [activeCategory, setActiveCategory] = useState<string>("truck");
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedQuote, setSubmittedQuote] = useState<{ id: string } | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm<QuoteRequestFormData>({
    resolver: zodResolver(quoteRequestSchema) as any,
    defaultValues: {
      originCity: "",
      originProvince: "",
      originPostal: "",
      destinationCity: "",
      destinationProvince: "",
      destinationPostal: "",
      transportMode: "53' Dry Van",
      weightLbs: "",
      palletCount: "",
      pickupDate: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
      dimLengthIn: "",
      dimWidthIn: "",
      dimHeightIn: "",
      commodityType: "",
      temperatureControlled: false,
      hazmat: false,
      specialInstructions: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      companyName: "",
    },
  });

  const selectedMode = watch("transportMode");

  useEffect(() => {
    async function loadUser() {
      const me = await api.auth.me();
      if (me?.user) {
        setAuthState("authed");
        if (me.user.name) setValue("contactName", me.user.name);
        if (me.user.email) setValue("contactEmail", me.user.email);
        if (me.user.companyName) setValue("companyName", me.user.companyName);
        if (me.user.phone) setValue("contactPhone", me.user.phone);

        const addrs = getStoredAddresses();
        setSavedAddresses(addrs);
        const defaultAddr = addrs.find((a) => a.isDefault);
        if (defaultAddr) {
          setValue("originCity", defaultAddr.city);
          setValue("originProvince", defaultAddr.province);
          setValue("originPostal", defaultAddr.postalCode);
        }
      } else {
        setAuthState("guest");
      }
    }
    loadUser();
  }, [setValue]);

  const handleOriginAddressSelect = (addrId: string) => {
    const found = savedAddresses.find((a) => a.id === addrId);
    if (found) {
      setValue("originCity", found.city);
      setValue("originProvince", found.province);
      setValue("originPostal", found.postalCode);
    }
  };

  const handleDestinationAddressSelect = (addrId: string) => {
    const found = savedAddresses.find((a) => a.id === addrId);
    if (found) {
      setValue("destinationCity", found.city);
      setValue("destinationProvince", found.province);
      setValue("destinationPostal", found.postalCode);
    }
  };

  const goNext = async () => {
    const valid = await trigger(STEP_FIELDS[step]);
    if (valid) setStep((s) => (s < 3 ? ((s + 1) as WizardStep) : s));
  };

  const goBack = () => setStep((s) => (s > 1 ? ((s - 1) as WizardStep) : s));

  const onSubmit = async (data: QuoteRequestFormData) => {
    setIsSubmittingQuote(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to submit quote request");
      }
      setSubmittedQuote(result.quote);
    } catch (err: any) {
      setSubmitError(err.message || "Failed to submit quote request");
    } finally {
      setIsSubmittingQuote(false);
    }
  };

  const STEP_LABELS = isFr
    ? ["Mode de Transport", "Détails de l'Expédition", "Coordonnées"]
    : ["Transport Mode", "Shipment Details", "Contact Info"];

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-slate-800">
      {/* Top Bar Header */}
      <header className="bg-[#0B2545] border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <TransimexLogo variant="dark" size="sm" />
          </Link>
          <div className="h-5 w-[1px] bg-white/20 hidden sm:block" />
          <span className="text-xs font-semibold text-slate-300 hidden sm:inline">
            {isFr ? "Portail de Cotation Instantanée" : "Instant Freight Quotation Engine"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/quotes"
            className="text-xs text-slate-300 hover:text-white font-medium flex items-center gap-1.5 transition px-3 py-1.5 rounded-lg hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isFr ? "Retour au tableau de bord" : "Back to Quotes Dashboard"}</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {authState === "loading" ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 text-[#0B2545] animate-spin" />
          </div>
        ) : authState === "guest" ? (
          /* Sign-in Gate */
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-xl text-center space-y-5 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-[#0B2545]/5 text-[#0B2545] flex items-center justify-center mx-auto border border-[#0B2545]/10">
              <Lock className="w-8 h-8" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#d21f27]">
                {isFr ? "Compte Requis" : "Account Required"}
              </span>
              <h2
                className="text-2xl font-bold text-[#0B2545] mt-1"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {isFr ? "Connectez-vous pour Demander une Soumission" : "Sign In to Request a Quote"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
                {isFr
                  ? "Un compte client Transimex Canada est requis afin que votre demande soit suivie et liée à votre tableau de bord."
                  : "A Transimex Canada client account is required so your request is tracked and tied to your dashboard."}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/login?from=/quote"
                className="w-full sm:w-auto px-6 py-3 bg-[#0B2545] hover:bg-[#123661] text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2"
              >
                <span>{isFr ? "Se Connecter" : "Sign In"}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login?tab=signup&from=/quote"
                className="w-full sm:w-auto px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                {isFr ? "Créer un Compte" : "Create an Account"}
              </Link>
            </div>
          </div>
        ) : submittedQuote ? (
          /* Confirmation State */
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-xl text-center space-y-5 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#d21f27]">
                {isFr ? "Soumission Transmise avec Succès" : "Quote Request Successfully Registered"}
              </span>
              <h2
                className="text-2xl sm:text-3xl font-bold text-[#0B2545] mt-1"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {isFr ? "Votre Référence :" : "Your Quote Reference:"} {submittedQuote.id}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
                {isFr
                  ? "Votre demande de fret a été transmise au centre de répartition Transimex Canada. Un courriel de confirmation vous a été envoyé."
                  : "Your quote has been sent to Transimex Canada dispatch. A confirmation email with your reference number is on its way to your inbox."}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 max-w-md mx-auto text-left text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Under Review
                </span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500 flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {isFr ? "Confirmation :" : "Confirmation:"}</span>
                <span className="font-bold text-slate-800">{isFr ? "Envoyée par courriel" : "Sent by email"}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Link
                href="/dashboard/quotes"
                className="w-full sm:w-auto px-6 py-3 bg-[#0B2545] hover:bg-[#123661] text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{isFr ? "Voir dans Mes Soumissions" : "Open My Quotes Dashboard"}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          /* Wizard State */
          <div className="space-y-6">
            {/* Title Header */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#d21f27]">
                {isFr ? "Calculateur de Fret Commercial" : "Expedited Commercial Freight Booking"}
              </span>
              <h1
                className="text-2xl sm:text-4xl font-bold text-[#0B2545] tracking-tight mt-1"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {isFr ? "Demande de Soumission de Fret" : "Request Instant Freight Quote"}
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm mt-1">
                {isFr
                  ? "Remplissez les 3 étapes ci-dessous pour obtenir une tarification garantie et sans frais cachés."
                  : "Complete the 3 steps below to receive guaranteed all-inclusive Canadian freight pricing."}
              </p>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center gap-2 sm:gap-4">
              {STEP_LABELS.map((label, idx) => {
                const stepNum = (idx + 1) as WizardStep;
                const isDone = step > stepNum;
                const isActive = step === stepNum;
                return (
                  <React.Fragment key={label}>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
                          isDone
                            ? "bg-emerald-500 text-white"
                            : isActive
                            ? "bg-[#0B2545] text-white"
                            : "bg-slate-200 text-slate-500"
                        }`}
                      >
                        {isDone ? <Check className="w-3.5 h-3.5" /> : stepNum}
                      </div>
                      <span
                        className={`text-[11px] font-bold uppercase tracking-wider hidden sm:inline ${
                          isActive ? "text-[#0B2545]" : "text-slate-400"
                        }`}
                      >
                        {label}
                      </span>
                    </div>
                    {stepNum < 3 && <div className={`flex-1 h-[2px] ${step > stepNum ? "bg-emerald-500" : "bg-slate-200"}`} />}
                  </React.Fragment>
                );
              })}
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Step 1: Transport Mode */}
              {step === 1 && (
                <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-5">
                  <div className="border-b border-slate-100 pb-3 flex items-center gap-2 font-bold text-[#0B2545] text-sm sm:text-base">
                    <Truck className="w-5 h-5 text-[#d21f27]" />
                    <span>1. {isFr ? "Sélectionnez le Mode de Transport" : "Select Transport Mode"}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {TRANSPORT_CATEGORIES.map((cat) => {
                      const isActiveCat = activeCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setActiveCategory(cat.id);
                            if (!cat.modes.some((m) => m.id === selectedMode)) {
                              setValue("transportMode", cat.modes[0].id, { shouldValidate: true });
                            }
                          }}
                          className={`p-3.5 rounded-2xl border transition cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                            isActiveCat
                              ? "bg-[#0B2545] text-white border-[#0B2545] shadow-md"
                              : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <cat.icon className={`w-6 h-6 ${isActiveCat ? "text-[#ff8f94]" : "text-slate-400"}`} />
                          <span className="font-bold text-xs">{cat.name}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {TRANSPORT_CATEGORIES.find((cat) => cat.id === activeCategory)!.modes.map((mode) => {
                      const isSelected = selectedMode === mode.id;
                      return (
                        <label
                          key={mode.id}
                          className={`p-3.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                            isSelected
                              ? "bg-[#0B2545]/5 border-[#0B2545] ring-2 ring-[#0B2545]/20"
                              : "bg-slate-50 border-slate-200 hover:bg-slate-100/70"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-[#0B2545]">{mode.name}</span>
                            <input type="radio" value={mode.id} {...register("transportMode")} className="accent-[#d21f27]" />
                          </div>
                          <span className="text-[11px] text-slate-500 leading-tight">{mode.desc}</span>
                        </label>
                      );
                    })}
                  </div>
                  {errors.transportMode && (
                    <p className="text-[11px] text-red-600 font-semibold">{errors.transportMode.message}</p>
                  )}
                </div>
              )}

              {/* Step 2: Shipment Details */}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2 font-bold text-[#0B2545] text-sm sm:text-base">
                        <MapPin className="w-5 h-5 text-[#d21f27]" />
                        <span>2. {isFr ? "Itinéraire & Cargaison" : "Route & Cargo Details"}</span>
                      </div>
                      {savedAddresses.length > 0 && (
                        <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                          Address Book Linked
                        </span>
                      )}
                    </div>

                    {/* Origin */}
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          {isFr ? "Lieu d'Enlèvement (Origine)" : "Pickup Location (Origin)"} *
                        </label>
                        {savedAddresses.length > 0 && (
                          <select
                            onChange={(e) => handleOriginAddressSelect(e.target.value)}
                            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                          >
                            <option value="">-- Choose saved address --</option>
                            {savedAddresses.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.alias} ({a.city})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <input
                            {...register("originCity")}
                            placeholder="Origin City (e.g. Montreal)"
                            className={`w-full px-3.5 py-2.5 bg-slate-50 border ${
                              errors.originCity ? "border-red-500" : "border-slate-200"
                            } focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition font-medium`}
                          />
                          {errors.originCity && <p className="text-[10px] text-red-600 mt-1">{errors.originCity.message}</p>}
                        </div>
                        <div>
                          <input
                            {...register("originProvince")}
                            placeholder="Province (e.g. QC)"
                            className={`w-full px-3.5 py-2.5 bg-slate-50 border ${
                              errors.originProvince ? "border-red-500" : "border-slate-200"
                            } focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition font-medium`}
                          />
                          {errors.originProvince && <p className="text-[10px] text-red-600 mt-1">{errors.originProvince.message}</p>}
                        </div>
                        <div>
                          <input
                            {...register("originPostal")}
                            placeholder="Postal Code (e.g. H4E 4N4)"
                            className={`w-full px-3.5 py-2.5 bg-slate-50 border ${
                              errors.originPostal ? "border-red-500" : "border-slate-200"
                            } focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition font-medium`}
                          />
                          {errors.originPostal && <p className="text-[10px] text-red-600 mt-1">{errors.originPostal.message}</p>}
                        </div>
                      </div>
                    </div>

                    {/* Destination */}
                    <div className="space-y-3 pt-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          {isFr ? "Lieu de Livraison (Destination)" : "Delivery Location (Destination)"} *
                        </label>
                        {savedAddresses.length > 0 && (
                          <select
                            onChange={(e) => handleDestinationAddressSelect(e.target.value)}
                            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                          >
                            <option value="">-- Choose saved address --</option>
                            {savedAddresses.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.alias} ({a.city})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <input
                            {...register("destinationCity")}
                            placeholder="Destination City (e.g. Detroit)"
                            className={`w-full px-3.5 py-2.5 bg-slate-50 border ${
                              errors.destinationCity ? "border-red-500" : "border-slate-200"
                            } focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition font-medium`}
                          />
                          {errors.destinationCity && <p className="text-[10px] text-red-600 mt-1">{errors.destinationCity.message}</p>}
                        </div>
                        <div>
                          <input
                            {...register("destinationProvince")}
                            placeholder="Province / State (e.g. MI)"
                            className={`w-full px-3.5 py-2.5 bg-slate-50 border ${
                              errors.destinationProvince ? "border-red-500" : "border-slate-200"
                            } focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition font-medium`}
                          />
                          {errors.destinationProvince && <p className="text-[10px] text-red-600 mt-1">{errors.destinationProvince.message}</p>}
                        </div>
                        <div>
                          <input
                            {...register("destinationPostal")}
                            placeholder="Postal / ZIP (e.g. 48214)"
                            className={`w-full px-3.5 py-2.5 bg-slate-50 border ${
                              errors.destinationPostal ? "border-red-500" : "border-slate-200"
                            } focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition font-medium`}
                          />
                          {errors.destinationPostal && <p className="text-[10px] text-red-600 mt-1">{errors.destinationPostal.message}</p>}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-5">
                    {/* Weight, Pickup Date */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          {isFr ? "Poids Total (LBS)" : "Gross Weight (lbs)"} *
                        </label>
                        <input
                          {...register("weightLbs")}
                          placeholder="e.g. 42000"
                          className={`w-full px-3.5 py-2.5 bg-slate-50 border ${
                            errors.weightLbs ? "border-red-500" : "border-slate-200"
                          } focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition font-medium`}
                        />
                        {errors.weightLbs && <p className="text-[10px] text-red-600 mt-1">{errors.weightLbs.message}</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          {isFr ? "Nombre de Palettes" : "Pallet / Skid Count"}
                        </label>
                        <input
                          {...register("palletCount")}
                          placeholder="e.g. 24"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          {isFr ? "Date d'Enlèvement Souhaitée" : "Target Pickup Date"} *
                        </label>
                        <input
                          type="date"
                          {...register("pickupDate")}
                          className={`w-full px-3.5 py-2.5 bg-slate-50 border ${
                            errors.pickupDate ? "border-red-500" : "border-slate-200"
                          } focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition font-medium`}
                        />
                        {errors.pickupDate && <p className="text-[10px] text-red-600 mt-1">{errors.pickupDate.message}</p>}
                      </div>
                    </div>

                    {/* Dimensions */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        {isFr ? "Dimensions (pouces)" : "Dimensions (inches)"} *
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        <input
                          {...register("dimLengthIn")}
                          placeholder="Length"
                          className={`w-full px-3.5 py-2.5 bg-slate-50 border ${
                            errors.dimLengthIn ? "border-red-500" : "border-slate-200"
                          } focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition font-medium`}
                        />
                        <input
                          {...register("dimWidthIn")}
                          placeholder="Width"
                          className={`w-full px-3.5 py-2.5 bg-slate-50 border ${
                            errors.dimWidthIn ? "border-red-500" : "border-slate-200"
                          } focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition font-medium`}
                        />
                        <input
                          {...register("dimHeightIn")}
                          placeholder="Height"
                          className={`w-full px-3.5 py-2.5 bg-slate-50 border ${
                            errors.dimHeightIn ? "border-red-500" : "border-slate-200"
                          } focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition font-medium`}
                        />
                      </div>
                      {(errors.dimLengthIn || errors.dimWidthIn || errors.dimHeightIn) && (
                        <p className="text-[10px] text-red-600 mt-1">
                          {errors.dimLengthIn?.message || errors.dimWidthIn?.message || errors.dimHeightIn?.message}
                        </p>
                      )}
                    </div>

                    {/* Commodity Description */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        {isFr ? "Description de la Marchandise" : "Commodity / Freight Description"} *
                      </label>
                      <input
                        {...register("commodityType")}
                        placeholder="e.g. Packaged Consumer Goods, Industrial Auto Parts, Frozen Seafood"
                        className={`w-full px-3.5 py-2.5 bg-slate-50 border ${
                          errors.commodityType ? "border-red-500" : "border-slate-200"
                        } focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition font-medium`}
                      />
                      {errors.commodityType && <p className="text-[10px] text-red-600 mt-1">{errors.commodityType.message}</p>}
                    </div>

                    {/* Special Flags & Instructions */}
                    <div className="flex flex-wrap items-center gap-6 pt-1">
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          {...register("temperatureControlled")}
                          className="w-4 h-4 text-[#d21f27] rounded-md border-slate-300 focus:ring-[#d21f27]"
                        />
                        <span>Reefer Temperature Controlled</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          {...register("hazmat")}
                          className="w-4 h-4 text-[#d21f27] rounded-md border-slate-300 focus:ring-[#d21f27]"
                        />
                        <span>Dangerous Goods / Hazmat TDG</span>
                      </label>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        {isFr ? "Instructions de Manutention (Optionnel)" : "Accessorials & Notes (Tailgate, Appointment, etc.)"}
                      </label>
                      <textarea
                        {...register("specialInstructions")}
                        rows={2}
                        placeholder="e.g. Liftgate required at delivery dock. Inside delivery."
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition font-medium resize-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Contact Information */}
              {step === 3 && (
                <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-4">
                  <div className="border-b border-slate-100 pb-3 flex items-center gap-2 font-bold text-[#0B2545] text-sm sm:text-base">
                    <Building2 className="w-5 h-5 text-[#d21f27]" />
                    <span>3. {isFr ? "Coordonnées" : "Contact Information"}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        {isFr ? "Nom de l'Entreprise (Optionnel)" : "Company Name (Optional)"}
                      </label>
                      <input
                        {...register("companyName")}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        {isFr ? "Nom du Contact" : "Contact Full Name"} *
                      </label>
                      <input
                        {...register("contactName")}
                        className={`w-full px-3.5 py-2.5 bg-slate-50 border ${
                          errors.contactName ? "border-red-500" : "border-slate-200"
                        } focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition font-medium`}
                      />
                      {errors.contactName && <p className="text-[10px] text-red-600 mt-1">{errors.contactName.message}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        {isFr ? "Courriel de Réception" : "Dispatch Notification Email"} *
                      </label>
                      <input
                        {...register("contactEmail")}
                        className={`w-full px-3.5 py-2.5 bg-slate-50 border ${
                          errors.contactEmail ? "border-red-500" : "border-slate-200"
                        } focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition font-medium`}
                      />
                      {errors.contactEmail && <p className="text-[10px] text-red-600 mt-1">{errors.contactEmail.message}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        {isFr ? "Téléphone Direct" : "Direct Phone Number"} *
                      </label>
                      <input
                        {...register("contactPhone")}
                        className={`w-full px-3.5 py-2.5 bg-slate-50 border ${
                          errors.contactPhone ? "border-red-500" : "border-slate-200"
                        } focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition font-medium`}
                      />
                      {errors.contactPhone && <p className="text-[10px] text-red-600 mt-1">{errors.contactPhone.message}</p>}
                    </div>
                  </div>

                  {submitError && (
                    <p className="text-xs text-red-600 font-semibold bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                      {submitError}
                    </p>
                  )}
                </div>
              )}

              {/* Step Navigation */}
              <div className="flex items-center justify-between pt-2 gap-3">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={step === 1}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2 disabled:opacity-0 disabled:pointer-events-none"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{isFr ? "Précédent" : "Back"}</span>
                </button>

                {step < 3 ? (
                  <button
                    type="button"
                    onClick={goNext}
                    className="flex-1 sm:flex-none px-8 py-3.5 bg-[#0B2545] hover:bg-[#123661] text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md hover:shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>{isFr ? "Suivant" : "Continue"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmittingQuote}
                    className="flex-1 sm:flex-none px-8 py-3.5 bg-[#d21f27] hover:bg-[#b51a21] text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg hover:shadow-xl transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>
                      {isSubmittingQuote
                        ? isFr
                          ? "Soumission en cours..."
                          : "Submitting Quote Request..."
                        : isFr
                        ? "Soumettre la Demande de Fret"
                        : "Submit Freight Quote Request"}
                    </span>
                  </button>
                )}
              </div>
              <p className="text-center text-[11px] text-slate-400">
                Guaranteed all-inclusive CAD freight quote provided by Transimex Canadian Dispatch.
              </p>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

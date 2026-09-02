"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { quoteRequestSchema, QuoteRequestFormData } from "@/lib/validations/quote";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { api } from "@/lib/api";
import {
  QuoteItem,
  addQuoteToStore,
  getStoredAddresses,
} from "@/lib/mockData";
import { SavedAddress } from "@/lib/validations/address";
import TransimexLogo from "@/components/TransimexLogo";
import {
  Truck,
  MapPin,
  Calendar,
  Package,
  ShieldCheck,
  Building2,
  User,
  Phone,
  Mail,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
  Clock,
  Sparkles,
  Info,
} from "lucide-react";

const TRANSPORT_MODES = [
  { id: "53' Dry Van", name: "53' Dry Van (Standard Road)", icon: Truck, desc: "Palletized dry freight across Canada & USA" },
  { id: "Refrigerated Reefer", name: "Refrigerated Reefer (-25°C to +20°C)", icon: Package, desc: "Cold-chain, perishable & pharmaceutical goods" },
  { id: "Intermodal Rail", name: "Intermodal Rail (CN / CPKC)", icon: Package, desc: "Cost-effective long-haul cross-country shipping" },
  { id: "Flatbed / Heavy Haul", name: "Flatbed / Stepdeck / Heavy Haul", icon: Truck, desc: "Oversized, industrial & machinery freight" },
  { id: "Air Freight Expedited", name: "Air Freight Expedited (Next-Flight-Out)", icon: Sparkles, desc: "Time-critical next-day Canadian delivery" },
  { id: "Cross-Border LTL", name: "Cross-Border LTL / P&D", icon: Truck, desc: "Partial loads with bonded customs clearance" },
] as const;

export default function PublicQuotePage() {
  const router = useRouter();
  const { language } = useLanguage();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);
  const [submittedQuoteId, setSubmittedQuoteId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<QuoteRequestFormData>({
    resolver: zodResolver(quoteRequestSchema) as any,
    defaultValues: {
      originCity: "Montreal",
      originProvince: "QC",
      originPostal: "H4E 4N4",
      destinationCity: "Detroit",
      destinationProvince: "MI",
      destinationPostal: "48214",
      transportMode: "53' Dry Van",
      weightLbs: "38500",
      palletCount: "22",
      pickupDate: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
      commodityType: "Commercial Palletized Freight",
      temperatureControlled: false,
      hazmat: false,
      specialInstructions: "",
      contactName: "Marc Tremblay",
      contactEmail: "dispatch@laurentianglobal.ca",
      contactPhone: "+1 (514) 555-0199",
      companyName: "Laurentian Global Logistics Ltd.",
    },
  });

  const selectedMode = watch("transportMode");

  useEffect(() => {
    async function loadUser() {
      const me = await api.auth.me();
      if (me?.user) {
        setCurrentUser(me.user);
        if (me.user.name) setValue("contactName", me.user.name);
        if (me.user.email) setValue("contactEmail", me.user.email);
        if (me.user.companyName) setValue("companyName", me.user.companyName);
        if (me.user.phone) setValue("contactPhone", me.user.phone);
      }
      const addrs = getStoredAddresses();
      setSavedAddresses(addrs);
      const defaultAddr = addrs.find((a) => a.isDefault);
      if (defaultAddr) {
        setValue("originCity", defaultAddr.city);
        setValue("originProvince", defaultAddr.province);
        setValue("originPostal", defaultAddr.postalCode);
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

  const onSubmit = async (data: QuoteRequestFormData) => {
    setIsSubmittingQuote(true);

    const generatedId = `QT-2026-${Math.floor(10000 + Math.random() * 90000)}`;

    const newQuote: QuoteItem = {
      id: generatedId,
      origin: `${data.originCity} (${data.originProvince})`,
      originDetail: `${data.originCity}, ${data.originProvince} ${data.originPostal}`,
      destination: `${data.destinationCity} (${data.destinationProvince})`,
      destinationDetail: `${data.destinationCity}, ${data.destinationProvince} ${data.destinationPostal}`,
      transportMode: data.transportMode,
      equipment: data.transportMode,
      weight: `${Number(data.weightLbs).toLocaleString()} lbs`,
      palletCount: data.palletCount ? parseInt(data.palletCount, 10) : undefined,
      commodity: data.commodityType,
      submittedDate: "Just now",
      validUntil: "7 Days from Dispatch",
      status: "under_review",
      statusLabelEn: "Under Review",
      statusLabelFr: "En Révision",
      priceCad: "Pending Dispatch Calculation",
      adminNotes: "New quote request received from client portal. Transimex freight coordinator assigned for rate review.",
    };

    // Store in quotes state
    addQuoteToStore(newQuote);
    setSubmittedQuoteId(generatedId);
    setIsSubmittingQuote(false);
  };

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
            {language === "fr" ? "Portail de Cotation Instantanée" : "Instant Freight Quotation Engine"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/quotes"
            className="text-xs text-slate-300 hover:text-white font-medium flex items-center gap-1.5 transition px-3 py-1.5 rounded-lg hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{language === "fr" ? "Retour au tableau de bord" : "Back to Quotes Dashboard"}</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {submittedQuoteId ? (
          /* Confirmation State */
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-xl text-center space-y-5 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#d21f27]">
                {language === "fr" ? "Soumission Transmise avec Succès" : "Quote Request Successfully Registered"}
              </span>
              <h2
                className="text-2xl sm:text-3xl font-bold text-[#0B2545] mt-1"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {language === "fr" ? "Votre Référence :" : "Your Quote Reference:"} {submittedQuoteId}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
                {language === "fr"
                  ? "Votre demande de fret a été transmise au centre de répartition Transimex Canada. Votre tarif garanti sera disponible sous 15 minutes."
                  : "Your quote has been tied to your corporate client dashboard. Transimex dispatch will issue your all-inclusive guaranteed pricing."}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 max-w-md mx-auto text-left text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Under Review
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Dispatch Response:</span>
                <span className="font-bold text-slate-800">Within 15 minutes (24/7)</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Link
                href="/dashboard/quotes"
                className="w-full sm:w-auto px-6 py-3 bg-[#0B2545] hover:bg-[#123661] text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{language === "fr" ? "Voir dans Mes Soumissions" : "Open My Quotes Dashboard"}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                type="button"
                onClick={() => setSubmittedQuoteId(null)}
                className="w-full sm:w-auto px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                {language === "fr" ? "Soumettre une Autre Demande" : "Submit Another Quote"}
              </button>
            </div>
          </div>
        ) : (
          /* Form State */
          <div className="space-y-6">
            {/* Title Header */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#d21f27]">
                {language === "fr" ? "Calculateur de Fret Commercial" : "Expedited Commercial Freight Booking"}
              </span>
              <h1
                className="text-2xl sm:text-4xl font-bold text-[#0B2545] tracking-tight mt-1"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {language === "fr" ? "Demande de Soumission de Fret" : "Request Instant Freight Quote"}
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm mt-1">
                {language === "fr"
                  ? "Remplissez les spécifications de votre chargement pour obtenir une tarification garantie et sans frais cachés."
                  : "Submit your route and equipment requirements to receive guaranteed all-inclusive Canadian freight pricing."}
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Section 1: Route & Address Book Selector */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 font-bold text-[#0B2545] text-sm sm:text-base">
                    <MapPin className="w-5 h-5 text-[#d21f27]" />
                    <span>1. {language === "fr" ? "Itinéraire & Lieux" : "Corridor & Shipping Locations"}</span>
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
                      {language === "fr" ? "Lieu d'Enlèvement (Origine)" : "Pickup Location (Origin)"} *
                    </label>
                    {savedAddresses.length > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <span>{language === "fr" ? "Remplir depuis carnet :" : "Use saved facility:"}</span>
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
                      </div>
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
                      {errors.originCity && (
                        <p className="text-[10px] text-red-600 mt-1">{errors.originCity.message}</p>
                      )}
                    </div>
                    <div>
                      <input
                        {...register("originProvince")}
                        placeholder="Province (e.g. QC)"
                        className={`w-full px-3.5 py-2.5 bg-slate-50 border ${
                          errors.originProvince ? "border-red-500" : "border-slate-200"
                        } focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition font-medium`}
                      />
                      {errors.originProvince && (
                        <p className="text-[10px] text-red-600 mt-1">{errors.originProvince.message}</p>
                      )}
                    </div>
                    <div>
                      <input
                        {...register("originPostal")}
                        placeholder="Postal Code (e.g. H4E 4N4)"
                        className={`w-full px-3.5 py-2.5 bg-slate-50 border ${
                          errors.originPostal ? "border-red-500" : "border-slate-200"
                        } focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition font-medium`}
                      />
                      {errors.originPostal && (
                        <p className="text-[10px] text-red-600 mt-1">{errors.originPostal.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Destination */}
                <div className="space-y-3 pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      {language === "fr" ? "Lieu de Livraison (Destination)" : "Delivery Location (Destination)"} *
                    </label>
                    {savedAddresses.length > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <span>{language === "fr" ? "Remplir depuis carnet :" : "Use saved facility:"}</span>
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
                      </div>
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
                      {errors.destinationCity && (
                        <p className="text-[10px] text-red-600 mt-1">{errors.destinationCity.message}</p>
                      )}
                    </div>
                    <div>
                      <input
                        {...register("destinationProvince")}
                        placeholder="Province / State (e.g. MI)"
                        className={`w-full px-3.5 py-2.5 bg-slate-50 border ${
                          errors.destinationProvince ? "border-red-500" : "border-slate-200"
                        } focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition font-medium`}
                      />
                      {errors.destinationProvince && (
                        <p className="text-[10px] text-red-600 mt-1">{errors.destinationProvince.message}</p>
                      )}
                    </div>
                    <div>
                      <input
                        {...register("destinationPostal")}
                        placeholder="Postal / ZIP (e.g. 48214)"
                        className={`w-full px-3.5 py-2.5 bg-slate-50 border ${
                          errors.destinationPostal ? "border-red-500" : "border-slate-200"
                        } focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition font-medium`}
                      />
                      {errors.destinationPostal && (
                        <p className="text-[10px] text-red-600 mt-1">{errors.destinationPostal.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Transport Mode & Cargo Specs */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-5">
                <div className="border-b border-slate-100 pb-3 flex items-center gap-2 font-bold text-[#0B2545] text-sm sm:text-base">
                  <Truck className="w-5 h-5 text-[#d21f27]" />
                  <span>2. {language === "fr" ? "Mode de Transport & Cargaison" : "Transport Mode & Freight Specs"}</span>
                </div>

                {/* Mode Selectors */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    {language === "fr" ? "Sélectionnez le Type d'Équipement" : "Select Equipment / Mode"} *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {TRANSPORT_MODES.map((mode) => {
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
                            <input
                              type="radio"
                              value={mode.id}
                              {...register("transportMode")}
                              className="accent-[#d21f27]"
                            />
                          </div>
                          <span className="text-[11px] text-slate-500 leading-tight">{mode.desc}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Weight, Pallets, Commodity */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      {language === "fr" ? "Poids Total (LBS)" : "Gross Weight (lbs)"} *
                    </label>
                    <input
                      {...register("weightLbs")}
                      placeholder="e.g. 42000"
                      className={`w-full px-3.5 py-2.5 bg-slate-50 border ${
                        errors.weightLbs ? "border-red-500" : "border-slate-200"
                      } focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition font-medium`}
                    />
                    {errors.weightLbs && (
                      <p className="text-[10px] text-red-600 mt-1">{errors.weightLbs.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      {language === "fr" ? "Nombre de Palettes" : "Pallet / Skid Count"}
                    </label>
                    <input
                      {...register("palletCount")}
                      placeholder="e.g. 24"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      {language === "fr" ? "Date d'Enlèvement Souhaitée" : "Target Pickup Date"} *
                    </label>
                    <input
                      type="date"
                      {...register("pickupDate")}
                      className={`w-full px-3.5 py-2.5 bg-slate-50 border ${
                        errors.pickupDate ? "border-red-500" : "border-slate-200"
                      } focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition font-medium`}
                    />
                  </div>
                </div>

                {/* Commodity Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {language === "fr" ? "Description de la Marchandise" : "Commodity / Freight Description"} *
                  </label>
                  <input
                    {...register("commodityType")}
                    placeholder="e.g. Packaged Consumer Goods, Industrial Auto Parts, Frozen Seafood"
                    className={`w-full px-3.5 py-2.5 bg-slate-50 border ${
                      errors.commodityType ? "border-red-500" : "border-slate-200"
                    } focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition font-medium`}
                  />
                  {errors.commodityType && (
                    <p className="text-[10px] text-red-600 mt-1">{errors.commodityType.message}</p>
                  )}
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
                    {language === "fr" ? "Instructions de Manutention (Optionnel)" : "Accessorials & Notes (Tailgate, Appointment, etc.)"}
                  </label>
                  <textarea
                    {...register("specialInstructions")}
                    rows={2}
                    placeholder="e.g. Liftgate required at delivery dock. Inside delivery."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition font-medium resize-none"
                  />
                </div>
              </div>

              {/* Section 3: Contact & Corporate Account Details */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-[#0B2545] text-sm sm:text-base">
                    <Building2 className="w-5 h-5 text-[#d21f27]" />
                    <span>3. {language === "fr" ? "Compte Client & Coordonnées" : "Corporate Account & Dispatch Contact"}</span>
                  </div>
                  {currentUser && (
                    <span className="text-[11px] text-blue-700 font-semibold bg-blue-50 px-2.5 py-0.5 rounded-full">
                      Signed in as {currentUser.companyName || currentUser.name}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      {language === "fr" ? "Nom de l'Entreprise" : "Company Name"} *
                    </label>
                    <input
                      {...register("companyName")}
                      className={`w-full px-3.5 py-2.5 bg-slate-50 border ${
                        errors.companyName ? "border-red-500" : "border-slate-200"
                      } focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition font-medium`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      {language === "fr" ? "Nom du Contact" : "Contact Full Name"} *
                    </label>
                    <input
                      {...register("contactName")}
                      className={`w-full px-3.5 py-2.5 bg-slate-50 border ${
                        errors.contactName ? "border-red-500" : "border-slate-200"
                      } focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition font-medium`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      {language === "fr" ? "Courriel de Réception" : "Dispatch Notification Email"} *
                    </label>
                    <input
                      {...register("contactEmail")}
                      className={`w-full px-3.5 py-2.5 bg-slate-50 border ${
                        errors.contactEmail ? "border-red-500" : "border-slate-200"
                      } focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition font-medium`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      {language === "fr" ? "Téléphone Direct" : "Direct Phone Number"} *
                    </label>
                    <input
                      {...register("contactPhone")}
                      className={`w-full px-3.5 py-2.5 bg-slate-50 border ${
                        errors.contactPhone ? "border-red-500" : "border-slate-200"
                      } focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition font-medium`}
                    />
                  </div>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingQuote}
                  className="w-full py-4 bg-[#d21f27] hover:bg-[#b51a21] text-white text-sm font-bold uppercase tracking-wider rounded-2xl shadow-lg hover:shadow-xl transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-5 h-5" />
                  <span>
                    {isSubmittingQuote
                      ? language === "fr"
                        ? "Calcul de l'itinéraire..."
                        : "Submitting Quote Request..."
                      : language === "fr"
                      ? "Soumettre la Demande de Fret"
                      : "Submit Freight Quote Request"}
                  </span>
                </button>
                <p className="text-center text-[11px] text-slate-400 mt-2">
                  Guaranteed all-inclusive CAD freight quote provided by Transimex Canadian Dispatch.
                </p>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

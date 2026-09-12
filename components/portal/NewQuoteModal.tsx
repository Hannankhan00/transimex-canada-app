"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { quoteRequestSchema, QuoteRequestFormData } from "@/lib/validations/quote";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { api } from "@/lib/api";
import { QuoteItem } from "@/lib/quoteTypes";
import { SavedAddress } from "@/lib/validations/address";
import { TRANSPORT_CATEGORIES, findCategoryForMode } from "@/lib/transportModes";
import {
  X,
  Truck,
  MapPin,
  User,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  Check,
  Zap,
} from "lucide-react";

interface NewQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuoteCreated?: (newQuote: QuoteItem) => void;
}

export default function NewQuoteModal({
  isOpen,
  onClose,
  onQuoteCreated,
}: NewQuoteModalProps) {
  const { language } = useLanguage();
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdQuote, setCreatedQuote] = useState<QuoteItem | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("truck");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
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

  const originCity = watch("originCity");
  const originProv = watch("originProvince");
  const destCity = watch("destinationCity");
  const destProv = watch("destinationProvince");
  const selectedMode = watch("transportMode");
  const weightLbs = watch("weightLbs");

  useEffect(() => {
    if (isOpen) {
      setCreatedQuote(null);
      setActiveCategory(findCategoryForMode("53' Dry Van").id);
      async function loadInfo() {
        const me = await api.auth.me();
        if (me?.user) {
          if (me.user.name) setValue("contactName", me.user.name);
          if (me.user.email) setValue("contactEmail", me.user.email);
          if (me.user.companyName) setValue("companyName", me.user.companyName);
          if (me.user.phone) setValue("contactPhone", me.user.phone);
        }
        try {
          const addrRes = await fetch("/api/addresses");
          if (addrRes.ok) {
            const addrData = await addrRes.json();
            const addrs: SavedAddress[] = addrData.addresses || [];
            setSavedAddresses(addrs);
            const defaultAddr = addrs.find(
              (a) => a.isDefault && a.addressType !== "Delivery"
            );
            if (defaultAddr) {
              setValue("originCity", defaultAddr.city);
              setValue("originProvince", defaultAddr.province);
              setValue("originPostal", defaultAddr.postalCode);
            }
          }
        } catch {
          // Address book is optional; ignore fetch failures here.
        }
      }
      loadInfo();
    }
  }, [isOpen, setValue]);

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

  const pickupAddresses = savedAddresses.filter((a) => a.addressType !== "Delivery");
  const deliveryAddresses = savedAddresses.filter((a) => a.addressType !== "Pickup");

  const onSubmit = async (data: QuoteRequestFormData) => {
    setIsSubmitting(true);
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
      const newQuote: QuoteItem = result.quote;
      if (onQuoteCreated) {
        onQuoteCreated(newQuote);
      }
      setCreatedQuote(newQuote);
    } catch (err: any) {
      alert(err.message || "Failed to submit quote request");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#0B2545]/70 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200/80 overflow-hidden my-6 animate-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="px-6 py-4 bg-[#0B2545] text-white flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#d21f27] text-white flex items-center justify-center shadow-xs">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#ff8f94]">
                {language === "fr" ? "Nouvelle Demande" : "New Quote Request"}
              </span>
              <h3 className="text-lg sm:text-xl font-extrabold tracking-tight text-white">
                {language === "fr" ? "Demande de Soumission de Fret" : "Request a Freight Quote"}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Route Preview */}
        <div className="bg-[#0B2545] text-white px-5 sm:px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {language === "fr" ? "Origine" : "Origin"}
              </div>
              <div className="text-sm font-bold truncate">
                {originCity || (language === "fr" ? "Ville d'origine" : "Origin city")}
                {originProv ? `, ${originProv}` : ""}
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {language === "fr" ? "Destination" : "Destination"}
              </div>
              <div className="text-sm font-bold truncate">
                {destCity || (language === "fr" ? "Ville de destination" : "Destination city")}
                {destProv ? `, ${destProv}` : ""}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-300 flex-shrink-0">
            <Truck className="w-3.5 h-3.5 text-[#d21f27]" />
            <span>{selectedMode}</span>
            {weightLbs && (
              <>
                <span className="text-slate-500">•</span>
                <span>{Number(weightLbs).toLocaleString()} lbs</span>
              </>
            )}
          </div>
        </div>

        {/* Modal Body / Confirmation */}
        <div className="p-5 sm:p-6 max-h-[65vh] overflow-y-auto">
          {createdQuote ? (
            <div className="text-center py-6 space-y-4 animate-in fade-in zoom-in-95">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#d21f27]">
                  {language === "fr" ? "Demande Enregistrée" : "Quote Request Registered"}
                </span>
                <h4 className="text-xl sm:text-2xl font-extrabold text-[#0B2545] mt-0.5">
                  Reference: {createdQuote.id}
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1.5 leading-relaxed">
                  {language === "fr"
                    ? "Votre soumission a été transmise à notre centre de répartition. Votre prix garanti sera calculé sous 15 minutes."
                    : "Your quote request is now under review by Transimex Canadian dispatch. Guaranteed pricing will appear on your dashboard within 15 minutes."}
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 max-w-sm mx-auto text-left text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Route:</span>
                  <span className="font-bold text-slate-900">{createdQuote.origin} → {createdQuote.destination}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Mode & Weight:</span>
                  <span className="font-semibold text-slate-800">{createdQuote.transportMode} ({createdQuote.weight})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="font-bold text-amber-700 bg-amber-100 px-2 py-0.2 rounded-full">Under Review</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-[#0B2545] hover:bg-[#123661] text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
                >
                  {language === "fr" ? "Fermer & Voir dans la Liste" : "Done & Return to Quotes"}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs">
              {/* Corridor Route Section */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#0B2545] text-xs flex items-center gap-1.5 uppercase tracking-wider">
                    <MapPin className="w-3.5 h-3.5 text-[#d21f27]" />
                    <span>1. {language === "fr" ? "Itinéraire & Adresses" : "Origin & Destination"}</span>
                  </span>
                  {savedAddresses.length > 0 && (
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                      Address Book Linked
                    </span>
                  )}
                </div>

                {/* Origin Inputs */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700 text-[11px] uppercase">
                      Origin Pickup *
                    </label>
                    {pickupAddresses.length > 0 && (
                      <select
                        onChange={(e) => handleOriginAddressSelect(e.target.value)}
                        className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] text-slate-700 outline-none"
                      >
                        <option value="">-- Autofill from saved address --</option>
                        {pickupAddresses.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.alias} ({a.city})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      {...register("originCity")}
                      placeholder="Origin City (Montreal)"
                      className={`px-3 py-2 bg-white border ${
                        errors.originCity ? "border-red-500" : "border-slate-200"
                      } rounded-xl outline-none focus:border-[#0B2545]`}
                    />
                    <input
                      {...register("originProvince")}
                      placeholder="Prov (QC)"
                      className={`px-3 py-2 bg-white border ${
                        errors.originProvince ? "border-red-500" : "border-slate-200"
                      } rounded-xl outline-none focus:border-[#0B2545]`}
                    />
                    <input
                      {...register("originPostal")}
                      placeholder="Postal (H4E 4N4)"
                      className={`px-3 py-2 bg-white border ${
                        errors.originPostal ? "border-red-500" : "border-slate-200"
                      } rounded-xl outline-none focus:border-[#0B2545]`}
                    />
                  </div>
                </div>

                {/* Destination Inputs */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700 text-[11px] uppercase">
                      Destination Delivery *
                    </label>
                    {deliveryAddresses.length > 0 && (
                      <select
                        onChange={(e) => handleDestinationAddressSelect(e.target.value)}
                        className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] text-slate-700 outline-none"
                      >
                        <option value="">-- Autofill from saved address --</option>
                        {deliveryAddresses.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.alias} ({a.city})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      {...register("destinationCity")}
                      placeholder="Dest City (Detroit)"
                      className={`px-3 py-2 bg-white border ${
                        errors.destinationCity ? "border-red-500" : "border-slate-200"
                      } rounded-xl outline-none focus:border-[#0B2545]`}
                    />
                    <input
                      {...register("destinationProvince")}
                      placeholder="State (MI)"
                      className={`px-3 py-2 bg-white border ${
                        errors.destinationProvince ? "border-red-500" : "border-slate-200"
                      } rounded-xl outline-none focus:border-[#0B2545]`}
                    />
                    <input
                      {...register("destinationPostal")}
                      placeholder="ZIP (48214)"
                      className={`px-3 py-2 bg-white border ${
                        errors.destinationPostal ? "border-red-500" : "border-slate-200"
                      } rounded-xl outline-none focus:border-[#0B2545]`}
                    />
                  </div>
                </div>
              </div>

              {/* Equipment & Freight Specs */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <span className="font-bold text-[#0B2545] text-xs flex items-center gap-1.5 uppercase tracking-wider">
                  <Truck className="w-3.5 h-3.5 text-[#d21f27]" />
                  <span>2. {language === "fr" ? "Équipement & Spécifications" : "Equipment & Cargo"}</span>
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
                          if (!cat.modes.some((m) => m.id === selectedMode)) {
                            setValue("transportMode", cat.modes[0].id, { shouldValidate: true });
                          }
                        }}
                        className={`p-2.5 rounded-xl border transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                          isActiveCat
                            ? "bg-[#0B2545] text-white border-[#0B2545] shadow-xs"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <cat.icon className={`w-4 h-4 flex-shrink-0 ${isActiveCat ? "text-[#ff8f94]" : "text-slate-400"}`} />
                        <span className="font-bold text-[11px]">{cat.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Equipment Sub-Options for Selected Category */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {TRANSPORT_CATEGORIES.find((cat) => cat.id === activeCategory)!.modes.map((mode) => {
                    const isSelected = selectedMode === mode.id;
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
                          <mode.icon className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? "text-white" : "text-slate-400"}`} />
                          <span className="font-bold text-[11px] truncate">{mode.name}</span>
                        </div>
                        <input
                          type="radio"
                          value={mode.id}
                          {...register("transportMode")}
                          className="hidden"
                        />
                        {isSelected && <Check className="w-3 h-3 text-white flex-shrink-0" />}
                      </label>
                    );
                  })}
                </div>
                {errors.transportMode && (
                  <p className="text-[11px] text-red-600 font-semibold">{errors.transportMode.message}</p>
                )}

                {/* Weight, Pallets, Pickup Date */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                      Weight (lbs) *
                    </label>
                    <input
                      {...register("weightLbs")}
                      placeholder="e.g. 42000"
                      className={`w-full px-3 py-2 bg-white border ${
                        errors.weightLbs ? "border-red-500" : "border-slate-200"
                      } rounded-xl outline-none focus:border-[#0B2545]`}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                      Pallet Count
                    </label>
                    <input
                      {...register("palletCount")}
                      placeholder="e.g. 24"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#0B2545]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                      Pickup Date *
                    </label>
                    <input
                      type="date"
                      {...register("pickupDate")}
                      className={`w-full px-3 py-2 bg-white border ${
                        errors.pickupDate ? "border-red-500" : "border-slate-200"
                      } rounded-xl outline-none focus:border-[#0B2545]`}
                    />
                  </div>
                </div>

                {/* Dimensions */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                    Dimensions (in) *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      {...register("dimLengthIn")}
                      placeholder="Length"
                      className={`w-full px-3 py-2 bg-white border ${
                        errors.dimLengthIn ? "border-red-500" : "border-slate-200"
                      } rounded-xl outline-none focus:border-[#0B2545]`}
                    />
                    <input
                      {...register("dimWidthIn")}
                      placeholder="Width"
                      className={`w-full px-3 py-2 bg-white border ${
                        errors.dimWidthIn ? "border-red-500" : "border-slate-200"
                      } rounded-xl outline-none focus:border-[#0B2545]`}
                    />
                    <input
                      {...register("dimHeightIn")}
                      placeholder="Height"
                      className={`w-full px-3 py-2 bg-white border ${
                        errors.dimHeightIn ? "border-red-500" : "border-slate-200"
                      } rounded-xl outline-none focus:border-[#0B2545]`}
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
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                    Commodity Description *
                  </label>
                  <input
                    {...register("commodityType")}
                    placeholder="e.g. Industrial Machinery, Frozen Food, Electronics"
                    className={`w-full px-3 py-2 bg-white border ${
                      errors.commodityType ? "border-red-500" : "border-slate-200"
                    } rounded-xl outline-none focus:border-[#0B2545]`}
                  />
                </div>

                {/* Temperature and Hazmat Toggles */}
                <div className="flex items-center gap-4 pt-0.5">
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      {...register("temperatureControlled")}
                      className="w-3.5 h-3.5 text-[#d21f27] rounded border-slate-300"
                    />
                    <span>Refrigerated / Temperature Controlled</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      {...register("hazmat")}
                      className="w-3.5 h-3.5 text-[#d21f27] rounded border-slate-300"
                    />
                    <span>Dangerous Goods / Hazmat</span>
                  </label>
                </div>

                {/* Special Instructions */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                    {language === "fr" ? "Instructions Spéciales (Optionnel)" : "Special Instructions (Optional)"}
                  </label>
                  <textarea
                    {...register("specialInstructions")}
                    rows={2}
                    placeholder={
                      language === "fr"
                        ? "Ex. rendez-vous de quai requis, chariot élévateur nécessaire, manutention fragile..."
                        : "e.g. dock appointment required, liftgate needed, fragile handling..."
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#0B2545] resize-none"
                  />
                  {errors.specialInstructions && (
                    <p className="text-[10px] text-red-600 mt-1">{errors.specialInstructions.message}</p>
                  )}
                </div>
              </div>

              {/* Contact Information */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <span className="font-bold text-[#0B2545] text-xs flex items-center gap-1.5 uppercase tracking-wider">
                  <User className="w-3.5 h-3.5 text-[#d21f27]" />
                  <span>3. {language === "fr" ? "Coordonnées" : "Contact Information"}</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                      {language === "fr" ? "Nom du Contact" : "Contact Name"} *
                    </label>
                    <input
                      {...register("contactName")}
                      placeholder="Jane Smith"
                      className={`w-full px-3 py-2 bg-white border ${
                        errors.contactName ? "border-red-500" : "border-slate-200"
                      } rounded-xl outline-none focus:border-[#0B2545]`}
                    />
                    {errors.contactName && (
                      <p className="text-[10px] text-red-600 mt-1">{errors.contactName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                      {language === "fr" ? "Entreprise (Optionnel)" : "Company Name (Optional)"}
                    </label>
                    <input
                      {...register("companyName")}
                      placeholder="Acme Inc."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#0B2545]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                      {language === "fr" ? "Courriel" : "Email"} *
                    </label>
                    <input
                      type="email"
                      {...register("contactEmail")}
                      placeholder="jane@company.com"
                      className={`w-full px-3 py-2 bg-white border ${
                        errors.contactEmail ? "border-red-500" : "border-slate-200"
                      } rounded-xl outline-none focus:border-[#0B2545]`}
                    />
                    {errors.contactEmail && (
                      <p className="text-[10px] text-red-600 mt-1">{errors.contactEmail.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                      {language === "fr" ? "Téléphone" : "Phone"} *
                    </label>
                    <input
                      type="tel"
                      {...register("contactPhone")}
                      placeholder="+1 (514) 555-0100"
                      className={`w-full px-3 py-2 bg-white border ${
                        errors.contactPhone ? "border-red-500" : "border-slate-200"
                      } rounded-xl outline-none focus:border-[#0B2545]`}
                    />
                    {errors.contactPhone && (
                      <p className="text-[10px] text-red-600 mt-1">{errors.contactPhone.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer text-center"
                >
                  {language === "fr" ? "Annuler" : "Cancel"}
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#d21f27] hover:bg-[#b51a21] text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? language === "fr"
                        ? "Calcul..."
                        : "Submitting Request..."
                      : language === "fr"
                      ? "Soumettre la Soumission"
                      : "Submit Quote Request"}
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

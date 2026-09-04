"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { quoteRequestSchema, QuoteRequestFormData } from "@/lib/validations/quote";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { api } from "@/lib/api";
import { QuoteItem } from "@/lib/mockData";
import { SavedAddress } from "@/lib/validations/address";
import {
  X,
  Truck,
  MapPin,
  Calendar,
  Package,
  ShieldCheck,
  Building2,
  User,
  Phone,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  Clock,
  Sparkles,
  Plane,
  Train,
  Check,
  Zap,
} from "lucide-react";

interface NewQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuoteCreated?: (newQuote: QuoteItem) => void;
}

const TRANSPORT_MODES = [
  { id: "53' Dry Van", name: "53' Dry Van", icon: Truck, desc: "Standard road freight" },
  { id: "Refrigerated Reefer", name: "Temp Reefer", icon: Package, desc: "Cold-chain (-25°C to +20°C)" },
  { id: "Intermodal Rail", name: "Intermodal Rail", icon: Train, desc: "CN / CPKC cross-country" },
  { id: "Flatbed / Heavy Haul", name: "Flatbed Heavy", icon: Truck, desc: "Oversized & industrial" },
  { id: "Air Freight Expedited", name: "Air Expedited", icon: Plane, desc: "Next-Flight-Out express" },
  { id: "Cross-Border LTL", name: "Cross-Border LTL", icon: Truck, desc: "Bonded customs P&D" },
] as const;

export default function NewQuoteModal({
  isOpen,
  onClose,
  onQuoteCreated,
}: NewQuoteModalProps) {
  const { language } = useLanguage();
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdQuote, setCreatedQuote] = useState<QuoteItem | null>(null);

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
            const defaultAddr = addrs.find((a) => a.isDefault);
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
                {language === "fr" ? "Portail de Cotation Instantanée" : "Instant Freight Quotation"}
              </span>
              <h3
                className="text-lg sm:text-xl font-bold tracking-tight text-white"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {language === "fr" ? "Demande de Soumission de Fret" : "Request Instant Freight Quote"}
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

        {/* Visual Blurred Diagram Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-[#0B2545] via-[#123661] to-[#1E3A8A] text-white p-5 sm:p-6 border-b border-slate-200">
          {/* Ambient Glows & Grid */}
          <div className="absolute -top-10 -right-10 w-44 h-44 bg-[#d21f27]/30 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Origin Box */}
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-3.5 flex-1 w-full text-center sm:text-left shadow-lg">
              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Origin Terminal</span>
              </div>
              <div className="text-sm font-bold text-white mt-1 truncate">
                {originCity || "Montreal"}, {originProv || "QC"}
              </div>
              <div className="text-[11px] text-slate-300 font-mono">
                Commercial Pickup Hub
              </div>
            </div>

            {/* Connecting Corridor Graphic */}
            <div className="flex flex-col items-center justify-center px-2 py-1 text-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1 mb-1">
                <Sparkles className="w-3 h-3" />
                <span>{selectedMode}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-[2px] w-8 sm:w-12 bg-gradient-to-r from-emerald-400 to-[#d21f27]" />
                <div className="w-8 h-8 rounded-full bg-[#d21f27] text-white flex items-center justify-center shadow-md animate-pulse">
                  <Truck className="w-4 h-4" />
                </div>
                <div className="h-[2px] w-8 sm:w-12 bg-gradient-to-r from-[#d21f27] to-red-400" />
              </div>
              <div className="text-[9px] text-slate-300 mt-1 font-mono">
                {weightLbs ? `${Number(weightLbs).toLocaleString()} lbs` : "Full Payload"}
              </div>
            </div>

            {/* Destination Box */}
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-3.5 flex-1 w-full text-center sm:text-right shadow-lg">
              <div className="flex items-center justify-center sm:justify-end gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#ff8f94]">
                <MapPin className="w-3 h-3 text-[#d21f27]" />
                <span>Destination Receiving</span>
              </div>
              <div className="text-sm font-bold text-white mt-1 truncate">
                {destCity || "Detroit"}, {destProv || "MI"}
              </div>
              <div className="text-[11px] text-slate-300 font-mono">
                Direct Receiving Facility
              </div>
            </div>
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
                <h4
                  className="text-xl sm:text-2xl font-bold text-[#0B2545] mt-0.5"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
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
                    {savedAddresses.length > 0 && (
                      <select
                        onChange={(e) => handleOriginAddressSelect(e.target.value)}
                        className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] text-slate-700 outline-none"
                      >
                        <option value="">-- Autofill from saved address --</option>
                        {savedAddresses.map((a) => (
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
                    {savedAddresses.length > 0 && (
                      <select
                        onChange={(e) => handleDestinationAddressSelect(e.target.value)}
                        className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] text-slate-700 outline-none"
                      >
                        <option value="">-- Autofill from saved address --</option>
                        {savedAddresses.map((a) => (
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

                {/* Transport Mode Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {TRANSPORT_MODES.map((mode) => {
                    const isSelected = selectedMode === mode.id;
                    return (
                      <label
                        key={mode.id}
                        className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-1.5 ${
                          isSelected
                            ? "bg-[#0B2545] text-white border-[#0B2545] shadow-xs"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <mode.icon className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? "text-[#ff8f94]" : "text-slate-400"}`} />
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
                      : "Submit Instant Quote"}
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

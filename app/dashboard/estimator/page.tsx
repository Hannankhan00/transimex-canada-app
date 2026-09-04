"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  FreightMode,
  RateCard,
  SUPPORTED_ORIGINS,
  SUPPORTED_DESTINATIONS,
  SEED_RATE_CARDS,
} from "@/lib/pricing/rateCards";
import {
  calculateFreightEstimate,
  EstimateResult,
} from "@/lib/pricing/estimator";
import NewQuoteModal from "@/components/portal/NewQuoteModal";
import {
  Calculator,
  Plane,
  Ship,
  Truck,
  Layers,
  Scale,
  Box,
  MapPin,
  ArrowRight,
  ShieldCheck,
  Clock,
  Sparkles,
  Info,
  DollarSign,
  Download,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  FileSpreadsheet,
  Zap,
  Globe2,
  ChevronDown,
  RotateCcw,
} from "lucide-react";

type UnitSystem = "metric" | "imperial";
type CurrencyView = "CAD" | "USD" | "EUR" | "XAF";

const CURRENCY_RATES: Record<CurrencyView, { symbol: string; rate: number; label: string }> = {
  CAD: { symbol: "$", rate: 1.0, label: "CAD ($)" },
  USD: { symbol: "$", rate: 0.74, label: "USD ($)" },
  EUR: { symbol: "€", rate: 0.68, label: "EUR (€)" },
  XAF: { symbol: "FCFA ", rate: 445.0, label: "XAF (FCFA)" },
};

export default function PriceEstimatorPage() {
  const { t, language } = useLanguage();

  // Mode & Corridor
  const [mode, setMode] = useState<FreightMode>("air");
  const [origin, setOrigin] = useState<string>("CA");
  const [destination, setDestination] = useState<string>("CM");
  const [selectedHub, setSelectedHub] = useState<string>("");

  // Cargo Inputs
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("metric");
  const [packageCount, setPackageCount] = useState<number>(1);
  const [length, setLength] = useState<number>(80);
  const [width, setWidth] = useState<number>(60);
  const [height, setHeight] = useState<number>(50);
  const [actualWeight, setActualWeight] = useState<number>(25);
  const [containerSize, setContainerSize] = useState<"20ft" | "40ft">("20ft");
  const [cbmDirect, setCbmDirect] = useState<number>(2.5);
  const [declaredValue, setDeclaredValue] = useState<number>(1000);
  const [includeInsurance, setIncludeInsurance] = useState<boolean>(true);

  // Currency View
  const [currency, setCurrency] = useState<CurrencyView>("CAD");

  // Booking Modal
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [showTariffAudit, setShowTariffAudit] = useState(false);

  // Available Destination Hubs
  const currentDestObj = useMemo(() => {
    return SUPPORTED_DESTINATIONS.find((d) => d.code === destination) || SUPPORTED_DESTINATIONS[0];
  }, [destination]);

  useEffect(() => {
    if (currentDestObj.hubs.length > 0) {
      setSelectedHub(currentDestObj.hubs[0]);
    }
  }, [currentDestObj]);

  // Convert Imperial to Metric if necessary for the calculation engine
  const metricValues = useMemo(() => {
    if (unitSystem === "metric") {
      return {
        length_cm: Number(length) || 0,
        width_cm: Number(width) || 0,
        height_cm: Number(height) || 0,
        weight_kg: Number(actualWeight) || 0,
      };
    } else {
      // Inches to cm, lbs to kg
      return {
        length_cm: (Number(length) || 0) * 2.54,
        width_cm: (Number(width) || 0) * 2.54,
        height_cm: (Number(height) || 0) * 2.54,
        weight_kg: (Number(actualWeight) || 0) * 0.453592,
      };
    }
  }, [unitSystem, length, width, height, actualWeight]);

  // Live Instant Calculation
  const estimateResult: EstimateResult = useMemo(() => {
    return calculateFreightEstimate({
      origin,
      destination,
      mode,
      dimensions:
        mode === "air" || mode === "land"
          ? {
              length_cm: metricValues.length_cm,
              width_cm: metricValues.width_cm,
              height_cm: metricValues.height_cm,
            }
          : undefined,
      package_count: mode === "air" || mode === "land" ? Number(packageCount) || 1 : 1,
      actual_weight_kg: metricValues.weight_kg,
      container_size: containerSize,
      cbm: mode === "sea_lcl" ? Number(cbmDirect) || 0 : undefined,
      declared_value: includeInsurance ? Number(declaredValue) || 0 : 0,
    });
  }, [
    origin,
    destination,
    mode,
    metricValues,
    packageCount,
    containerSize,
    cbmDirect,
    declaredValue,
    includeInsurance,
  ]);

  // Format currency helpers
  const formatMoney = (cadAmount: number) => {
    const rateInfo = CURRENCY_RATES[currency];
    const converted = cadAmount * rateInfo.rate;
    if (currency === "XAF") {
      return `${rateInfo.symbol}${Math.round(converted).toLocaleString()}`;
    }
    return `${rateInfo.symbol}${converted.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const handleDownloadEstimatePdf = () => {
    const content = `TRANSIMEX CANADA LOGISTICS - FREIGHT ESTIMATE SHEET\n=======================================================\nCorridor: Canada (${origin}) -> ${currentDestObj.name} (${destination})\nMode: ${estimateResult.mode_label || mode}\nHub: ${selectedHub}\nDate: ${new Date().toLocaleDateString()}\n-------------------------------------------------------\nChargeable Weight: ${estimateResult.chargeable_weight_kg} kg (Actual: ${estimateResult.actual_weight_kg} kg | Volumetric: ${estimateResult.volumetric_weight_kg} kg)\nBase Freight: CAD $${estimateResult.breakdown.base_cost.toFixed(2)}\nFuel Surcharge: CAD $${estimateResult.breakdown.fuel_surcharge.toFixed(2)}\nTerminal & Customs Handling: CAD $${estimateResult.breakdown.customs_handling_fee.toFixed(2)}\nInsurance: CAD $${estimateResult.breakdown.insurance.toFixed(2)}\n-------------------------------------------------------\nTOTAL ESTIMATE: CAD $${estimateResult.total_estimate.toFixed(2)} (${formatMoney(estimateResult.total_estimate)})\nEstimated Transit Time: ${estimateResult.transit_time_days}\n=======================================================\nNote: This is an automated estimate based on standard tariffs. Final billing is confirmed upon cargo physical verification.`;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Transimex_Freight_Estimate_${origin}_${destination}_${mode.toUpperCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const modeOptions: { id: FreightMode; name: string; icon: any; sub: string; badge: string }[] = [
    {
      id: "air",
      name: "Air Cargo",
      icon: Plane,
      sub: "IATA 1:6000 Volumetric Tariff",
      badge: "Fastest (3-6 Days)",
    },
    {
      id: "sea_fcl",
      name: "Ocean FCL",
      icon: Ship,
      sub: "Full 20ft / 40ft Container",
      badge: "High Capacity",
    },
    {
      id: "sea_lcl",
      name: "Ocean LCL",
      icon: Layers,
      sub: "CBM Groupage Consolidation",
      badge: "Economical",
    },
    {
      id: "land",
      name: "Road / Land",
      icon: Truck,
      sub: "Cross-Border & Trans-Canada",
      badge: "Direct Highway",
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#d21f27]">
              {language === "fr" ? "Outil de Calcul Logistique" : "Logistics Tariff Engine"}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live EDI Tariffs Active
            </span>
          </div>
          <h1
            className="text-2xl sm:text-3xl font-bold text-[#0B2545] tracking-tight leading-tight mt-1"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {t.nav.estimator}
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            {language === "fr"
              ? "Estimez instantanément vos coûts d'expédition internationaux Canada-Afrique et Amérique du Nord selon le poids volumétrique IATA."
              : "Instant self-serve freight rating engine. Calculates volumetric weights, carrier fuel surcharges, and customs handling."}
          </p>
        </div>

        {/* Currency Switcher */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs overflow-x-auto">
          {(["CAD", "USD", "EUR", "XAF"] as CurrencyView[]).map((curr) => (
            <button
              key={curr}
              type="button"
              onClick={() => setCurrency(curr)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                currency === curr
                  ? "bg-[#0B2545] text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {curr}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Form Left, Instant Result Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Estimator Input Wizard (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Step 1: Mode Selection */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#0B2545] uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#0B2545] text-white flex items-center justify-center text-[10px] font-bold">1</span>
                <span>Select Transport Mode</span>
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Standard Carrier Divisors</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {modeOptions.map((opt) => {
                const isSelected = mode === opt.id;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setMode(opt.id)}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-2 relative ${
                      isSelected
                        ? "bg-[#0B2545] text-white border-[#0B2545] shadow-md ring-2 ring-[#0B2545]/20"
                        : "bg-slate-50/70 border-slate-200 hover:bg-slate-100/80 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Icon className={`w-5 h-5 ${isSelected ? "text-[#ff8f94]" : "text-slate-500"}`} />
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                          isSelected
                            ? "bg-white/20 text-white"
                            : "bg-slate-200/80 text-slate-600"
                        }`}
                      >
                        {opt.badge}
                      </span>
                    </div>
                    <div>
                      <div className="text-xs font-bold">{opt.name}</div>
                      <div className={`text-[10px] truncate ${isSelected ? "text-slate-300" : "text-slate-400"}`}>
                        {opt.sub}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Corridor & Hubs */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <span className="text-xs font-bold text-[#0B2545] uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#0B2545] text-white flex items-center justify-center text-[10px] font-bold">2</span>
              <span>Origin & Destination Corridor</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Origin Country */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase">
                  Origin Country
                </label>
                <div className="relative">
                  <select
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0B2545] rounded-xl text-xs font-semibold text-slate-900 outline-none transition cursor-pointer"
                  >
                    {SUPPORTED_ORIGINS.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
                <span className="text-[10px] text-slate-400">Hub: Montreal (YUL) & Toronto (YYZ)</span>
              </div>

              {/* Destination Country */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase">
                  Destination Country
                </label>
                <div className="relative">
                  <select
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0B2545] rounded-xl text-xs font-semibold text-slate-900 outline-none transition cursor-pointer"
                  >
                    {SUPPORTED_DESTINATIONS.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name} ({c.region})
                      </option>
                    ))}
                  </select>
                </div>
                <span className="text-[10px] text-emerald-600 font-semibold">
                  Hub: {currentDestObj.hubs[0] || "Main International Port"}
                </span>
              </div>
            </div>
          </div>

          {/* Step 3: Cargo Dimensions & Weights */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#0B2545] uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#0B2545] text-white flex items-center justify-center text-[10px] font-bold">3</span>
                <span>Cargo Specifications</span>
              </span>

              {/* Unit Toggle */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setUnitSystem("metric")}
                  className={`px-2 py-0.5 rounded transition ${
                    unitSystem === "metric" ? "bg-white text-[#0B2545] shadow-xs" : "text-slate-500"
                  }`}
                >
                  Metric (cm / kg)
                </button>
                <button
                  type="button"
                  onClick={() => setUnitSystem("imperial")}
                  className={`px-2 py-0.5 rounded transition ${
                    unitSystem === "imperial" ? "bg-white text-[#0B2545] shadow-xs" : "text-slate-500"
                  }`}
                >
                  Imperial (in / lbs)
                </button>
              </div>
            </div>

            {/* Mode-specific Fields */}
            {mode === "sea_fcl" ? (
              /* FCL Container Size Picker */
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Select ISO Shipping Container Size
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: "20ft", label: "20ft Standard Dry Container", cap: "33.2 CBM / ~28,000 kg" },
                    { id: "40ft", label: "40ft High Cube Container", cap: "76.4 CBM / ~28,500 kg" },
                  ].map((cnt) => (
                    <button
                      key={cnt.id}
                      type="button"
                      onClick={() => setContainerSize(cnt.id as any)}
                      className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                        containerSize === cnt.id
                          ? "bg-[#0B2545]/5 border-[#0B2545] ring-2 ring-[#0B2545]/20 font-bold text-[#0B2545]"
                          : "bg-slate-50 border-slate-200 text-slate-700"
                      }`}
                    >
                      <div className="text-xs font-bold">{cnt.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{cnt.cap}</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : mode === "sea_lcl" ? (
              /* LCL CBM Selector */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Consolidated Volume (CBM / m³)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="30"
                    value={cbmDirect}
                    onChange={(e) => setCbmDirect(parseFloat(e.target.value) || 1)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0B2545] rounded-xl text-xs font-bold outline-none"
                  />
                  <span className="text-[10px] text-slate-400">1 CBM ≈ 1,000 kg threshold</span>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Actual Gross Weight ({unitSystem === "metric" ? "kg" : "lbs"})
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={actualWeight}
                    onChange={(e) => setActualWeight(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0B2545] rounded-xl text-xs font-bold outline-none"
                  />
                  <span className="text-[10px] text-slate-400">Billed on volume vs weight parity</span>
                </div>
              </div>
            ) : (
              /* Air & Land Dimensions & Package Count */
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Length ({unitSystem === "metric" ? "cm" : "in"})
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={length}
                      onChange={(e) => setLength(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0B2545] rounded-xl text-xs font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Width ({unitSystem === "metric" ? "cm" : "in"})
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={width}
                      onChange={(e) => setWidth(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0B2545] rounded-xl text-xs font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Height ({unitSystem === "metric" ? "cm" : "in"})
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={height}
                      onChange={(e) => setHeight(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0B2545] rounded-xl text-xs font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Scale Weight ({unitSystem === "metric" ? "kg" : "lbs"})
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={actualWeight}
                      onChange={(e) => setActualWeight(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0B2545] rounded-xl text-xs font-bold outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-bold text-slate-700 uppercase">
                      Number of Identical Pieces:
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={packageCount}
                      onChange={(e) => setPackageCount(parseInt(e.target.value, 10) || 1)}
                      className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center outline-none"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Divisor: {mode === "air" ? "1:6000 (IATA Cargo)" : "1:3000 (Highway)"}
                  </span>
                </div>
              </div>
            )}

            {/* Insurance Option */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeInsurance}
                  onChange={(e) => setIncludeInsurance(e.target.checked)}
                  className="w-4 h-4 text-[#d21f27] rounded border-slate-300 focus:ring-[#d21f27]"
                />
                <span className="text-xs font-semibold text-slate-700">
                  Add Marine / Air Cargo Transit Insurance
                </span>
              </label>

              {includeInsurance && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-500">Declared Value: CAD $</span>
                  <input
                    type="number"
                    min="100"
                    step="500"
                    value={declaredValue}
                    onChange={(e) => setDeclaredValue(parseFloat(e.target.value) || 0)}
                    className="w-24 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none text-right"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Live Instant Tariff Breakdown Card (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Main Pricing Breakdown Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-lg relative overflow-hidden space-y-5">
            {/* Top Accent Bar */}
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-[#0B2545] via-[#d21f27] to-[#0B2545]" />

            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#d21f27]">
                  Instant Tariff Estimate
                </span>
                <h3 className="text-lg font-bold text-[#0B2545] mt-0.5 flex items-center gap-1.5">
                  <span>{currentDestObj.flag}</span>
                  <span>{estimateResult.origin} → {estimateResult.destination}</span>
                </h3>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-semibold block">Transit Lead Time</span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {estimateResult.transit_time_days}
                </span>
              </div>
            </div>

            {/* Chargeable Weight Rule Card (Crucial specification requirement) */}
            {(mode === "air" || mode === "land") && (
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-[#0B2545]" />
                    <span>Chargeable Weight Calculation</span>
                  </span>
                  <span className="text-slate-400 font-normal">MAX(Actual, Volumetric)</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="p-2 bg-white rounded-xl border border-slate-200 text-center">
                    <span className="text-[10px] text-slate-400 uppercase block">Scale Weight</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {estimateResult.actual_weight_kg} kg
                    </span>
                  </div>

                  <div className="p-2 bg-white rounded-xl border border-slate-200 text-center">
                    <span className="text-[10px] text-slate-400 uppercase block">Volumetric Wt</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {estimateResult.volumetric_weight_kg} kg
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 bg-blue-50/70 p-2 rounded-lg border border-blue-100 flex items-center justify-between">
                  <span>Billed Chargeable Weight:</span>
                  <span className="font-bold text-[#0B2545]">
                    {estimateResult.chargeable_weight_kg} kg
                  </span>
                </div>
              </div>
            )}

            {/* Itemized Line Items */}
            <div className="space-y-2.5 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Itemized Cost Breakdown
              </span>

              {/* Base Line Haul */}
              <div className="flex items-center justify-between text-slate-700">
                <div className="space-y-0.5">
                  <span className="font-semibold">Base Freight Rate</span>
                  <span className="text-[10px] text-slate-400 block">
                    {mode === "sea_fcl"
                      ? `Flat ${containerSize} Container Tariff`
                      : mode === "sea_lcl"
                      ? `${estimateResult.cbm_calculated} CBM @ $${estimateResult.rate_applied}/CBM`
                      : `${estimateResult.chargeable_weight_kg} kg @ $${estimateResult.rate_applied}/kg`}
                  </span>
                </div>
                <span className="font-bold text-slate-900 font-mono">
                  {formatMoney(estimateResult.breakdown.base_cost)}
                </span>
              </div>

              {/* Fuel Surcharge */}
              <div className="flex items-center justify-between text-slate-700">
                <div className="space-y-0.5">
                  <span className="font-semibold">Carrier Fuel Surcharge (FSC)</span>
                  <span className="text-[10px] text-slate-400 block">
                    {(estimateResult.breakdown.fuel_surcharge_pct * 100).toFixed(0)}% indexed surcharge
                  </span>
                </div>
                <span className="font-bold text-slate-900 font-mono">
                  {formatMoney(estimateResult.breakdown.fuel_surcharge)}
                </span>
              </div>

              {/* Port & Customs Handling */}
              <div className="flex items-center justify-between text-slate-700">
                <div className="space-y-0.5">
                  <span className="font-semibold">Customs & Terminal Handling</span>
                  <span className="text-[10px] text-slate-400 block">
                    Canadian Export Documentation & Security
                  </span>
                </div>
                <span className="font-bold text-slate-900 font-mono">
                  {formatMoney(estimateResult.breakdown.customs_handling_fee)}
                </span>
              </div>

              {/* Cargo Insurance */}
              {includeInsurance && (
                <div className="flex items-center justify-between text-slate-700">
                  <div className="space-y-0.5">
                    <span className="font-semibold">Transit Cargo Insurance</span>
                    <span className="text-[10px] text-slate-400 block">
                      {(estimateResult.breakdown.insurance_pct * 100).toFixed(1)}% of CAD ${declaredValue.toLocaleString()}
                    </span>
                  </div>
                  <span className="font-bold text-slate-900 font-mono">
                    {formatMoney(estimateResult.breakdown.insurance)}
                  </span>
                </div>
              )}

              {/* Minimum Charge Notice if triggered */}
              {estimateResult.min_charge_applied && (
                <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-800 flex items-center justify-between">
                  <span>Minimum Corridor Tariff Applied</span>
                  <span className="font-bold">CAD ${estimateResult.min_charge}</span>
                </div>
              )}
            </div>

            {/* Total Section */}
            <div className="pt-4 border-t-2 border-slate-100 space-y-2">
              <div className="flex items-end justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Estimated Freight Total ({currency})
                  </span>
                  <span className="text-2xl sm:text-3xl font-bold text-[#0B2545] tracking-tight">
                    {formatMoney(estimateResult.total_estimate)}
                  </span>
                </div>
                <div className="text-right text-[11px] text-slate-400">
                  CAD ${estimateResult.total_estimate.toFixed(2)}
                </div>
              </div>

              <p className="text-[10px] text-slate-400 leading-tight">
                * All-inclusive estimate. Subject to official physical verification and customs inspection at departure hub.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => setIsBookingModalOpen(true)}
                className="w-full py-3.5 bg-[#d21f27] hover:bg-[#b51a21] text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md hover:shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" />
                <span>Book This Load & Lock Tariff</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadEstimatePdf}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Formal Estimate Sheet</span>
              </button>
            </div>
          </div>

          {/* Quick Info & Transparency Accordion */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2">
            <button
              type="button"
              onClick={() => setShowTariffAudit(!showTariffAudit)}
              className="w-full flex items-center justify-between text-xs font-bold text-[#0B2545] cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-600" />
                <span>View Corridor Tariff Card Details ({estimateResult.rateCardId || "N/A"})</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${showTariffAudit ? "rotate-180" : ""}`} />
            </button>

            {showTariffAudit && (
              <div className="pt-2 text-[11px] text-slate-600 space-y-1.5 border-t border-slate-100 animate-in fade-in">
                <div><span className="font-semibold">Corridor:</span> Canada ({origin}) → {currentDestObj.name} ({destination})</div>
                <div><span className="font-semibold">Assigned Hub:</span> {selectedHub}</div>
                <div><span className="font-semibold">Carrier Divisor:</span> {mode === "air" ? "6000 (IATA)" : mode === "land" ? "3000" : "1000 (CBM)"}</div>
                <div><span className="font-semibold">Minimum Tariff:</span> CAD ${estimateResult.min_charge}</div>
                <div><span className="font-semibold">Fuel Surcharge:</span> {(estimateResult.breakdown.fuel_surcharge_pct * 100).toFixed(0)}%</div>
                <div><span className="font-semibold">Terminal Handling:</span> CAD ${estimateResult.breakdown.customs_handling_fee}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Booking Modal with Pre-populated Corridor Values */}
      <NewQuoteModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
      />
    </div>
  );
}

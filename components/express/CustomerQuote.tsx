"use client";

import React, { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import CountrySelect from "./CountrySelect";
import UnitToggle from "./UnitToggle";
import { lengthToCm, unitLabel, weightToKg, type UnitSystem } from "@/lib/express/units";
import { formatCad } from "@/lib/shipping/core/money";
import type { CustomerQuoteDTO } from "@/lib/express/quoteDto";

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]";

const num = (v: string) => (v.trim() === "" ? NaN : Number(v));

/**
 * Price check for a partner's customer. They see one final price and the
 * delivery estimate, nothing else, and cannot book: their partner does that.
 */
export default function CustomerQuote() {
  const { t, language } = useLanguage();
  const p = t.express.partner;
  const b = t.express.book;
  const [f, setF] = useState({ fromCountry: "CA", fromCity: "", fromPostal: "", country: "", toCity: "", toPostal: "", weight: "", length: "", width: "", height: "", value: "", pickup: false });
  const [units, setUnits] = useState<UnitSystem>("imperial");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [quote, setQuote] = useState<CustomerQuoteDTO | null>(null);

  const set = (k: keyof typeof f, v: string | boolean) => {
    setF((x) => ({ ...x, [k]: v }));
    setQuote(null);
    setError("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const dims = [f.length, f.width, f.height].map((v) => lengthToCm(num(v), units));
    const weightKg = weightToKg(num(f.weight), units);
    const value = Math.round(num(f.value) * 100);
    if (!f.fromCity.trim() || !f.country || !f.toCity.trim() || !(weightKg >= 0.1) || dims.some((d) => !(d >= 1)) || !Number.isFinite(value) || value < 0) {
      return setError(p.customerQuoteRequired);
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/express/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: { countryCode: f.fromCountry, postalCode: f.fromPostal.trim(), city: f.fromCity.trim() },
          destination: { countryCode: f.country, postalCode: f.toPostal.trim(), city: f.toCity.trim() },
          parcels: [{ weightKg, lengthCm: dims[0], widthCm: dims[1], heightCm: dims[2] }],
          declaredValueCents: value,
          isCustomsDeclarable: true,
          pickupRequested: f.pickup,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.fields?.[0]?.message || data.error || p.customerQuoteError);
      setQuote(data.quote);
    } catch (err: any) {
      setError(err.message || p.customerQuoteError);
    } finally {
      setLoading(false);
    }
  };

  const field = (label: string, node: React.ReactNode) => (
    <label className="block space-y-1">
      <span className="text-xs font-bold text-slate-700">{label}</span>
      {node}
    </label>
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-[#0B2545]">{p.customerQuoteTitle}</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">{p.customerQuoteSubtitle}</p>
      </div>

      <form onSubmit={submit} noValidate className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-[#0B2545]">{p.customerQuoteFrom}</h2>
            {field(
              b.country,
              <CountrySelect className={inputClass} value={f.fromCountry} onChange={(code) => set("fromCountry", code)} ariaLabel={b.country} />
            )}
            {field(b.city, <input className={inputClass} value={f.fromCity} onChange={(e) => set("fromCity", e.target.value)} />)}
            {field(b.postal, <input className={inputClass} value={f.fromPostal} onChange={(e) => set("fromPostal", e.target.value)} />)}
          </div>
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-[#0B2545]">{p.customerQuoteTo}</h2>
            {field(
              b.country,
              <CountrySelect className={inputClass} value={f.country} onChange={(code) => set("country", code)} ariaLabel={b.country} />
            )}
            <div className="grid grid-cols-2 gap-3">
              {field(b.city, <input className={inputClass} value={f.toCity} onChange={(e) => set("toCity", e.target.value)} />)}
              {field(b.postal, <input className={inputClass} value={f.toPostal} onChange={(e) => set("toPostal", e.target.value)} />)}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <UnitToggle value={units} onChange={setUnits} />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {field(unitLabel(p.customerQuoteWeight, units), <input className={inputClass} inputMode="decimal" value={f.weight} onChange={(e) => set("weight", e.target.value)} />)}
          {field(unitLabel(b.length, units), <input className={inputClass} inputMode="decimal" value={f.length} onChange={(e) => set("length", e.target.value)} />)}
          {field(unitLabel(b.width, units), <input className={inputClass} inputMode="decimal" value={f.width} onChange={(e) => set("width", e.target.value)} />)}
          {field(unitLabel(b.height, units), <input className={inputClass} inputMode="decimal" value={f.height} onChange={(e) => set("height", e.target.value)} />)}
          {field(p.customerQuoteValue, <input className={inputClass} inputMode="decimal" value={f.value} onChange={(e) => set("value", e.target.value)} />)}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="accent-[#0B2545]" checked={f.pickup} onChange={(e) => set("pickup", e.target.checked)} />
          {p.customerQuotePickup}
        </label>

        {error && (
          <p role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-[#D21F27] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#b91a21] disabled:opacity-60 cursor-pointer">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? p.customerQuoteLoading : p.customerQuoteButton}
        </button>
      </form>

      {quote && (
        <section role="status" className="space-y-2 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <p className="text-xs text-slate-500">
            {b.service}: <b className="text-slate-800">{quote.service.name}</b>
            {quote.service.estimatedDelivery && (
              <>
                {" · "}
                {b.delivery}: <b className="text-slate-800">{new Intl.DateTimeFormat(language === "fr" ? "fr-CA" : "en-CA", { dateStyle: "medium" }).format(new Date(quote.service.estimatedDelivery))}</b>
              </>
            )}
          </p>
          <p className="flex items-baseline justify-between gap-3 text-[#0B2545]">
            <span className="font-bold">{p.customerQuoteTotal}</span>
            <span className="text-3xl font-extrabold tabular-nums">{formatCad(quote.totalCents, language)}</span>
          </p>
          <p className="text-xs text-slate-500">{b.surchargesNote}</p>
          <p className="text-sm font-semibold text-slate-700">{p.customerQuoteBookNote}</p>
        </section>
      )}
    </div>
  );
}

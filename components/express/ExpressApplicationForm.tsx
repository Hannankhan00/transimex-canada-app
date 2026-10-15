"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, User } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { COUNTRIES } from "@/lib/data/countries";
import { TERMS } from "@/lib/express/terms";

type AccountType = "b2c" | "b2b";

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-bold text-slate-700">{label}</span>
      {children}
      {error && <span className="block text-xs text-red-600 font-semibold">{error}</span>}
    </label>
  );
}

export default function ExpressApplicationForm() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const a = t.express.apply;
  const terms = TERMS[language];

  const [type, setType] = useState<AccountType>("b2c");
  const [form, setForm] = useState({
    contactName: "",
    phone: "",
    country: "CA",
    companyName: "",
    address: "",
    businessType: "",
    expectedMonthlyVolume: "",
  });
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setFieldErrors({});

    if (!accepted) {
      setMessage(a.mustAcceptTerms);
      return;
    }

    const payload =
      type === "b2c"
        ? { type, contactName: form.contactName, phone: form.phone, country: form.country, language, acceptTerms: accepted }
        : {
            type,
            contactName: form.contactName,
            phone: form.phone,
            country: form.country,
            language,
            acceptTerms: accepted,
            company: {
              name: form.companyName,
              address: form.address,
              contactPerson: form.contactName,
              businessType: form.businessType,
              expectedMonthlyVolume: form.expectedMonthlyVolume,
            },
          };

    setSubmitting(true);
    try {
      const res = await fetch("/api/express/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 409) {
        router.replace("/express");
        return;
      }
      if (!res.ok) {
        if (Array.isArray(data.fields)) {
          const errors: Record<string, string> = {};
          for (const f of data.fields as { path: string; message: string }[]) errors[f.path] = f.message;
          setFieldErrors(errors);
        }
        setMessage(a.genericError);
        return;
      }

      // B2C is active at once and goes straight to booking; B2B lands on the waiting screen.
      router.replace(data.account?.status === "active" ? "/express/book" : "/express");
    } catch {
      setMessage(a.genericError);
    } finally {
      setSubmitting(false);
    }
  };

  const typeCards: { id: AccountType; icon: typeof User; title: string; desc: string }[] = [
    { id: "b2c", icon: User, title: a.b2cTitle, desc: a.b2cDesc },
    { id: "b2b", icon: Building2, title: a.b2bTitle, desc: a.b2bDesc },
  ];

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6" noValidate>
      <div>
        <h1 className="text-2xl font-extrabold text-[#0B2545]">{a.title}</h1>
        <p className="mt-1 text-sm text-slate-600">{a.subtitle}</p>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-xs font-bold text-slate-700 mb-2">{a.accountType}</legend>
        <div className="grid sm:grid-cols-2 gap-3">
          {typeCards.map((card) => {
            const selected = type === card.id;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => setType(card.id)}
                aria-pressed={selected}
                className={`text-left rounded-2xl border p-4 transition cursor-pointer ${
                  selected ? "border-[#0B2545] bg-[#0B2545]/5 ring-2 ring-[#0B2545]/15" : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <card.icon className={`w-5 h-5 ${selected ? "text-[#0B2545]" : "text-slate-400"}`} />
                <div className="mt-2 font-bold text-sm text-[#0B2545]">{card.title}</div>
                <div className="mt-0.5 text-xs text-slate-600 leading-relaxed">{card.desc}</div>
              </button>
            );
          })}
        </div>
      </fieldset>

      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
        <h2 className="font-bold text-[#0B2545]">{type === "b2b" ? a.companyDetails : a.yourDetails}</h2>

        {type === "b2b" && (
          <>
            <Field label={a.companyName} error={fieldErrors["company.name"]}>
              <input className={inputClass} value={form.companyName} onChange={set("companyName")} maxLength={160} required />
            </Field>
            <Field label={a.address} error={fieldErrors["company.address"]}>
              <input className={inputClass} value={form.address} onChange={set("address")} maxLength={300} required />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label={a.businessType} error={fieldErrors["company.businessType"]}>
                <input
                  className={inputClass}
                  value={form.businessType}
                  onChange={set("businessType")}
                  placeholder={a.businessTypePlaceholder}
                  maxLength={120}
                  required
                />
              </Field>
              <Field label={a.monthlyVolume} error={fieldErrors["company.expectedMonthlyVolume"]}>
                <input
                  className={inputClass}
                  value={form.expectedMonthlyVolume}
                  onChange={set("expectedMonthlyVolume")}
                  placeholder={a.monthlyVolumePlaceholder}
                  maxLength={60}
                  required
                />
              </Field>
            </div>
          </>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label={type === "b2b" ? a.contactPerson : a.fullName} error={fieldErrors.contactName}>
            <input className={inputClass} value={form.contactName} onChange={set("contactName")} maxLength={120} autoComplete="name" required />
          </Field>
          <Field label={a.phone} error={fieldErrors.phone}>
            <input className={inputClass} value={form.phone} onChange={set("phone")} inputMode="tel" autoComplete="tel" maxLength={25} required />
          </Field>
        </div>

        <Field label={a.country} error={fieldErrors.country}>
          <select className={inputClass} value={form.country} onChange={set("country")} required>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {language === "fr" ? c.nameFr : c.name}
              </option>
            ))}
          </select>
        </Field>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-3">
        <h2 className="font-bold text-[#0B2545]">{a.termsHeading}</h2>
        <div className="max-h-64 overflow-y-auto rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3 text-sm text-slate-700 leading-relaxed">
          <p className="font-semibold">{terms.heading}</p>
          <p>{terms.intro}</p>
          {terms.sections.map((s) => (
            <div key={s.title}>
              <p className="font-bold text-slate-800">{s.title}</p>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
        <label className="flex items-start gap-2.5 text-sm text-slate-800 cursor-pointer">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-[#0B2545]"
          />
          <span>{a.acceptTerms}</span>
        </label>
        {fieldErrors.acceptTerms && <p className="text-xs text-red-600 font-semibold">{fieldErrors.acceptTerms}</p>}
      </section>

      {message && (
        <p role="alert" className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-semibold">
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#D21F27] hover:bg-[#b91a21] disabled:opacity-60 text-white text-sm font-bold transition cursor-pointer"
      >
        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
        {submitting ? a.submitting : a.submit}
      </button>
    </form>
  );
}

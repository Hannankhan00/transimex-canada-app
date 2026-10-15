"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, Loader2, Pencil, User, X } from "lucide-react";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { COUNTRIES } from "@/lib/data/countries";
import type { TermsContent } from "@/lib/express/terms";
import {
  CATEGORY_VALUES,
  CLIENT_COUNT_VALUES,
  PAYMENT_VALUES,
  RESTRICTED_VALUES,
  SHIPS_FOR_VALUES,
  VALUE_VALUES,
  WEIGHT_VALUES,
  optionLabel,
  q,
} from "@/lib/express/shippingProfile";

type AccountType = "b2c" | "b2b";
type StepKey = "type" | "details" | "profile" | "terms";
type FieldKey = "contactName" | "phone" | "country" | "companyName" | "address" | "businessType";

const PHONE_OK = /^[+()\d\s.-]{7,25}$/;
/** Placeholder names the sign-up flow gives an account before the company is filled in. */
const PLACEHOLDER_COMPANY = /'s company$/i;

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]";

function Field({ label, error, required, hint, children }: { label: string; error?: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-bold text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-[#D21F27]"> *</span>}
      </span>
      {hint && <span className="block text-[11px] text-slate-500">{hint}</span>}
      {children}
      {error && <span className="block text-xs font-semibold text-red-600">{error}</span>}
    </label>
  );
}

/** A group of related controls (a question with radio cards or checkboxes), labelled for screen readers. */
function Question({ label, hint, error, required, children }: { label: string; hint?: string; error?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-bold text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-[#D21F27]"> *</span>}
      </legend>
      {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
      {children}
      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
    </fieldset>
  );
}

const emptyProfile = {
  categories: [] as string[],
  goodsDescription: "",
  shipsFor: "",
  clientCount: "",
  clientsDescription: "",
  destinations: "",
  typicalWeight: "",
  typicalValue: "",
  restrictedGoods: [] as string[],
  currentCarriers: "",
  paymentPreference: "",
  businessNumber: "",
  website: "",
};

/**
 * The Express application, as a popup in the client portal.
 *   1. Account type (individual or business)
 *   2. Details: what the CRM already knows is shown as a summary; only missing details are asked
 *   3. (business only) About your shipping: what they ship and for whom, so staff can decide
 *   4. Terms of service, then submit
 * An individual is active at once; a business account waits for staff approval. Either way the
 * client then lands in the Express portal.
 */
export default function ExpressApplyModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const a = t.express.apply;
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  const [stepKey, setStepKey] = useState<StepKey>("type");
  const [type, setType] = useState<AccountType | null>(null);
  const [form, setForm] = useState({ contactName: "", phone: "", country: "CA", companyName: "", address: "", businessType: "", expectedMonthlyVolume: "" });
  const [profile, setProfile] = useState(emptyProfile);
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [profileReady, setProfileReady] = useState(false);
  const [known, setKnown] = useState<Set<FieldKey>>(new Set());
  const [editing, setEditing] = useState(false);
  const [termsData, setTermsData] = useState<{ version: string; content: TermsContent } | null>(null);
  const [termsError, setTermsError] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const steps: StepKey[] = type === "b2b" ? ["type", "details", "profile", "terms"] : ["type", "details", "terms"];
  const stepIndex = steps.indexOf(stepKey);
  const stepLabels: Record<StepKey, string> = { type: a.stepType, details: a.stepDetails, profile: a.aboutShipping, terms: a.stepTerms };

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setMessage(null);
  };
  const setP = <K extends keyof typeof emptyProfile>(key: K, value: (typeof emptyProfile)[K]) => {
    setProfile((p) => ({ ...p, [key]: value }));
    setProfileErrors((e) => ({ ...e, [key]: "" }));
    setMessage(null);
  };
  const toggle = (key: "categories" | "restrictedGoods", value: string) => {
    setProfile((p) => {
      const has = p[key].includes(value);
      let next = has ? p[key].filter((v) => v !== value) : [...p[key], value];
      // "None of these" cannot sit beside a real choice.
      if (key === "restrictedGoods") {
        if (!has && value === "none") next = ["none"];
        if (!has && value !== "none") next = next.filter((v) => v !== "none");
      }
      return { ...p, [key]: next };
    });
    setProfileErrors((e) => ({ ...e, [key]: "" }));
    setMessage(null);
  };

  // ---- Dialog behaviour: Escape closes, the page behind does not scroll, focus stays inside ----
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && !submitting) {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab" || !dialogRef.current) return;
    const focusable = dialogRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  // ---- What the CRM already knows ----
  useEffect(() => {
    let alive = true;
    api.auth
      .me()
      .then(({ user }) => {
        if (!alive || !user) return;
        const street = (user.address || "").trim();
        const found: Partial<Record<FieldKey, string>> = {
          contactName: (user.name || "").trim(),
          phone: PHONE_OK.test((user.phone || "").trim()) ? (user.phone || "").trim() : "",
          companyName: PLACEHOLDER_COMPANY.test((user.companyName || "").trim()) ? "" : (user.companyName || "").trim(),
          address: street ? [street, user.city, user.province].map((p) => (p || "").trim()).filter(Boolean).join(", ") : "",
          businessType: (user.industry || "").trim(),
        };
        setForm((cur) => ({ ...cur, ...found }));
        // Canada is the default country, so it counts as known too.
        setKnown(new Set<FieldKey>([...(Object.keys(found) as FieldKey[]).filter((k) => found[k]), "country"]));
      })
      .catch(() => {})
      .finally(() => alive && setProfileReady(true));
    return () => {
      alive = false;
    };
  }, []);

  const loadTerms = useCallback(async () => {
    setTermsError(false);
    try {
      const res = await fetch("/api/express/terms");
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error("terms");
      setTermsData({ version: data.version, content: data.content });
    } catch {
      setTermsError(true);
    }
  }, []);
  useEffect(() => {
    loadTerms();
  }, [loadTerms]);

  // ---- Validation and navigation ----
  const fieldsFor = (tp: AccountType): FieldKey[] => (tp === "b2b" ? ["companyName", "address", "businessType", "contactName", "phone", "country"] : ["contactName", "phone", "country"]);

  const detailsProblem = (): string | null => {
    if (!type) return a.chooseTypeFirst;
    for (const k of fieldsFor(type)) if (!form[k].trim()) return t.express.book.required;
    if (!PHONE_OK.test(form.phone.trim())) return a.phoneInvalid;
    return null;
  };

  const validateProfile = (): Record<string, string> => {
    const need = a.answerRequired;
    const e: Record<string, string> = {};
    if (profile.categories.length === 0) e.categories = need;
    if (profile.goodsDescription.trim().length < 5) e.goodsDescription = need;
    if (!profile.shipsFor) e.shipsFor = need;
    if (profile.shipsFor && profile.shipsFor !== "own" && !profile.clientCount) e.clientCount = need;
    if (profile.destinations.trim().length < 2) e.destinations = need;
    if (!profile.typicalWeight) e.typicalWeight = need;
    if (!profile.typicalValue) e.typicalValue = need;
    if (profile.restrictedGoods.length === 0) e.restrictedGoods = need;
    if (!profile.paymentPreference) e.paymentPreference = need;
    if (!form.expectedMonthlyVolume.trim()) e.expectedMonthlyVolume = need;
    return e;
  };

  const goTo = (key: StepKey) => {
    setMessage(null);
    setStepKey(key);
  };

  const next = () => {
    setMessage(null);
    if (stepKey === "type") {
      if (!type) return setMessage(a.chooseTypeFirst);
      return goTo("details");
    }
    if (stepKey === "details") {
      const problem = detailsProblem();
      if (problem) return setMessage(problem);
      return goTo(type === "b2b" ? "profile" : "terms");
    }
    if (stepKey === "profile") {
      const errors = validateProfile();
      setProfileErrors(errors);
      if (Object.keys(errors).length > 0) return setMessage(t.express.book.required);
      return goTo("terms");
    }
  };

  const back = () => {
    const prev = steps[stepIndex - 1];
    if (prev) goTo(prev);
  };

  const submit = async () => {
    if (!type || !termsData || submitting) return;
    setMessage(null);
    setFieldErrors({});
    if (!accepted) return setMessage(a.mustAcceptTerms);

    const base = { type, contactName: form.contactName.trim(), phone: form.phone.trim(), country: form.country, language, acceptTerms: true, termsVersion: termsData.version };
    const payload =
      type === "b2c"
        ? base
        : {
            ...base,
            company: {
              name: form.companyName.trim(),
              address: form.address.trim(),
              contactPerson: form.contactName.trim(),
              businessType: form.businessType.trim(),
              expectedMonthlyVolume: form.expectedMonthlyVolume.trim(),
            },
            shippingProfile: {
              categories: profile.categories,
              goodsDescription: profile.goodsDescription.trim(),
              shipsFor: profile.shipsFor,
              ...(profile.shipsFor !== "own" ? { clientCount: profile.clientCount, clientsDescription: profile.clientsDescription.trim() } : {}),
              destinations: profile.destinations.trim(),
              typicalWeight: profile.typicalWeight,
              typicalValue: profile.typicalValue,
              restrictedGoods: profile.restrictedGoods,
              currentCarriers: profile.currentCarriers.trim(),
              paymentPreference: profile.paymentPreference,
              businessNumber: profile.businessNumber.trim(),
              website: profile.website.trim(),
            },
          };

    setSubmitting(true);
    try {
      const res = await fetch("/api/express/apply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));

      if (res.status === 409 && data.code === "terms_changed") {
        setAccepted(false);
        await loadTerms();
        setMessage(a.termsChanged);
        return;
      }
      if (res.status === 409) {
        // Already applied (another tab, or a double submit): just go to the portal.
        router.push("/express");
        onClose();
        return;
      }
      if (!res.ok) {
        if (Array.isArray(data.fields)) {
          const errors: Record<string, string> = {};
          for (const f of data.fields as { path: string; message: string }[]) errors[f.path] = f.message;
          setFieldErrors(errors);
          const profileIssues = Object.entries(errors).filter(([path]) => path.startsWith("shippingProfile."));
          if (profileIssues.length > 0) {
            setProfileErrors(Object.fromEntries(profileIssues.map(([path, msg]) => [path.replace("shippingProfile.", ""), msg])));
            setStepKey("profile");
          } else {
            // A problem with a detail we had hidden: go back and show every field so it can be fixed.
            setEditing(true);
            setStepKey("details");
          }
        }
        setMessage(a.genericError);
        return;
      }

      // Individual: active now. Business: waiting for approval. Both land in the Express portal.
      router.push("/express");
      onClose();
    } catch {
      setMessage(a.genericError);
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Rendering ----
  const countryName = (code: string) => {
    const c = COUNTRIES.find((x) => x.code === code);
    return c ? (language === "fr" ? c.nameFr : c.name) : code;
  };
  const terms = termsData?.content[language];

  const typeCards: { id: AccountType; icon: typeof User; title: string; desc: string; badge: string; badgeStyle: string }[] = [
    { id: "b2c", icon: User, title: a.b2cTitle, desc: a.b2cDesc, badge: a.b2cBadge, badgeStyle: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    { id: "b2b", icon: Building2, title: a.b2bTitle, desc: a.b2bDesc, badge: a.b2bBadge, badgeStyle: "bg-amber-50 text-amber-700 border-amber-200" },
  ];

  const detailsStep = () => {
    if (!type) return null;
    if (!profileReady) {
      return (
        <div className="flex items-center gap-2 py-6 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t.express.loading}
        </div>
      );
    }
    const labelFor: Record<FieldKey, string> = {
      companyName: a.companyName,
      address: a.address,
      businessType: a.businessType,
      contactName: type === "b2b" ? a.contactPerson : a.fullName,
      phone: a.phone,
      country: a.country,
    };
    const errorKey: Record<FieldKey, string> = { companyName: "company.name", address: "company.address", businessType: "company.businessType", contactName: "contactName", phone: "phone", country: "country" };
    const fields = fieldsFor(type);
    const summary = editing ? [] : fields.filter((k) => known.has(k));
    const asked = fields.filter((k) => editing || !known.has(k));

    const input = (k: FieldKey) =>
      k === "country" ? (
        <select className={inputClass} value={form.country} onChange={set("country")}>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {language === "fr" ? c.nameFr : c.name}
            </option>
          ))}
        </select>
      ) : (
        <input
          className={inputClass}
          value={form[k]}
          onChange={set(k)}
          maxLength={k === "address" ? 300 : k === "phone" ? 25 : 160}
          inputMode={k === "phone" ? "tel" : undefined}
          autoComplete={k === "phone" ? "tel" : k === "contactName" ? "name" : undefined}
          placeholder={k === "businessType" ? a.businessTypePlaceholder : undefined}
        />
      );

    return (
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-slate-600">{known.size > 1 ? a.detailsKnown : a.detailsAsk}</p>
          {known.size > 1 && (
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className="inline-flex flex-shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
            >
              {!editing && <Pencil className="h-3.5 w-3.5" />}
              {editing ? a.doneEditing : a.editDetails}
            </button>
          )}
        </div>

        {summary.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-3 text-xs text-slate-500">{a.fromAccountNote}</p>
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {summary.map((k) => (
                <div key={k} className={k === "address" ? "sm:col-span-2" : ""}>
                  <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{labelFor[k]}</dt>
                  <dd className="mt-0.5 break-words text-sm font-semibold text-slate-900">{k === "country" ? countryName(form.country) : form[k]}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {asked.length > 0 && (
          <div className="space-y-4">
            {summary.length > 0 && <p className="text-xs font-semibold text-amber-700">{a.stillNeeded}</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              {asked.map((k) => (
                <div key={k} className={k === "companyName" || k === "address" ? "sm:col-span-2" : ""}>
                  <Field label={labelFor[k]} error={fieldErrors[errorKey[k]]}>
                    {input(k)}
                  </Field>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // The business questions: what they ship, for whom, and how they would like to pay.
  const profileStep = () => {
    const L = language;
    const err = (k: string) => profileErrors[k] || "";
    const optionCard = (key: string, selected: boolean, onClick: () => void, label: string, role: "radio" | "checkbox") => (
      <button
        key={key}
        type="button"
        role={role}
        aria-checked={selected}
        onClick={onClick}
        className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm font-semibold transition ${
          selected ? "border-[#0B2545] bg-[#0B2545]/[0.05] text-[#0B2545] ring-1 ring-[#0B2545]/20" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
        }`}
      >
        <span
          className={`grid h-[18px] w-[18px] flex-shrink-0 place-items-center border ${role === "radio" ? "rounded-full" : "rounded-md"} ${
            selected ? "border-[#0B2545] bg-[#0B2545] text-white" : "border-slate-300 bg-white"
          }`}
        >
          {selected && <Check className="h-3 w-3" />}
        </span>
        {label}
      </button>
    );

    return (
      <div className="space-y-6">
        <p className="text-sm text-slate-600">{q("intro", L)}</p>

        <Question label={q("categories", L)} hint={q("categoriesHint", L)} error={err("categories")} required>
          <div role="group" aria-label={q("categories", L)} className="grid gap-2 sm:grid-cols-2">
            {CATEGORY_VALUES.map((v) => optionCard(v, profile.categories.includes(v), () => toggle("categories", v), optionLabel("categories", v, L), "checkbox"))}
          </div>
        </Question>

        <Field label={q("goodsDescription", L)} hint={q("goodsDescriptionHint", L)} error={err("goodsDescription")} required>
          <textarea
            className={`${inputClass} min-h-[84px] resize-y`}
            value={profile.goodsDescription}
            onChange={(e) => setP("goodsDescription", e.target.value)}
            maxLength={500}
            rows={3}
          />
        </Field>

        <Question label={q("shipsFor", L)} error={err("shipsFor")} required>
          <div role="radiogroup" aria-label={q("shipsFor", L)} className="space-y-2">
            {SHIPS_FOR_VALUES.map((v) => optionCard(v, profile.shipsFor === v, () => setP("shipsFor", v), optionLabel("shipsFor", v, L), "radio"))}
          </div>
        </Question>

        {profile.shipsFor && profile.shipsFor !== "own" && (
          <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <Field label={q("clientCount", L)} error={err("clientCount")} required>
              <select className={inputClass} value={profile.clientCount} onChange={(e) => setP("clientCount", e.target.value)}>
                <option value="">{q("chooseOne", L)}</option>
                {CLIENT_COUNT_VALUES.map((v) => (
                  <option key={v} value={v}>
                    {optionLabel("clientCount", v, L)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={q("clientsDescription", L)} hint={q("clientsDescriptionHint", L)}>
              <input className={inputClass} value={profile.clientsDescription} onChange={(e) => setP("clientsDescription", e.target.value)} maxLength={300} />
            </Field>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label={q("destinations", L)} hint={q("destinationsHint", L)} error={err("destinations")} required>
              <input className={inputClass} value={profile.destinations} onChange={(e) => setP("destinations", e.target.value)} maxLength={200} />
            </Field>
          </div>
          <Field label={a.monthlyVolume} error={err("expectedMonthlyVolume") || fieldErrors["company.expectedMonthlyVolume"]} required>
            <input
              className={inputClass}
              value={form.expectedMonthlyVolume}
              onChange={(e) => {
                set("expectedMonthlyVolume")(e);
                setProfileErrors((x) => ({ ...x, expectedMonthlyVolume: "" }));
              }}
              placeholder={a.monthlyVolumePlaceholder}
              maxLength={60}
            />
          </Field>
          <Field label={q("typicalWeight", L)} error={err("typicalWeight")} required>
            <select className={inputClass} value={profile.typicalWeight} onChange={(e) => setP("typicalWeight", e.target.value)}>
              <option value="">{q("chooseOne", L)}</option>
              {WEIGHT_VALUES.map((v) => (
                <option key={v} value={v}>
                  {optionLabel("typicalWeight", v, L)}
                </option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label={q("typicalValue", L)} error={err("typicalValue")} required>
              <select className={inputClass} value={profile.typicalValue} onChange={(e) => setP("typicalValue", e.target.value)}>
                <option value="">{q("chooseOne", L)}</option>
                {VALUE_VALUES.map((v) => (
                  <option key={v} value={v}>
                    {optionLabel("typicalValue", v, L)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        <Question label={q("restrictedGoods", L)} hint={q("restrictedHint", L)} error={err("restrictedGoods")} required>
          <div role="group" aria-label={q("restrictedGoods", L)} className="grid gap-2 sm:grid-cols-2">
            {RESTRICTED_VALUES.map((v) => optionCard(v, profile.restrictedGoods.includes(v), () => toggle("restrictedGoods", v), optionLabel("restrictedGoods", v, L), "checkbox"))}
          </div>
        </Question>

        <Question label={q("paymentPreference", L)} error={err("paymentPreference")} required>
          <div role="radiogroup" aria-label={q("paymentPreference", L)} className="space-y-2">
            {PAYMENT_VALUES.map((v) => optionCard(v, profile.paymentPreference === v, () => setP("paymentPreference", v), optionLabel("paymentPreference", v, L), "radio"))}
          </div>
        </Question>

        <div className="grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label={q("currentCarriers", L)}>
              <input className={inputClass} value={profile.currentCarriers} onChange={(e) => setP("currentCarriers", e.target.value)} maxLength={200} />
            </Field>
          </div>
          <Field label={q("businessNumber", L)}>
            <input className={inputClass} value={profile.businessNumber} onChange={(e) => setP("businessNumber", e.target.value)} maxLength={60} />
          </Field>
          <Field label={q("website", L)} error={err("website")}>
            <input className={inputClass} value={profile.website} onChange={(e) => setP("website", e.target.value)} maxLength={200} inputMode="url" placeholder="example.com" />
          </Field>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-[2px] sm:items-center sm:p-6" onKeyDown={onKeyDown}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl outline-none sm:max-h-[90vh] sm:rounded-2xl"
      >
        {/* Header */}
        <div className="shrink-0 border-b border-slate-200 px-5 pb-4 pt-5 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id={titleId} className="text-lg font-extrabold text-[#0B2545]">
                {a.modalTitle}
              </h2>
              <p className="mt-0.5 text-xs font-medium text-slate-500">{t.express.poweredBy}</p>
            </div>
            <button type="button" onClick={onClose} disabled={submitting} aria-label={a.close} className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40">
              <X className="h-5 w-5" />
            </button>
          </div>

          <ol className="mt-4 flex gap-2" aria-label="Progress">
            {steps.map((key, i) => {
              const done = i < stepIndex;
              const current = i === stepIndex;
              return (
                <li key={key} aria-current={current ? "step" : undefined} className={`min-w-0 ${current ? "flex-[3] sm:flex-1" : "flex-1"}`}>
                  <div className={`h-1.5 rounded-full ${done || current ? "bg-[#0B2545]" : "bg-slate-200"}`} />
                  <div className={`mt-1.5 flex items-center gap-1.5 text-[11px] font-bold ${current ? "text-[#0B2545]" : done ? "text-emerald-700" : "text-slate-400"}`}>
                    {done ? <Check className="h-3 w-3" /> : <span>{i + 1}</span>}
                    <span className={`truncate ${current ? "" : "hidden sm:inline"}`}>{stepLabels[key]}</span>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">
          {stepKey === "type" && (
            <div className="space-y-4">
              <p className="text-sm font-bold text-slate-800">{a.chooseTypeTitle}</p>
              <div role="radiogroup" aria-label={a.accountType} className="grid gap-3 sm:grid-cols-2">
                {typeCards.map((card) => {
                  const selected = type === card.id;
                  return (
                    <button
                      key={card.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => {
                        setType(card.id);
                        setMessage(null);
                      }}
                      className={`relative cursor-pointer rounded-2xl border p-5 text-left transition ${
                        selected ? "border-[#0B2545] bg-[#0B2545]/[0.04] ring-2 ring-[#0B2545]/20" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {selected && (
                        <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-[#0B2545] text-white">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                      <card.icon className={`h-6 w-6 ${selected ? "text-[#0B2545]" : "text-slate-400"}`} />
                      <p className="mt-3 text-sm font-extrabold text-[#0B2545]">{card.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">{card.desc}</p>
                      <span className={`mt-3 inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${card.badgeStyle}`}>{card.badge}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {stepKey === "details" && detailsStep()}
          {stepKey === "profile" && profileStep()}

          {stepKey === "terms" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                {a.applyingAs}: <b className="text-slate-800">{type === "b2b" ? a.b2bTitle : a.b2cTitle}</b>
              </p>
              <h3 className="text-sm font-bold text-[#0B2545]">{a.termsHeading}</h3>
              <div className="max-h-64 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                {terms ? (
                  <>
                    <p className="font-semibold">{terms.heading}</p>
                    <p className="whitespace-pre-line">{terms.intro}</p>
                    {terms.sections.map((s, i) => (
                      <div key={i}>
                        <p className="font-bold text-slate-800">{s.title}</p>
                        <p className="whitespace-pre-line">{s.body}</p>
                      </div>
                    ))}
                  </>
                ) : termsError ? (
                  <p className="font-semibold text-red-600">
                    {a.termsUnavailable}{" "}
                    <button type="button" onClick={loadTerms} className="cursor-pointer underline">
                      {t.express.retry}
                    </button>
                  </p>
                ) : (
                  <p className="text-slate-500">{t.express.loading}</p>
                )}
              </div>
              <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-800">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => {
                    setAccepted(e.target.checked);
                    setMessage(null);
                  }}
                  className="mt-0.5 h-4 w-4 accent-[#0B2545]"
                />
                <span>{a.acceptTerms}</span>
              </label>
              <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">{type === "b2b" ? a.noteB2b : a.noteB2c}</p>
            </div>
          )}

          {message && (
            <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {message}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-7">
          {stepKey === "type" ? (
            <button type="button" onClick={onClose} className="cursor-pointer rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-200/60">
              {a.cancel}
            </button>
          ) : (
            <button type="button" onClick={back} disabled={submitting} className="cursor-pointer rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">
              {t.express.book.back}
            </button>
          )}

          {stepKey !== "terms" ? (
            <button type="button" onClick={next} className="cursor-pointer rounded-xl bg-[#0B2545] px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#12315c]">
              {t.express.book.next}
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={submitting || !termsData || !accepted}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#D21F27] px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#B91A21] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? a.submitting : type === "b2b" ? a.submitB2b : a.submitB2c}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

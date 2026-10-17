"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { COUNTRIES } from "@/lib/data/countries";
import { AFRICAN_COUNTRY_CODES } from "@/lib/express/africa";
import { formatCad } from "@/lib/shipping/core/money";
import type { TermsContent } from "@/lib/express/terms";
import type { ClientQuoteDTO } from "@/lib/express/quoteDto";
import type { ClientAccountDTO } from "@/lib/express/accountDto";
import type { PartnerCustomerDTO } from "@/lib/express/partnerDto";
import type { CreditSummary } from "@/lib/express/credit";

const AFRICA = COUNTRIES.filter((c) => AFRICAN_COUNTRY_CODES.has(c.code));
const EXPORT_REASONS = ["sale", "gift", "sample", "return", "repair", "personal_effects"] as const;

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]";

interface AddressForm {
  name: string;
  company: string;
  line1: string;
  line2: string;
  city: string;
  region: string;
  postalCode: string;
  countryCode: string;
  phone: string;
  email: string;
}
interface ParcelForm {
  weight: string;
  length: string;
  width: string;
  height: string;
}
interface ItemForm {
  description: string;
  hsCode: string;
  quantity: string;
  unitValue: string;
  country: string;
  netWeight: string;
  reason: (typeof EXPORT_REASONS)[number];
}

const emptyAddress = (countryCode: string): AddressForm => ({
  name: "", company: "", line1: "", line2: "", city: "", region: "", postalCode: "", countryCode, phone: "", email: "",
});
const emptyParcel = (): ParcelForm => ({ weight: "", length: "", width: "", height: "" });
const emptyItem = (): ItemForm => ({ description: "", hsCode: "", quantity: "1", unitValue: "", country: "CA", netWeight: "", reason: "sale" });

const num = (v: string) => (v.trim() === "" ? NaN : Number(v));
const cents = (v: string) => {
  const n = num(v);
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
};
const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const hsOk = (v: string) => /^\d{6,10}$/.test(v.replace(/[\s.\-]/g, ""));
const optional = (v: string) => (v.trim() === "" ? undefined : v.trim());

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-bold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

interface AddressLabels {
  name: string;
  company: string;
  line1: string;
  line2: string;
  city: string;
  region: string;
  postal: string;
  country: string;
  phone: string;
  email: string;
  emailOptional: string;
}

function AddressFields({
  value,
  onChange,
  withCountry,
  emailRequired,
  labels,
  countryLabel,
}: {
  value: AddressForm;
  onChange: (next: AddressForm) => void;
  withCountry: boolean;
  emailRequired: boolean;
  labels: AddressLabels;
  countryLabel: (c: { code: string; name: string; nameFr: string }) => string;
}) {
  const set = (k: keyof AddressForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onChange({ ...value, [k]: e.target.value });
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <Field label={labels.name}>
        <input className={inputClass} value={value.name} onChange={set("name")} maxLength={120} autoComplete="name" />
      </Field>
      <Field label={labels.company}>
        <input className={inputClass} value={value.company} onChange={set("company")} maxLength={120} />
      </Field>
      <Field label={labels.line1}>
        <input className={inputClass} value={value.line1} onChange={set("line1")} maxLength={120} />
      </Field>
      <Field label={labels.line2}>
        <input className={inputClass} value={value.line2} onChange={set("line2")} maxLength={120} />
      </Field>
      <Field label={labels.city}>
        <input className={inputClass} value={value.city} onChange={set("city")} maxLength={80} />
      </Field>
      <Field label={labels.region}>
        <input className={inputClass} value={value.region} onChange={set("region")} maxLength={80} />
      </Field>
      <Field label={labels.postal}>
        <input className={inputClass} value={value.postalCode} onChange={set("postalCode")} maxLength={20} />
      </Field>
      {withCountry ? (
        <Field label={labels.country}>
          <select className={inputClass} value={value.countryCode} onChange={set("countryCode")}>
            {AFRICA.map((c) => (
              <option key={c.code} value={c.code}>
                {countryLabel(c)}
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <Field label={labels.country}>
          <input className={`${inputClass} bg-slate-50`} value="Canada" readOnly />
        </Field>
      )}
      <Field label={labels.phone}>
        <input className={inputClass} value={value.phone} onChange={set("phone")} inputMode="tel" autoComplete="tel" maxLength={25} />
      </Field>
      <Field label={emailRequired ? labels.email : labels.emailOptional}>
        <input className={inputClass} value={value.email} onChange={set("email")} inputMode="email" autoComplete="email" maxLength={160} />
      </Field>
    </div>
  );
}

export default function BookingWizard({ account }: { account: ClientAccountDTO }) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const b = t.express.book;
  const countryLabel = (c: { code: string; name: string; nameFr: string }) => (language === "fr" ? c.nameFr : c.name);
  const addressLabels: AddressLabels = {
    name: b.name, company: b.company, line1: b.line1, line2: b.line2, city: b.city, region: b.region,
    postal: b.postal, country: b.country, phone: b.phone, email: b.email, emailOptional: b.emailOptional,
  };

  const [step, setStep] = useState(1);
  // Documents (paper, no commercial value) or goods. Documents skip the customs items.
  const [contentType, setContentType] = useState<"documents" | "goods">("goods");
  const [docDescription, setDocDescription] = useState("");
  const [docDeclared, setDocDeclared] = useState(false);
  const [docMaxKg, setDocMaxKg] = useState(2);
  const documents = contentType === "documents";
  const [shipper, setShipper] = useState<AddressForm>(emptyAddress("CA"));
  const [recipient, setRecipient] = useState<AddressForm>(emptyAddress("CM"));
  const [parcels, setParcels] = useState<ParcelForm[]>([emptyParcel()]);
  const [items, setItems] = useState<ItemForm[]>([emptyItem()]);
  const [pickup, setPickup] = useState(false);
  const [duties, setDuties] = useState<"recipient" | "sender">("recipient");
  // Partners can book for one of their customers ("" = their own shipment).
  const [customers, setCustomers] = useState<PartnerCustomerDTO[]>([]);
  const [forCustomer, setForCustomer] = useState("");
  // Business accounts with invoice billing can put a booking on their weekly invoice.
  const modes = account.billingModes ?? [];
  const canInvoice = account.type === "b2b" && modes.includes("invoice");
  const canCard = account.type !== "b2b" || modes.includes("pay_at_booking");
  const [payMethod, setPayMethod] = useState<"card" | "invoice">(canCard ? "card" : "invoice");
  const [credit, setCredit] = useState<CreditSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [quote, setQuote] = useState<ClientQuoteDTO | null>(null);
  const [quoteKey, setQuoteKey] = useState("");
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const idempotencyKey = useRef<string>("");

  const [terms, setTerms] = useState<{ version: string; content: TermsContent } | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [serverIssues, setServerIssues] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    fetch("/api/express/status")
      .then((r) => r.json())
      .then((d) => alive && typeof d.documentMaxWeightKg === "number" && setDocMaxKg(d.documentMaxWeightKg))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!canInvoice) return;
    let alive = true;
    fetch("/api/express/credit")
      .then((r) => r.json())
      .then((d) => alive && d.success && setCredit(d.credit))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [canInvoice]);

  useEffect(() => {
    if (!account.partner) return;
    let alive = true;
    fetch("/api/express/partner/customers")
      .then((r) => r.json())
      .then((d) => {
        if (!alive || !d.success) return;
        const active = (d.customers as PartnerCustomerDTO[]).filter((c) => !c.archived);
        setCustomers(active);
        // The customers page links here with ?customer=ID.
        const wanted = new URLSearchParams(window.location.search).get("customer");
        if (wanted && active.some((c) => c.id === wanted)) setForCustomer(wanted);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [account.partner]);

  // Pre-fill the sender from the Express account and the CRM profile.
  useEffect(() => {
    let alive = true;
    api.auth
      .me()
      .then(({ user }) => {
        if (!alive) return;
        setShipper((s) => ({
          ...s,
          name: s.name || account.contactName || user?.name || "",
          phone: s.phone || account.phone || user?.phone || "",
          email: s.email || user?.email || "",
          company: s.company || account.company?.name || "",
        }));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [account]);

  const itemsTotalCents = useMemo(
    () => items.reduce((sum, i) => sum + (Number.isFinite(num(i.quantity)) && Number.isFinite(cents(i.unitValue)) ? num(i.quantity) * cents(i.unitValue) : 0), 0),
    [items]
  );
  const parcelWeight = parcels.reduce((s, p) => s + (Number.isFinite(num(p.weight)) ? num(p.weight) : 0), 0);
  const itemWeight = items.reduce((s, i) => s + (Number.isFinite(num(i.netWeight)) && Number.isFinite(num(i.quantity)) ? num(i.netWeight) * num(i.quantity) : 0), 0);

  // A message about a field goes away as soon as the client edits anything.
  useEffect(() => {
    setError(null);
    setServerIssues([]);
  }, [shipper, recipient, parcels, items, pickup, duties, contentType, docDescription, docDeclared]);

  const inputsKey = JSON.stringify({
    o: [shipper.postalCode, shipper.city],
    d: [recipient.countryCode, recipient.postalCode, recipient.city],
    p: parcels,
    t: contentType,
    v: documents ? 0 : itemsTotalCents,
    u: pickup,
    c: forCustomer,
  });

  const countryName = (code: string) => {
    const c = COUNTRIES.find((x) => x.code === code);
    return c ? countryLabel(c) : code;
  };

  const validateStep = (s: number): string | null => {
    if (s === 1) {
      const need = (a: AddressForm, email: boolean) =>
        [a.name, a.line1, a.city, a.postalCode, a.phone].every((v) => v.trim()) && (!email || emailOk(a.email)) && (!a.email.trim() || emailOk(a.email));
      return need(shipper, true) && need(recipient, false) ? null : b.required;
    }
    if (s === 2) {
      const ok = parcels.every((p) => {
        const w = num(p.weight), l = num(p.length), wd = num(p.width), h = num(p.height);
        return w >= 0.1 && w <= 70 && [l, wd, h].every((d) => d >= 1 && d <= 120);
      });
      if (!ok) return b.required;
      if (documents && parcelWeight > docMaxKg + 0.001) return b.docsTooHeavy.replace("{kg}", String(docMaxKg));
      return null;
    }
    if (s === 3 && documents) {
      if (docDescription.trim().length < 3) return b.required;
      return docDeclared ? null : b.docsDeclarationNeeded;
    }
    if (s === 3) {
      const ok = items.every(
        (i) =>
          i.description.trim() &&
          hsOk(i.hsCode) &&
          Number.isInteger(num(i.quantity)) && num(i.quantity) >= 1 &&
          cents(i.unitValue) >= 1 &&
          i.country &&
          num(i.netWeight) >= 0.01 &&
          i.reason
      );
      if (!ok) return b.required;
      if (itemWeight > parcelWeight + 0.001) return b.itemsHeavy;
      return null;
    }
    return null;
  };

  const goNext = () => {
    const problem = validateStep(step);
    setError(problem);
    if (!problem) setStep(step + 1);
  };

  const fetchQuote = useCallback(async () => {
    setQuoteLoading(true);
    setQuoteError(null);
    setQuote(null);
    try {
      const res = await fetch("/api/express/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: { postalCode: shipper.postalCode.trim(), city: shipper.city.trim() },
          destination: { countryCode: recipient.countryCode, postalCode: recipient.postalCode.trim(), city: recipient.city.trim() },
          parcels: parcels.map((p) => ({ weightKg: num(p.weight), lengthCm: num(p.length), widthCm: num(p.width), heightCm: num(p.height) })),
          contentType,
          declaredValueCents: documents ? 0 : itemsTotalCents,
          isCustomsDeclarable: !documents,
          pickupRequested: pickup,
          ...(forCustomer ? { partnerCustomerId: forCustomer } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.code === "documents_unavailable") throw new Error(b.docsUnavailable);
        if (data.code === "documents_too_heavy") throw new Error(b.docsTooHeavy.replace("{kg}", String(docMaxKg)));
        if (data.code === "account_pending" || data.code?.startsWith("account_")) throw new Error(b.accountBlocked);
        throw new Error(data.error || b.priceError);
      }
      setQuote(data.quote);
      setQuoteKey(inputsKey);
      // A fresh quote is a fresh booking attempt: new idempotency key.
      idempotencyKey.current = crypto.randomUUID();
    } catch (err: any) {
      setQuoteError(err.message || b.priceError);
    } finally {
      setQuoteLoading(false);
    }
  }, [shipper, recipient, parcels, itemsTotalCents, pickup, forCustomer, inputsKey, b, contentType, documents, docMaxKg]);

  const loadTerms = useCallback(async () => {
    try {
      const res = await fetch("/api/express/terms");
      const data = await res.json();
      if (res.ok && data.success) setTerms({ version: data.version, content: data.content });
    } catch {
      /* the confirm button stays disabled until terms load */
    }
  }, []);

  // Entering the review step: load terms and (re)price if anything changed or the price expired.
  useEffect(() => {
    if (step !== 5) return;
    if (!terms) loadTerms();
    const stale = !quote || quoteKey !== inputsKey || new Date(quote.expiresAt!).getTime() <= Date.now();
    if (stale && !quoteLoading && !quoteError) fetchQuote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, inputsKey]);

  const confirm = async () => {
    if (!quote || !terms || !accepted || confirming) return;
    setConfirming(true);
    setError(null);
    setServerIssues([]);
    const addr = (a: AddressForm, withCountry: boolean) => ({
      name: a.name.trim(),
      company: optional(a.company),
      line1: a.line1.trim(),
      line2: optional(a.line2),
      city: a.city.trim(),
      region: optional(a.region),
      postalCode: a.postalCode.trim(),
      phone: a.phone.trim(),
      email: optional(a.email),
      ...(withCountry ? { countryCode: a.countryCode } : {}),
    });
    try {
      const res = await fetch("/api/express/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteId: quote.id,
          idempotencyKey: idempotencyKey.current,
          shipper: addr(shipper, false),
          recipient: addr(recipient, true),
          items: documents
            ? []
            : items.map((i) => ({
                description: i.description.trim(),
                hsCode: i.hsCode,
                quantity: num(i.quantity),
                unitValueCents: cents(i.unitValue),
                countryOfOrigin: i.country,
                netWeightKg: num(i.netWeight),
                exportReason: i.reason,
              })),
          ...(documents ? { contentDescription: docDescription.trim(), documentsDeclaration: true } : {}),
          dutiesPayer: documents ? "recipient" : duties,
          acceptTerms: true,
          termsVersion: terms.version,
          ...(canInvoice ? { paymentMethod: payMethod } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.shipment) {
        // Booking saved. Send the client to the secure payment page; if payment cannot start
        // (not available yet, or a hiccup) the booking page offers "Pay now" to try again.
        if (data.shipment.canPay) {
          try {
            const pay = await fetch(`/api/express/shipments/${data.shipment.id}/checkout`, { method: "POST" });
            const payData = await pay.json().catch(() => ({}));
            if (pay.ok && payData.url) {
              window.location.href = payData.url;
              return;
            }
          } catch {
            /* fall through to the shipment page */
          }
        }
        router.replace(`/express/shipments/${data.shipment.id}?booked=1`);
        return;
      }
      if (data.code === "quote_expired") {
        setError(b.quoteExpired);
        setAccepted(false);
        await fetchQuote();
      } else if (data.code === "terms_changed") {
        setError(b.termsChanged);
        setAccepted(false);
        await loadTerms();
      } else if (data.code === "quote_used") {
        router.replace("/express/shipments");
        return;
      } else if (data.code === "billing_not_available") {
        setError(b.billingBlocked);
      } else if (data.code === "credit_exceeded") {
        setError(t.express.invoices.creditExceeded);
      } else if (data.code === "invoice_overdue") {
        setError(t.express.invoices.invoiceOverdue);
      } else if (data.code === "invoice_not_allowed") {
        setError(t.express.invoices.notAllowed);
      } else if (data.code?.startsWith("account_")) {
        setError(b.accountBlocked);
      } else if (Array.isArray(data.fields)) {
        setError(b.genericError);
        setServerIssues(data.fields.map((f: { message: string }) => f.message));
      } else {
        setError(b.genericError);
      }
    } catch {
      setError(b.genericError);
    } finally {
      setConfirming(false);
    }
  };

  const stepNames = [b.steps.addresses, b.steps.parcels, documents ? b.stepContents : b.steps.customs, b.steps.options, b.steps.review];
  const m = (c: number) => formatCad(c, language);
  const termsText = terms?.content[language];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#0B2545]">{b.title}</h1>
        <p className="mt-1 text-sm text-slate-600">{b.subtitle}</p>
      </div>

      <ol className="flex items-center rounded-2xl border border-slate-200 bg-white p-3 shadow-xs sm:p-4" aria-label="Progress">
        {stepNames.map((name, i) => {
          const n = i + 1;
          const done = n < step;
          const current = n === step;
          return (
            <li key={name} aria-current={current ? "step" : undefined} className={`flex items-center ${i < stepNames.length - 1 ? "flex-1" : ""}`}>
              <span className="flex items-center gap-2.5">
                <span
                  className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-full text-xs font-bold ${
                    current ? "bg-[#0B2545] text-white ring-4 ring-[#0B2545]/10" : done ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {done ? <Check className="h-4 w-4" /> : n}
                </span>
                <span className={`text-xs font-bold ${current ? "inline text-[#0B2545]" : "hidden md:inline"} ${done ? "text-emerald-700" : current ? "" : "text-slate-500"}`}>{name}</span>
              </span>
              {i < stepNames.length - 1 && <span className={`mx-3 h-0.5 flex-1 rounded ${done ? "bg-emerald-400" : "bg-slate-200"}`} aria-hidden="true" />}
            </li>
          );
        })}
      </ol>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-6">
      {step === 1 && (
        <div className="space-y-5">
          <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-3">
            <div>
              <h2 className="font-bold text-[#0B2545]">{b.typeTitle}</h2>
              <p className="text-xs text-slate-500 mt-1">{b.typeHint}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={b.typeTitle}>
              {([
                ["documents", b.typeDocuments, b.typeDocumentsDesc],
                ["goods", b.typeGoods, b.typeGoodsDesc],
              ] as const).map(([value, title, desc]) => (
                <label key={value} className={`flex gap-3 rounded-xl border p-4 cursor-pointer ${contentType === value ? "border-[#0B2545] bg-[#0B2545]/5" : "border-slate-200"}`}>
                  <input type="radio" name="contentType" checked={contentType === value} onChange={() => setContentType(value)} className="mt-1 accent-[#0B2545]" />
                  <span>
                    <span className="block text-sm font-bold text-slate-900">{title}</span>
                    <span className="block text-xs text-slate-600 mt-0.5">{desc}</span>
                  </span>
                </label>
              ))}
            </div>
          </section>
          {account.partner && customers.length > 0 && (
            <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-2">
              <h2 className="font-bold text-[#0B2545]">{t.express.partner.bookingFor}</h2>
              <select className={inputClass} value={forCustomer} onChange={(e) => setForCustomer(e.target.value)} aria-label={t.express.partner.bookingFor}>
                <option value="">{t.express.partner.bookingForMe}</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.company ? ` · ${c.company}` : ""} ({c.effectiveMarkupPct}%)
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">{t.express.partner.bookingForHelp}</p>
            </section>
          )}
          <div className="grid items-start gap-5 xl:grid-cols-2">
          <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
            <h2 className="font-bold text-[#0B2545]">{b.sender}</h2>
            <AddressFields value={shipper} onChange={setShipper} withCountry={false} emailRequired labels={addressLabels} countryLabel={countryLabel} />
          </section>
          <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
            <h2 className="font-bold text-[#0B2545]">{b.recipient}</h2>
            <AddressFields value={recipient} onChange={setRecipient} withCountry emailRequired={false} labels={addressLabels} countryLabel={countryLabel} />
          </section>
          </div>
        </div>
      )}

      {step === 2 && (
        <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
          <div>
            <h2 className="font-bold text-[#0B2545]">{b.parcelsTitle}</h2>
            <p className="text-xs text-slate-500 mt-1">{b.parcelsHint}</p>
            {documents && <p className="text-xs font-semibold text-slate-700 mt-1">{b.docsLimit.replace("{kg}", String(docMaxKg))}</p>}
          </div>
          {parcels.map((p, i) => (
            <div key={i} className="rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  {b.parcelN} {i + 1}
                </span>
                {parcels.length > 1 && (
                  <button type="button" onClick={() => setParcels(parcels.filter((_, j) => j !== i))} className="inline-flex items-center gap-1 text-xs font-bold text-red-600 cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                    {b.remove}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(["weight", "length", "width", "height"] as const).map((k) => (
                  <Field key={k} label={b[k]}>
                    <input
                      className={inputClass}
                      inputMode="decimal"
                      value={p[k]}
                      onChange={(e) => setParcels(parcels.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)))}
                    />
                  </Field>
                ))}
              </div>
            </div>
          ))}
          {parcels.length < 10 && (
            <button type="button" onClick={() => setParcels([...parcels, emptyParcel()])} className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0B2545] cursor-pointer">
              <Plus className="w-3.5 h-3.5" />
              {b.addParcel}
            </button>
          )}
        </section>
      )}

      {step === 3 && documents && (
        <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
          <div>
            <h2 className="font-bold text-[#0B2545]">{b.docsTitle}</h2>
            <p className="text-xs text-slate-500 mt-1">{b.docsHint}</p>
          </div>
          <Field label={b.docsDescription}>
            <input className={inputClass} value={docDescription} onChange={(e) => setDocDescription(e.target.value)} placeholder={b.docsExample} maxLength={70} />
          </Field>
          <label className="flex items-start gap-2.5 text-sm text-slate-800 cursor-pointer">
            <input type="checkbox" checked={docDeclared} onChange={(e) => setDocDeclared(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#0B2545]" />
            <span>{b.docsDeclaration}</span>
          </label>
        </section>
      )}

      {step === 3 && !documents && (
        <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
          <div>
            <h2 className="font-bold text-[#0B2545]">{b.customsTitle}</h2>
            <p className="text-xs text-slate-500 mt-1">{b.customsHint}</p>
          </div>
          {items.map((it, i) => {
            const set = (k: keyof ItemForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
              setItems(items.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)));
            return (
              <div key={i} className="rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    {b.itemN} {i + 1}
                  </span>
                  {items.length > 1 && (
                    <button type="button" onClick={() => setItems(items.filter((_, j) => j !== i))} className="inline-flex items-center gap-1 text-xs font-bold text-red-600 cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" />
                      {b.remove}
                    </button>
                  )}
                </div>
                <Field label={b.itemDescription}>
                  <input className={inputClass} value={it.description} onChange={set("description")} maxLength={100} />
                </Field>
                <div className="grid sm:grid-cols-3 gap-3">
                  <Field label={b.hsCode}>
                    <input className={inputClass} value={it.hsCode} onChange={set("hsCode")} placeholder={b.hsHelp} maxLength={14} />
                  </Field>
                  <Field label={b.quantity}>
                    <input className={inputClass} value={it.quantity} onChange={set("quantity")} inputMode="numeric" />
                  </Field>
                  <Field label={b.unitValue}>
                    <input className={inputClass} value={it.unitValue} onChange={set("unitValue")} inputMode="decimal" />
                  </Field>
                  <Field label={b.origin}>
                    <select className={inputClass} value={it.country} onChange={set("country")}>
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {countryLabel(c)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={b.netWeight}>
                    <input className={inputClass} value={it.netWeight} onChange={set("netWeight")} inputMode="decimal" />
                  </Field>
                  <Field label={b.reason}>
                    <select className={inputClass} value={it.reason} onChange={set("reason")}>
                      {EXPORT_REASONS.map((r) => (
                        <option key={r} value={r}>
                          {b.reasons[r]}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>
            );
          })}
          {items.length < 20 && (
            <button type="button" onClick={() => setItems([...items, emptyItem()])} className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0B2545] cursor-pointer">
              <Plus className="w-3.5 h-3.5" />
              {b.addItem}
            </button>
          )}
          <p className="text-sm font-semibold text-slate-800">
            {b.declaredTotal}: {m(itemsTotalCents)}
          </p>
        </section>
      )}

      {step === 4 && (
        <div className="grid items-start gap-5 xl:grid-cols-2">
          <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-3">
            <h2 className="font-bold text-[#0B2545]">{b.pickupTitle}</h2>
            {[
              { v: true, title: b.pickupDhl, desc: b.pickupDhlDesc },
              { v: false, title: b.pickupDrop, desc: b.pickupDropDesc },
            ].map((o) => (
              <label key={String(o.v)} className={`flex gap-3 rounded-xl border p-4 cursor-pointer ${pickup === o.v ? "border-[#0B2545] bg-[#0B2545]/5" : "border-slate-200"}`}>
                <input type="radio" name="pickup" checked={pickup === o.v} onChange={() => setPickup(o.v)} className="mt-1 accent-[#0B2545]" />
                <span>
                  <span className="block text-sm font-bold text-slate-900">{o.title}</span>
                  <span className="block text-xs text-slate-600 mt-0.5">{o.desc}</span>
                </span>
              </label>
            ))}
          </section>
          {documents ? (
            <p className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600">{b.docsNoDuties}</p>
          ) : (
          <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-3">
            <h2 className="font-bold text-[#0B2545]">{b.dutiesTitle}</h2>
            {[
              { v: "recipient" as const, title: b.dutiesRecipient, desc: b.dutiesRecipientDesc },
              { v: "sender" as const, title: b.dutiesSender, desc: b.dutiesSenderDesc },
            ].map((o) => (
              <label key={o.v} className={`flex gap-3 rounded-xl border p-4 cursor-pointer ${duties === o.v ? "border-[#0B2545] bg-[#0B2545]/5" : "border-slate-200"}`}>
                <input type="radio" name="duties" checked={duties === o.v} onChange={() => setDuties(o.v)} className="mt-1 accent-[#0B2545]" />
                <span>
                  <span className="block text-sm font-bold text-slate-900">{o.title}</span>
                  <span className="block text-xs text-slate-600 mt-0.5">{o.desc}</span>
                </span>
              </label>
            ))}
          </section>
          )}
        </div>
      )}

      {step === 5 && (
        <div className="space-y-5">
          <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-3">
            <h2 className="font-bold text-[#0B2545]">{b.summary}</h2>
            <dl className="text-sm divide-y divide-slate-100">
              {[
                [b.route, `${shipper.city}, Canada → ${recipient.city}, ${countryName(recipient.countryCode)}`],
                [b.typeTitle, documents ? `${b.typeDocuments} · ${docDescription.trim()}` : b.typeGoods],
                [b.parcelsTitle, `${parcels.length} · ${parcelWeight.toFixed(1)} kg`],
                ...(documents ? [] : [[b.declaredTotal, m(itemsTotalCents)]]),
                [b.pickupLabel, pickup ? b.pickupYes : b.pickupNo],
                ...(documents ? [] : [[b.dutiesLabel, duties === "recipient" ? b.dutiesRecipientShort : b.dutiesSenderShort]]),
              ].map(([k, v]) => (
                <div key={k} className="py-2 grid sm:grid-cols-3 gap-1">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="sm:col-span-2 font-semibold text-slate-800">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-3">
            <h2 className="font-bold text-[#0B2545]">{b.reviewTitle}</h2>
            {quoteLoading ? (
              <p className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                {b.gettingPrice}
              </p>
            ) : quoteError ? (
              <div className="space-y-2">
                <p role="alert" className="text-sm font-semibold text-red-600">
                  {quoteError}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setQuoteError(null);
                    fetchQuote();
                  }}
                  className="px-4 py-2 rounded-xl bg-[#0B2545] text-white text-xs font-bold cursor-pointer"
                >
                  {b.retry}
                </button>
              </div>
            ) : quote ? (
              <div className="space-y-3 text-sm">
                <div className="text-xs text-slate-500">
                  {b.service}: <b className="text-slate-800">{quote.service.name}</b>
                  {quote.service.estimatedDelivery && (
                    <>
                      {" · "}
                      {b.delivery}: <b className="text-slate-800">{new Intl.DateTimeFormat(language === "fr" ? "fr-CA" : "en-CA", { dateStyle: "medium" }).format(new Date(quote.service.estimatedDelivery))}</b>
                    </>
                  )}
                </div>
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-slate-600">{b.publicPrice}</span>
                    <span className="font-semibold tabular-nums">{m(quote.price.publicBaseFreightCents)}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5 text-emerald-700">
                    <span>
                      {b.yourDiscount} ({quote.price.discountPct}%)
                    </span>
                    <span className="font-semibold tabular-nums">−{m(quote.price.discountCents)}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-slate-600">{b.baseAfterDiscount}</span>
                    <span className="font-semibold tabular-nums">{m(quote.price.baseFreightCents)}</span>
                  </div>
                  {quote.price.surcharges.map((s) => (
                    <div key={s.code} className="flex justify-between px-4 py-2.5">
                      <span className="text-slate-600">{s.name}</span>
                      <span className="font-semibold tabular-nums">{m(s.amountCents)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between px-4 py-3 bg-slate-50 font-extrabold text-[#0B2545]">
                    <span>{b.total}</span>
                    <span className="tabular-nums">{m(quote.price.totalCents)}</span>
                  </div>
                </div>
                {quote.partner && (
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                    <div className="flex justify-between px-4 py-2.5">
                      <span className="text-slate-600">{t.express.partner.youPay}</span>
                      <span className="font-semibold tabular-nums">{m(quote.price.totalCents)}</span>
                    </div>
                    <div className="flex justify-between px-4 py-2.5 text-emerald-700">
                      <span>
                        {t.express.partner.yourMarkup} ({quote.partner.markupPct}%)
                      </span>
                      <span className="font-semibold tabular-nums">+{m(quote.partner.markupCents)}</span>
                    </div>
                    <div className="flex justify-between px-4 py-3 bg-slate-50 font-extrabold text-[#0B2545]">
                      <span>
                        {t.express.partner.customerPrice} · {quote.partner.customerName}
                      </span>
                      <span className="tabular-nums">{m(quote.partner.customerTotalCents)}</span>
                    </div>
                  </div>
                )}
                <p className="text-xs text-slate-500">{b.surchargesNote}</p>
                <p className="text-xs text-slate-500">
                  {b.validUntil}: {new Intl.DateTimeFormat(language === "fr" ? "fr-CA" : "en-CA", { timeStyle: "short" }).format(new Date(quote.expiresAt!))}
                </p>
              </div>
            ) : null}
          </section>

          {canInvoice && (
            <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-3">
              <h2 className="font-bold text-[#0B2545]">{t.express.invoices.payTitle}</h2>
              {canCard ? (
                <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={t.express.invoices.payTitle}>
                  {([
                    ["card", t.express.invoices.payCard, t.express.invoices.payCardHelp],
                    ["invoice", t.express.invoices.payInvoice, t.express.invoices.payInvoiceHelp],
                  ] as const).map(([value, label, help]) => (
                    <label key={value} className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3.5 text-sm ${payMethod === value ? "border-[#0B2545] bg-slate-50" : "border-slate-200"}`}>
                      <input type="radio" name="payMethod" className="mt-0.5 accent-[#0B2545]" checked={payMethod === value} onChange={() => setPayMethod(value)} />
                      <span>
                        <b className="block text-slate-800">{label}</b>
                        <span className="text-xs text-slate-500">{help}</span>
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-700">{t.express.invoices.invoiceOnly}</p>
              )}
              {payMethod === "invoice" && credit && credit.limitCents != null && (
                <p className="text-xs text-slate-600">
                  {t.express.invoices.creditLeft}: <b className="text-slate-800">{m(credit.availableCents)}</b> / {m(credit.limitCents)}
                  {credit.overdueCount > 0 && <span className="ml-2 font-bold text-red-600">{t.express.invoices.invoiceOverdue}</span>}
                </p>
              )}
            </section>
          )}

          <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-3">
            <h2 className="font-bold text-[#0B2545]">{b.termsHeading}</h2>
            <div className="max-h-56 overflow-y-auto rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3 text-sm text-slate-700 leading-relaxed">
              {termsText ? (
                <>
                  <p className="font-semibold">{termsText.heading}</p>
                  <p className="whitespace-pre-line">{termsText.intro}</p>
                  {termsText.sections.map((s, i) => (
                    <div key={i}>
                      <p className="font-bold text-slate-800">{s.title}</p>
                      <p className="whitespace-pre-line">{s.body}</p>
                    </div>
                  ))}
                </>
              ) : (
                <p className="text-slate-500">{b.termsLoading}</p>
              )}
            </div>
            <label className="flex items-start gap-2.5 text-sm text-slate-800 cursor-pointer">
              <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#0B2545]" />
              <span>{b.acceptTerms}</span>
            </label>
            {!(canInvoice && payMethod === "invoice") && <p className="text-xs text-slate-500">{b.paymentNote}</p>}
          </section>
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-semibold space-y-1">
          <p>{error}</p>
          {serverIssues.length > 0 && (
            <ul className="list-disc pl-5 font-normal">
              {serverIssues.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            setError(null);
            setStep(step - 1);
          }}
          disabled={step === 1 || confirming}
          className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-700 disabled:opacity-40 cursor-pointer"
        >
          {b.back}
        </button>
        {step < 5 ? (
          <button type="button" onClick={goNext} className="px-6 py-2.5 rounded-xl bg-[#0B2545] hover:bg-slate-800 text-white text-sm font-bold cursor-pointer">
            {b.next}
          </button>
        ) : (
          <button
            type="button"
            onClick={confirm}
            disabled={!quote || !terms || !accepted || confirming || quoteLoading}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#D21F27] hover:bg-[#b91a21] disabled:opacity-50 text-white text-sm font-bold cursor-pointer"
          >
            {confirming && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirming ? b.confirming : canInvoice && payMethod === "invoice" ? t.express.invoices.confirmInvoice : b.confirm}
          </button>
        )}
      </div>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <h2 className="text-sm font-bold text-[#0B2545]">{b.summary}</h2>
          <dl className="mt-3 divide-y divide-slate-100 text-sm">
            {[
              [b.route, `${shipper.city || "–"} → ${recipient.city ? `${recipient.city}, ${countryName(recipient.countryCode)}` : "–"}`],
              [b.typeTitle, documents ? b.typeDocuments : b.typeGoods],
              [b.parcelsTitle, `${parcels.length} · ${parcelWeight.toFixed(1)} kg`],
              [b.pickupLabel, pickup ? b.pickupYes : b.pickupNo],
            ].map(([k, v]) => (
              <div key={k} className="flex items-start justify-between gap-3 py-2.5">
                <dt className="text-slate-500">{k}</dt>
                <dd className="text-right font-semibold text-slate-800">{v}</dd>
              </div>
            ))}
          </dl>
          {quote && (
            <div className="mt-3 flex items-center justify-between rounded-xl bg-[#0B2545] px-4 py-3 text-white">
              <span className="text-xs font-semibold">{b.total}</span>
              <span className="text-lg font-extrabold tabular-nums">{m(quote.price.totalCents)}</span>
            </div>
          )}
        </section>
      </aside>
      </div>
    </div>
  );
}

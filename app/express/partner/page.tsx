"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, Copy, Loader2, PackagePlus, Plus, RefreshCw } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useExpressAccount } from "@/components/express/useExpressAccount";
import { formatCad } from "@/lib/shipping/core/money";
import type { CustomerStats, PartnerCustomerDTO } from "@/lib/express/partnerDto";

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]";

interface Summary {
  allTime: CustomerStats;
  thisMonth: CustomerStats;
  customers: number;
}

interface FormState {
  id: string | null;
  name: string;
  email: string;
  phone: string;
  company: string;
  notes: string;
  markup: string;
  createLogin: boolean;
}

const emptyForm = (): FormState => ({ id: null, name: "", email: "", phone: "", company: "", notes: "", markup: "", createLogin: false });

function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-bold text-slate-700">{text}</span>
      {children}
    </label>
  );
}

export default function ExpressPartnerPage() {
  const { t, language } = useLanguage();
  const p = t.express.partner;
  const { account, loading: accountLoading } = useExpressAccount();
  const [customers, setCustomers] = useState<PartnerCustomerDTO[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [defaultMarkup, setDefaultMarkup] = useState(0);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [form, setForm] = useState<FormState | null>(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [actionError, setActionError] = useState("");
  const [credentials, setCredentials] = useState<{ name: string; email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const isPartner = Boolean(account?.partner);
  const m = (c: number) => formatCad(c, language);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/express/partner/customers");
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) return setState("error");
      setCustomers(data.customers);
      setSummary(data.summary);
      setDefaultMarkup(data.defaultMarkupPct);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    if (isPartner) load();
  }, [isPartner, load]);

  if (accountLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500">
        <RefreshCw className="w-4 h-4 animate-spin" />
        {t.express.loading}
      </div>
    );
  }
  if (!isPartner) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <h1 className="text-lg font-bold text-[#0B2545]">{p.notPartnerTitle}</h1>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">{p.notPartnerBody}</p>
      </div>
    );
  }

  const startEdit = (c: PartnerCustomerDTO) => {
    setFormError("");
    setForm({ id: c.id, name: c.name, email: c.email, phone: c.phone, company: c.company, notes: c.notes, markup: c.markupPct == null ? "" : String(c.markupPct), createLogin: false });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || saving) return;
    setFormError("");
    const markup = form.markup.trim() === "" ? null : Number(form.markup);
    if (markup !== null && (!Number.isFinite(markup) || markup < 0 || markup > 99.99)) return setFormError(p.markupInvalid);
    if (!form.name.trim() || (!form.id && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))) return setFormError(p.customerRequired);

    setSaving(true);
    try {
      const res = await fetch(form.id ? `/api/express/partner/customers/${form.id}` : "/api/express/partner/customers", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          form.id
            ? { name: form.name.trim(), phone: form.phone.trim(), company: form.company.trim(), notes: form.notes.trim(), markupPct: markup }
            : { name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), company: form.company.trim(), notes: form.notes.trim(), markupPct: markup, createLogin: form.createLogin }
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setFormError(data.code === "duplicate" ? p.duplicate : data.fields?.[0]?.message || data.error || p.actionError);
      if (data.credentials) setCredentials({ name: form.name.trim(), ...data.credentials });
      else if (data.loginError) setFormError(data.loginError.message);
      if (!data.loginError) setForm(null);
      await load();
    } catch {
      setFormError(p.actionError);
    } finally {
      setSaving(false);
    }
  };

  const createOrReset = async (c: PartnerCustomerDTO) => {
    if (c.hasLogin && !window.confirm(p.resetConfirm)) return;
    setBusyId(c.id);
    setActionError("");
    try {
      const res = await fetch(`/api/express/partner/customers/${c.id}/login`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setActionError(data.error || p.actionError);
      else setCredentials({ name: c.name, ...data.credentials });
      await load();
    } catch {
      setActionError(p.actionError);
    } finally {
      setBusyId("");
    }
  };

  const setArchived = async (c: PartnerCustomerDTO, archived: boolean) => {
    setBusyId(c.id);
    setActionError("");
    try {
      const res = await fetch(`/api/express/partner/customers/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ archived }) });
      if (!res.ok) setActionError(p.actionError);
      await load();
    } catch {
      setActionError(p.actionError);
    } finally {
      setBusyId("");
    }
  };

  const copy = async () => {
    if (!credentials) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/login\n${credentials.email}\n${credentials.password}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* the details are on screen to copy by hand */
    }
  };

  const stat = (label: string, value: string, note?: string) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-extrabold text-[#0B2545] tabular-nums">{value}</p>
      {note && <p className="mt-0.5 text-[11px] text-slate-500">{note}</p>}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0B2545]">{p.title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">{p.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setFormError("");
            setForm(emptyForm());
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0B2545] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#12315c] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          {p.add}
        </button>
      </div>

      {credentials && (
        <section role="status" className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <h2 className="font-bold text-emerald-900">
            {p.credentialsTitle} · {credentials.name}
          </h2>
          <p className="text-sm text-emerald-900">{p.credentialsBody}</p>
          <dl className="grid gap-2 rounded-xl border border-emerald-200 bg-white p-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-slate-500">{p.signInAt}</dt>
              <dd className="font-mono font-bold break-all">{typeof window !== "undefined" ? `${window.location.origin}/login` : "/login"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">{p.email}</dt>
              <dd className="font-mono font-bold break-all">{credentials.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">{p.password}</dt>
              <dd className="font-mono font-bold break-all select-all">{credentials.password}</dd>
            </div>
          </dl>
          <div className="flex gap-2">
            <button type="button" onClick={copy} className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-3.5 py-2 text-xs font-bold text-emerald-900 cursor-pointer">
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? p.copied : p.copy}
            </button>
            <button type="button" onClick={() => setCredentials(null)} className="rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white cursor-pointer">
              {p.done}
            </button>
          </div>
        </section>
      )}

      {summary && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stat(p.activeCustomers, String(summary.customers))}
          {stat(`${p.earned} · ${p.thisMonth}`, m(summary.thisMonth.markupCents), `${summary.thisMonth.shipments} ${p.shipments.toLowerCase()}`)}
          {stat(`${p.earned} · ${p.allTime}`, m(summary.allTime.markupCents), `${summary.allTime.shipments} ${p.shipments.toLowerCase()}`)}
          {stat(p.defaultMarkup, `${defaultMarkup}%`, p.defaultMarkupNote)}
        </div>
      )}
      {summary && <p className="text-xs text-slate-500">{p.earnedNote}</p>}

      {form && (
        <form onSubmit={submit} noValidate className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold text-[#0B2545]">{form.id ? p.edit : p.add}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Label text={p.name}>
              <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={120} />
            </Label>
            <Label text={p.email}>
              <input className={inputClass} type="email" value={form.email} disabled={Boolean(form.id)} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={160} />
            </Label>
            <Label text={p.phone}>
              <input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={40} />
            </Label>
            <Label text={p.company}>
              <input className={inputClass} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} maxLength={160} />
            </Label>
            <Label text={p.markup}>
              <input className={inputClass} inputMode="decimal" value={form.markup} onChange={(e) => setForm({ ...form, markup: e.target.value })} placeholder={`${p.markupDefault} (${defaultMarkup}%)`} />
              <span className="block text-[11px] text-slate-500">{p.markupHelp}</span>
            </Label>
            <Label text={p.notes}>
              <input className={inputClass} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={500} />
            </Label>
          </div>
          {!form.id && (
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-0.5 accent-[#0B2545]" checked={form.createLogin} onChange={(e) => setForm({ ...form, createLogin: e.target.checked })} />
              <span>
                <b className="text-slate-800">{p.createLogin}</b>
                <span className="block text-xs text-slate-500">{p.createLoginHelp}</span>
              </span>
            </label>
          )}
          {formError && (
            <p role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {formError}
            </p>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#D21F27] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#b91a21] disabled:opacity-60 cursor-pointer">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? p.saving : p.save}
            </button>
            <button type="button" onClick={() => setForm(null)} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 cursor-pointer">
              {p.cancel}
            </button>
          </div>
        </form>
      )}

      {actionError && (
        <p role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          <AlertTriangle className="w-4 h-4" />
          {actionError}
        </p>
      )}

      {state === "loading" && (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
          <RefreshCw className="w-4 h-4 animate-spin" />
          {t.express.loading}
        </div>
      )}
      {state === "error" && <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">{p.loadError}</div>}
      {state === "ready" && customers.length === 0 && <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">{p.empty}</div>}

      {state === "ready" && customers.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-bold">{p.colCustomer}</th>
                <th className="px-4 py-3 font-bold">{p.colMarkup}</th>
                <th className="px-4 py-3 text-right font-bold">{p.colShipments}</th>
                <th className="px-4 py-3 text-right font-bold">{p.colEarned}</th>
                <th className="px-4 py-3 font-bold">{p.colLogin}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((c) => (
                <tr key={c.id} className={c.archived ? "bg-slate-50 text-slate-500" : ""}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">
                      {c.name}
                      {c.archived && <span className="ml-2 rounded-full border border-slate-300 px-2 py-0.5 text-[10px] font-bold text-slate-600">{p.archived}</span>}
                    </p>
                    <p className="text-xs text-slate-500">
                      {c.email}
                      {c.company ? ` · ${c.company}` : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {c.effectiveMarkupPct}%{c.markupPct == null && <span className="ml-1 text-[11px] text-slate-400">({p.markupDefault})</span>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{c.stats.shipments}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{m(c.stats.markupCents)}</td>
                  <td className="px-4 py-3 text-xs">{c.hasLogin ? <span className="font-bold text-emerald-700">{p.hasLogin}</span> : <span className="text-slate-500">{p.noLogin}</span>}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {!c.archived && (
                        <Link href={`/express/book?customer=${c.id}`} className="inline-flex items-center gap-1 rounded-lg bg-[#0B2545] px-2.5 py-1.5 text-xs font-bold text-white hover:bg-[#12315c]">
                          <PackagePlus className="w-3.5 h-3.5" />
                          {p.bookFor}
                        </Link>
                      )}
                      <button type="button" onClick={() => startEdit(c)} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                        {p.edit}
                      </button>
                      {!c.archived && (
                        <button type="button" disabled={busyId === c.id} onClick={() => createOrReset(c)} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-60 cursor-pointer">
                          {c.hasLogin ? p.resetLoginBtn : p.createLoginBtn}
                        </button>
                      )}
                      <button type="button" disabled={busyId === c.id} onClick={() => setArchived(c, !c.archived)} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-60 cursor-pointer">
                        {c.archived ? p.restore : p.archive}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

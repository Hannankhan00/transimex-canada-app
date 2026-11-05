"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2, Lock, RefreshCw } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useExpressAccount } from "@/components/express/useExpressAccount";
import { formatCad } from "@/lib/shipping/core/money";

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]";

interface Earnings {
  collection: "stripe" | "transimex";
  cryptoReady: boolean;
  rules: { holdDays: number; minPayoutCents: number; coolingHours: number };
  summary: { balanceCents: number; availableCents: number; pendingCents: number; reservedCents: number; withdrawableCents: number; paidOutCents: number };
  payoutDetails: { method: "etransfer" | "bank"; masked: string; updatedAt: string } | null;
  openRequestId: string | null;
  weeks: { weekStart: string; earnedCents: number; reversedCents: number; paidOutCents: number; netCents: number; entries: number }[];
  entries: { id: string; type: "earning" | "reversal" | "payout" | "adjustment"; amountCents: number; createdAt: string; availableAt: string; reference: string; note: string; fee: { feeCents: number; estimated: boolean; markupCents: number } | null }[];
  payouts: { id: string; amountCents: number; status: "requested" | "paid" | "rejected" | "cancelled"; destination: string; requestedAt: string; resolvedAt: string | null; reference: string; rejectedReason: string }[];
}

type Form = { method: "etransfer" | "bank"; email: string; accountHolder: string; institution: string; transit: string; accountNumber: string };
const emptyForm: Form = { method: "etransfer", email: "", accountHolder: "", institution: "", transit: "", accountNumber: "" };

export default function ExpressPartnerEarningsPage() {
  const { language } = useLanguage();
  const tr = (en: string, fr: string) => (language === "fr" ? fr : en);
  const { account, loading: accountLoading } = useExpressAccount();
  const [data, setData] = useState<Earnings | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [form, setForm] = useState<Form | null>(null);
  const [formError, setFormError] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState("");
  // The clock is read when the earnings load (an impure call must not run while rendering).
  const [now, setNow] = useState(() => Date.now());
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const m = (c: number) => formatCad(c, language);
  const dateText = (iso: string | null) => (iso ? new Intl.DateTimeFormat(language === "fr" ? "fr-CA" : "en-CA", { dateStyle: "medium" }).format(new Date(iso)) : "—");
  const isPartner = Boolean(account?.partner);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/express/partner/earnings");
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "error");
      setData(body);
      setNow(Date.now());
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    if (isPartner) load();
  }, [isPartner, load]);

  const flash = (text: string, error = false) => {
    setMessage({ text, error });
    setTimeout(() => setMessage(null), 6000);
  };

  const saveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || busy) return;
    setBusy("details");
    setFormError("");
    try {
      const payload = form.method === "etransfer" ? { method: "etransfer", email: form.email } : { method: "bank", accountHolder: form.accountHolder, institution: form.institution, transit: form.transit, accountNumber: form.accountNumber };
      const res = await fetch("/api/express/partner/payout-details", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.fields?.[0]?.message || body.error || tr("Could not save.", "Impossible d'enregistrer."));
      setForm(null);
      flash(tr("Payout details saved. For your security, payouts are paused for 24 hours.", "Coordonnées enregistrées. Pour votre sécurité, les versements sont suspendus pendant 24 heures."));
      await load();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setBusy("");
    }
  };

  const request = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return flash(tr("Enter an amount above zero.", "Entrez un montant supérieur à zéro."), true);
    setBusy("request");
    try {
      const res = await fetch("/api/express/partner/payouts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: value }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.fields?.[0]?.message || body.error || tr("Could not send the request.", "Impossible d'envoyer la demande."));
      setAmount("");
      flash(tr("Payout requested. We will confirm here and by email once it is sent.", "Versement demandé. Nous le confirmerons ici et par courriel dès qu'il sera envoyé."));
      await load();
    } catch (err: any) {
      flash(err.message, true);
    } finally {
      setBusy("");
    }
  };

  const cancel = async (id: string) => {
    if (busy) return;
    setBusy("cancel");
    try {
      const res = await fetch(`/api/express/partner/payouts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      flash(tr("Request cancelled.", "Demande annulée."));
      await load();
    } catch {
      flash(tr("Could not cancel the request.", "Impossible d'annuler la demande."), true);
    } finally {
      setBusy("");
    }
  };

  if (accountLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500">
        <RefreshCw className="h-4 w-4 animate-spin" />
      </div>
    );
  }
  if (!isPartner) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <Lock className="mx-auto h-6 w-6 text-slate-400" />
        <p className="mx-auto mt-3 max-w-sm text-sm text-slate-600">{tr("The earnings page is for approved Express partners.", "La page des revenus est réservée aux partenaires Express approuvés.")}</p>
        <Link href="/express" className="mt-4 inline-block rounded-xl bg-[#0B2545] px-5 py-2.5 text-sm font-bold text-white">
          {tr("Back to overview", "Retour à l'aperçu")}
        </Link>
      </div>
    );
  }
  if (state === "loading") {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500">
        <RefreshCw className="h-4 w-4 animate-spin" />
      </div>
    );
  }
  if (state === "error" || !data) {
    return (
      <p role="alert" className="py-16 text-center text-sm font-semibold text-red-600">
        {tr("We could not load your earnings.", "Nous n'avons pas pu charger vos revenus.")}{" "}
        <button type="button" onClick={load} className="cursor-pointer underline">
          {tr("Try again", "Réessayer")}
        </button>
      </p>
    );
  }

  const { summary, rules } = data;
  const openRequest = data.payouts.find((p) => p.status === "requested");
  const coolingUntil = data.payoutDetails ? new Date(new Date(data.payoutDetails.updatedAt).getTime() + rules.coolingHours * 3_600_000) : null;
  const cooling = Boolean(coolingUntil && coolingUntil.getTime() > now);
  const canRequest = Boolean(data.payoutDetails) && !cooling && !openRequest && summary.withdrawableCents >= rules.minPayoutCents;
  const typeLabel = { earning: tr("Earning", "Revenu"), reversal: tr("Refund taken back", "Remboursement repris"), payout: tr("Payout", "Versement"), adjustment: tr("Adjustment", "Ajustement") };
  const statusLabel = { requested: tr("Waiting", "En attente"), paid: tr("Paid", "Versé"), rejected: tr("Not sent", "Non envoyé"), cancelled: tr("Cancelled", "Annulé") };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-[#0B2545]">{tr("My earnings", "Mes revenus")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          {tr(
            "What Transimex owes you from the bookings your customers paid to Transimex. Your earning on each booking is your markup minus Stripe's card fee.",
            "Ce que Transimex vous doit pour les réservations que vos clients ont payées à Transimex. Votre revenu sur chaque réservation est votre majoration moins les frais de carte de Stripe."
          )}
        </p>
      </div>

      {data.collection === "stripe" && (
        <p className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          {tr("Your customers currently pay on your own Stripe account, so new bookings do not add to this balance. ", "Vos clients paient actuellement sur votre propre compte Stripe, alors les nouvelles réservations n'ajoutent rien à ce solde. ")}
          <Link href="/express/partner" className="font-bold underline">
            {tr("Change how they pay", "Changer la façon de payer")}
          </Link>
        </p>
      )}

      {message && (
        <p role="status" className={`rounded-xl border px-4 py-3 text-sm font-semibold ${message.error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          {message.text}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(
          [
            [tr("You can withdraw", "Vous pouvez retirer"), m(summary.withdrawableCents), "text-emerald-700"],
            [tr(`In the ${rules.holdDays}-day waiting period`, `Dans la période d'attente de ${rules.holdDays} jours`), m(Math.max(0, summary.pendingCents)), "text-slate-700"],
            [tr("Asked for, not yet sent", "Demandé, pas encore envoyé"), m(summary.reservedCents), "text-slate-700"],
            [tr("Paid to you so far", "Versé jusqu'à maintenant"), m(summary.paidOutCents), "text-[#0B2545]"],
          ] as [string, string, string][]
        ).map(([label, value, tone]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
            <p className={`mt-1 text-2xl font-extrabold tabular-nums ${tone}`}>{value}</p>
          </div>
        ))}
      </div>
      {summary.balanceCents < 0 && (
        <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          {tr("Your balance is below zero: refunds or card fees on small markups used more than you earned. It is made up from your next earnings.", "Votre solde est sous zéro : des remboursements ou des frais de carte sur de petites majorations ont dépassé vos revenus. Il sera comblé par vos prochains revenus.")}
        </p>
      )}

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-bold text-[#0B2545]">{tr("Get paid", "Se faire payer")}</h2>

        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-700">{tr("Where we send your payout", "Où nous envoyons votre versement")}</p>
          {data.payoutDetails ? (
            <p className="text-sm text-slate-800">
              {data.payoutDetails.masked} <span className="text-xs text-slate-500">· {tr("saved", "enregistré")} {dateText(data.payoutDetails.updatedAt)}</span>
            </p>
          ) : (
            <p className="text-sm text-slate-500">{tr("Not set yet.", "Pas encore défini.")}</p>
          )}
          {!form && (
            <button type="button" onClick={() => { setForm({ ...emptyForm }); setFormError(""); }} className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
              {data.payoutDetails ? tr("Change", "Modifier") : tr("Add payout details", "Ajouter les coordonnées")}
            </button>
          )}
          {!data.cryptoReady && <p className="text-xs font-semibold text-amber-700">{tr("Saving payout details is not available yet. Please contact us.", "L'enregistrement des coordonnées n'est pas encore disponible. Veuillez nous contacter.")}</p>}
        </div>

        {form && (
          <form onSubmit={saveDetails} noValidate className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap gap-2">
              {(["etransfer", "bank"] as const).map((method) => (
                <button key={method} type="button" onClick={() => setForm({ ...form, method })} className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-bold ${form.method === method ? "border-[#0B2545] bg-[#0B2545] text-white" : "border-slate-300 bg-white text-slate-600"}`}>
                  {method === "etransfer" ? "Interac e-Transfer" : tr("Canadian bank account", "Compte bancaire canadien")}
                </button>
              ))}
            </div>
            {form.method === "etransfer" ? (
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-700">{tr("e-Transfer email", "Courriel Virement Interac")}</span>
                <input className={inputClass} type="email" autoComplete="off" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </label>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1 sm:col-span-2">
                  <span className="text-xs font-bold text-slate-700">{tr("Account holder", "Titulaire du compte")}</span>
                  <input className={inputClass} autoComplete="off" value={form.accountHolder} onChange={(e) => setForm({ ...form, accountHolder: e.target.value })} />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-slate-700">{tr("Institution (3 digits)", "Institution (3 chiffres)")}</span>
                  <input className={inputClass} inputMode="numeric" autoComplete="off" maxLength={3} value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-slate-700">{tr("Transit (5 digits)", "Transit (5 chiffres)")}</span>
                  <input className={inputClass} inputMode="numeric" autoComplete="off" maxLength={5} value={form.transit} onChange={(e) => setForm({ ...form, transit: e.target.value })} />
                </label>
                <label className="block space-y-1 sm:col-span-2">
                  <span className="text-xs font-bold text-slate-700">{tr("Account number (7 to 12 digits)", "Numéro de compte (7 à 12 chiffres)")}</span>
                  <input className={inputClass} inputMode="numeric" autoComplete="off" maxLength={12} value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} />
                </label>
              </div>
            )}
            <p className="text-xs text-slate-600">{tr(`Stored encrypted. After you change these details, payouts are paused for ${rules.coolingHours} hours and we email you, to protect you if someone else got into your account.`, `Stockées chiffrées. Après toute modification, les versements sont suspendus pendant ${rules.coolingHours} heures et nous vous écrivons, pour vous protéger si quelqu'un d'autre accédait à votre compte.`)}</p>
            {formError && <p role="alert" className="text-xs font-semibold text-red-600">{formError}</p>}
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={busy !== ""} className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#0B2545] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
                {busy === "details" && <Loader2 className="h-4 w-4 animate-spin" />}
                {tr("Save", "Enregistrer")}
              </button>
              <button type="button" onClick={() => setForm(null)} className="cursor-pointer rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700">
                {tr("Cancel", "Annuler")}
              </button>
            </div>
          </form>
        )}

        <div className="space-y-2 border-t border-slate-100 pt-4">
          {openRequest ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <span>
                {tr("Your request for", "Votre demande de")} <b className="tabular-nums">{m(openRequest.amountCents)}</b> {tr("is waiting to be sent.", "attend d'être envoyée.")}
              </span>
              <button type="button" onClick={() => cancel(openRequest.id)} disabled={busy !== ""} className="cursor-pointer rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold disabled:opacity-50">
                {tr("Cancel request", "Annuler la demande")}
              </button>
            </div>
          ) : (
            <form onSubmit={request} noValidate className="flex flex-wrap items-end gap-3">
              <label className="space-y-1">
                <span className="block text-xs font-bold text-slate-700">{tr("Amount (CAD)", "Montant (CAD)")}</span>
                <input className={`${inputClass} !w-40`} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={(summary.withdrawableCents / 100).toFixed(2)} />
              </label>
              <button type="button" onClick={() => setAmount((summary.withdrawableCents / 100).toFixed(2))} disabled={summary.withdrawableCents <= 0} className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2.5 text-xs font-bold text-slate-700 disabled:opacity-40">
                {tr("All available", "Tout le disponible")}
              </button>
              <button type="submit" disabled={busy !== "" || !canRequest} className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#D21F27] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#b91a21] disabled:cursor-not-allowed disabled:opacity-50">
                {busy === "request" && <Loader2 className="h-4 w-4 animate-spin" />}
                {tr("Request payout", "Demander un versement")}
              </button>
            </form>
          )}
          <p className="text-xs text-slate-500">
            {!data.payoutDetails
              ? tr("Add where we should send your payout first.", "Ajoutez d'abord où nous devons envoyer votre versement.")
              : cooling && coolingUntil
                ? tr(`Payouts are paused until ${new Intl.DateTimeFormat("en-CA", { dateStyle: "medium", timeStyle: "short" }).format(coolingUntil)} because you changed your payout details.`, `Les versements sont suspendus jusqu'au ${new Intl.DateTimeFormat("fr-CA", { dateStyle: "medium", timeStyle: "short" }).format(coolingUntil)} parce que vous avez modifié vos coordonnées.`)
                : tr(`The smallest payout is ${m(rules.minPayoutCents)}. Earnings can be withdrawn ${rules.holdDays} days after the customer paid, so a refund can still be taken back. We send payouts weekly.`, `Le plus petit versement est de ${m(rules.minPayoutCents)}. Les revenus peuvent être retirés ${rules.holdDays} jours après le paiement du client, pour qu'un remboursement puisse encore être repris. Nous envoyons les versements chaque semaine.`)}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white">
        <h2 className="border-b border-slate-100 px-5 py-3 text-sm font-bold text-[#0B2545]">{tr("Weekly statements", "Relevés hebdomadaires")}</h2>
        {data.weeks.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">{tr("Nothing yet. Earnings appear here after a customer pays.", "Rien pour l'instant. Les revenus apparaissent ici après le paiement d'un client.")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-5 py-2 text-left font-bold">{tr("Week of", "Semaine du")}</th>
                  <th className="px-3 py-2 text-right font-bold">{tr("Earned", "Gagné")}</th>
                  <th className="px-3 py-2 text-right font-bold">{tr("Refunds", "Remboursements")}</th>
                  <th className="px-3 py-2 text-right font-bold">{tr("Paid to you", "Versé")}</th>
                  <th className="px-5 py-2 text-right font-bold">{tr("Change", "Variation")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.weeks.map((w) => (
                  <tr key={w.weekStart}>
                    <td className="px-5 py-2.5 font-semibold text-slate-700">{dateText(w.weekStart)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{m(w.earnedCents)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{m(w.reversedCents)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{m(w.paidOutCents)}</td>
                    <td className={`px-5 py-2.5 text-right font-bold tabular-nums ${w.netCents < 0 ? "text-red-600" : "text-emerald-700"}`}>{m(w.netCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white">
        <h2 className="border-b border-slate-100 px-5 py-3 text-sm font-bold text-[#0B2545]">{tr("Recent activity", "Activité récente")}</h2>
        {data.entries.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">{tr("No activity yet.", "Aucune activité pour l'instant.")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <tbody className="divide-y divide-slate-100">
                {data.entries.map((e) => (
                  <tr key={e.id}>
                    <td className="px-5 py-2.5 whitespace-nowrap text-slate-600">{dateText(e.createdAt)}</td>
                    <td className="px-3 py-2.5 font-semibold text-slate-700">{typeLabel[e.type]}</td>
                    <td className="px-3 py-2.5">
                      {e.reference ? <span className="font-mono font-bold text-[#0B2545]">{e.reference}</span> : null}
                      {e.fee && (
                        <span className="ml-2 text-slate-500">
                          {tr("markup", "majoration")} {m(e.fee.markupCents)} − {tr("card fee", "frais de carte")} {m(e.fee.feeCents)}
                          {e.fee.estimated ? ` (${tr("estimated", "estimé")})` : ""}
                        </span>
                      )}
                      {e.note && <span className="ml-2 text-slate-500">{e.note}</span>}
                    </td>
                    <td className={`px-5 py-2.5 text-right font-bold tabular-nums ${e.amountCents < 0 ? "text-red-600" : "text-emerald-700"}`}>{m(e.amountCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {data.payouts.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white">
          <h2 className="border-b border-slate-100 px-5 py-3 text-sm font-bold text-[#0B2545]">{tr("Payout requests", "Demandes de versement")}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <tbody className="divide-y divide-slate-100">
                {data.payouts.map((p) => (
                  <tr key={p.id}>
                    <td className="px-5 py-2.5 whitespace-nowrap text-slate-600">{dateText(p.requestedAt)}</td>
                    <td className="px-3 py-2.5 font-bold tabular-nums">{m(p.amountCents)}</td>
                    <td className="px-3 py-2.5 text-slate-600">{p.destination}</td>
                    <td className="px-3 py-2.5 text-slate-600">
                      {statusLabel[p.status]}
                      {p.reference ? ` · ${p.reference}` : ""}
                      {p.rejectedReason ? ` · ${p.rejectedReason}` : ""}
                    </td>
                    <td className="px-5 py-2.5 text-right text-slate-500">{p.resolvedAt ? dateText(p.resolvedAt) : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

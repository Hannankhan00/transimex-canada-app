"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import PermissionGuard from "@/components/admin/PermissionGuard";
import { ExpressAdminTabs, adminInput, useTr } from "@/components/admin/express/expressAdminShared";
import { formatCad } from "@/lib/shipping/core/money";

interface Request {
  id: string;
  partnerName: string;
  amountCents: number;
  status: "requested" | "paid" | "rejected" | "cancelled";
  destination: string;
  requestedAt: string;
  resolvedAt: string | null;
  reference: string;
  rejectedReason: string;
  availableCents: number | null;
}
interface Owed {
  partnerAccountId: string;
  partnerName: string;
  balanceCents: number;
  entries: number;
}
type Details = { method: "etransfer"; email: string } | { method: "bank"; accountHolder: string; institution: string; transit: string; accountNumber: string };

export default function AdminExpressPayoutsPage() {
  const { language, tr } = useTr();
  const m = (c: number) => formatCad(c, language);
  const dateText = (iso: string | null) => (iso ? new Intl.DateTimeFormat(language === "fr" ? "fr-CA" : "en-CA", { dateStyle: "medium" }).format(new Date(iso)) : "—");
  const [requests, setRequests] = useState<Request[]>([]);
  const [owed, setOwed] = useState<Owed[]>([]);
  const [totalOwed, setTotalOwed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState("");
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const [details, setDetails] = useState<Record<string, Details>>({});
  const [paying, setPaying] = useState<{ id: string; mode: "paid" | "reject"; value: string } | null>(null);

  const flash = useCallback((text: string, isError = false) => {
    setToast({ text, error: isError });
    setTimeout(() => setToast(null), 6000);
  }, []);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/admin/express/payouts");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load payouts");
      setRequests(data.requests);
      setOwed(data.owed);
      setTotalOwed(data.totalOwedCents);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const showDetails = async (id: string) => {
    setBusy("details-" + id);
    try {
      const res = await fetch(`/api/admin/express/payouts/${id}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not open the details");
      setDetails((d) => ({ ...d, [id]: data.details }));
    } catch (err: any) {
      flash(err.message, true);
    } finally {
      setBusy("");
    }
  };

  const resolve = async () => {
    if (!paying || busy) return;
    const body = paying.mode === "paid" ? { action: "paid", reference: paying.value } : { action: "reject", reason: paying.value };
    setBusy("resolve");
    try {
      const res = await fetch(`/api/admin/express/payouts/${paying.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.fields?.[0]?.message || data.error || "Action failed");
      flash(paying.mode === "paid" ? tr("Marked paid. The partner was told.", "Marqué payé. Le partenaire a été avisé.") : tr("Rejected. The partner was told.", "Rejeté. Le partenaire a été avisé."));
      setPaying(null);
      setDetails((d) => {
        const next = { ...d };
        delete next[paying.id];
        return next;
      });
      await load();
    } catch (err: any) {
      flash(err.message, true);
    } finally {
      setBusy("");
    }
  };

  const statusLabel = { requested: tr("Waiting", "En attente"), paid: tr("Paid", "Payé"), rejected: tr("Rejected", "Rejeté"), cancelled: tr("Cancelled", "Annulé") };
  const open = requests.filter((r) => r.status === "requested");
  const done = requests.filter((r) => r.status !== "requested");

  const detailLines = (d: Details): [string, string][] =>
    d.method === "etransfer"
      ? [[tr("Method", "Méthode"), "Interac e-Transfer"], [tr("Email", "Courriel"), d.email]]
      : [[tr("Method", "Méthode"), tr("Bank transfer", "Virement bancaire")], [tr("Account holder", "Titulaire"), d.accountHolder], [tr("Institution", "Institution"), d.institution], [tr("Transit", "Transit"), d.transit], [tr("Account number", "Numéro de compte"), d.accountNumber]];

  return (
    <PermissionGuard module="express">
      <div className="max-w-5xl mx-auto space-y-6 px-4 py-6 sm:px-6">
        <ExpressAdminTabs />
        <div>
          <h1 className="text-xl font-extrabold text-[#0B2545]">{tr("Partner payouts", "Versements aux partenaires")}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {tr(
              "Partners who do not use their own Stripe account have their customers pay Transimex. What you owe them is kept here. Send the money yourself (e-Transfer or bank), then mark the request paid with the transfer's reference.",
              "Les partenaires qui n'utilisent pas leur propre compte Stripe font payer leurs clients à Transimex. Ce que vous leur devez est gardé ici. Envoyez l'argent vous-même (Virement Interac ou bancaire), puis marquez la demande payée avec la référence du virement."
            )}
          </p>
        </div>

        {toast && (
          <p role="status" className={`rounded-xl border px-3 py-2 text-sm font-semibold ${toast.error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
            {toast.text}
          </p>
        )}
        {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            <section className="rounded-2xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
                <h2 className="text-sm font-bold text-[#0B2545]">{tr("Waiting to be paid", "En attente de paiement")}</h2>
                <span className="text-xs font-semibold text-slate-600">
                  {tr("Total owed to all partners", "Total dû à tous les partenaires")}: <span className="font-extrabold tabular-nums text-[#0B2545]">{m(totalOwed)}</span>
                </span>
              </div>
              {open.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-500">{tr("No payout requests waiting.", "Aucune demande de versement en attente.")}</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {open.map((r) => (
                    <li key={r.id} className="space-y-3 px-5 py-4 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-800">{r.partnerName}</p>
                          <p className="text-xs text-slate-500">
                            {dateText(r.requestedAt)} · {r.destination}
                          </p>
                        </div>
                        <p className="text-xl font-extrabold tabular-nums text-[#0B2545]">{m(r.amountCents)}</p>
                      </div>
                      {r.availableCents !== null && r.availableCents < r.amountCents && (
                        <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                          {tr(`A refund came in: the partner's available balance is now only ${m(r.availableCents)}. Reject this request so they can ask again.`, `Un remboursement est arrivé : le solde disponible du partenaire n'est plus que de ${m(r.availableCents)}. Rejetez cette demande pour qu'il puisse la refaire.`)}
                        </p>
                      )}
                      {details[r.id] ? (
                        <dl className="grid gap-x-6 gap-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs sm:grid-cols-2">
                          {detailLines(details[r.id]).map(([k, v]) => (
                            <div key={k} className="flex justify-between gap-3">
                              <dt className="text-slate-500">{k}</dt>
                              <dd className="select-all font-mono font-bold text-slate-800">{v}</dd>
                            </div>
                          ))}
                        </dl>
                      ) : (
                        <button type="button" onClick={() => showDetails(r.id)} disabled={busy !== ""} className="cursor-pointer rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                          {busy === "details-" + r.id ? tr("Opening...", "Ouverture...") : tr("Show payout details (logged)", "Afficher les coordonnées (consigné)")}
                        </button>
                      )}
                      {paying?.id === r.id ? (
                        <div className="flex flex-wrap items-end gap-2">
                          <label className="w-full space-y-1 sm:w-auto">
                            <span className="block text-xs font-bold text-slate-600">{paying.mode === "paid" ? tr("Transfer reference", "Référence du virement") : tr("Reason", "Raison")}</span>
                            <input className={`${adminInput} !w-full sm:!w-72`} value={paying.value} onChange={(e) => setPaying({ ...paying, value: e.target.value })} />
                          </label>
                          <button type="button" onClick={resolve} disabled={busy !== ""} className={`cursor-pointer rounded-lg px-4 py-2 text-xs font-bold text-white disabled:opacity-50 ${paying.mode === "paid" ? "bg-emerald-600" : "bg-red-600"}`}>
                            {paying.mode === "paid" ? tr("Confirm: money sent", "Confirmer : argent envoyé") : tr("Confirm rejection", "Confirmer le rejet")}
                          </button>
                          <button type="button" onClick={() => setPaying(null)} className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700">
                            {tr("Back", "Retour")}
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => setPaying({ id: r.id, mode: "paid", value: "" })} className="cursor-pointer rounded-lg bg-[#0B2545] px-3 py-2 text-xs font-bold text-white">
                            {tr("I sent it: mark paid", "Je l'ai envoyé : marquer payé")}
                          </button>
                          <button type="button" onClick={() => setPaying({ id: r.id, mode: "reject", value: "" })} className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700">
                            {tr("Reject", "Rejeter")}
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white">
              <h2 className="border-b border-slate-100 px-5 py-3 text-sm font-bold text-[#0B2545]">{tr("What each partner is owed", "Ce que chaque partenaire est en droit de recevoir")}</h2>
              {owed.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-500">{tr("No partner has earnings with Transimex yet.", "Aucun partenaire n'a encore de revenus chez Transimex.")}</p>
              ) : (
                <div className="overflow-x-auto"><table className="w-full text-xs">
                  <tbody className="divide-y divide-slate-100">
                    {owed.map((o) => (
                      <tr key={o.partnerAccountId}>
                        <td className="px-5 py-2.5 font-semibold text-slate-700">{o.partnerName}</td>
                        <td className="px-3 py-2.5 text-slate-500">{o.entries} {tr("entries", "écritures")}</td>
                        <td className={`px-5 py-2.5 text-right font-bold tabular-nums ${o.balanceCents < 0 ? "text-red-600" : "text-[#0B2545]"}`}>{m(o.balanceCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              )}
            </section>

            {done.length > 0 && (
              <section className="rounded-2xl border border-slate-200 bg-white">
                <h2 className="border-b border-slate-100 px-5 py-3 text-sm font-bold text-[#0B2545]">{tr("History", "Historique")}</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <tbody className="divide-y divide-slate-100">
                      {done.map((r) => (
                        <tr key={r.id}>
                          <td className="px-5 py-2.5 whitespace-nowrap text-slate-600">{dateText(r.requestedAt)}</td>
                          <td className="px-3 py-2.5 font-semibold text-slate-700">{r.partnerName}</td>
                          <td className="px-3 py-2.5 font-bold tabular-nums">{m(r.amountCents)}</td>
                          <td className="px-3 py-2.5 text-slate-600">
                            {statusLabel[r.status]}
                            {r.reference ? ` · ${r.reference}` : ""}
                            {r.rejectedReason ? ` · ${r.rejectedReason}` : ""}
                          </td>
                          <td className="px-5 py-2.5 text-right text-slate-500">{dateText(r.resolvedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </PermissionGuard>
  );
}

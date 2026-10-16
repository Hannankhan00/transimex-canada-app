"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, Loader2 } from "lucide-react";
import PermissionGuard from "@/components/admin/PermissionGuard";
import { ExpressAdminTabs, InvoiceStatusBadge, adminInput, formatDate, useTr } from "@/components/admin/express/expressAdminShared";
import { formatCad } from "@/lib/shipping/core/money";
import type { toAdminInvoiceDTO } from "@/lib/express/invoiceDto";

type Invoice = ReturnType<typeof toAdminInvoiceDTO>;

export default function AdminExpressInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const { language, tr } = useTr();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState("");
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const [mode, setMode] = useState<"" | "pay" | "void">("");
  const [text, setText] = useState("");

  const flash = useCallback((message: string, isError = false) => {
    setToast({ text: message, error: isError });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/express/invoices/${id}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load the invoice");
      setInvoice(data.invoice);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!mode) return;
    setBusy(mode);
    try {
      const res = await fetch(`/api/admin/express/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "pay" ? { action: "markPaid", reference: text } : { action: "void", reason: text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = Array.isArray(data.fields) ? data.fields.map((f: { message: string }) => f.message).join(", ") : "";
        throw new Error([data.error, detail].filter(Boolean).join(": ") || "Action failed");
      }
      setInvoice(data.invoice);
      flash(mode === "pay" ? tr("Marked as paid", "Marquée comme payée") : tr("Invoice voided. Its bookings will be billed again by the next run.", "Facture annulée. Ses réservations seront refacturées par la prochaine exécution."));
      setMode("");
      setText("");
    } catch (err: any) {
      flash(err.message, true);
    } finally {
      setBusy("");
    }
  };

  const m = (c: number) => formatCad(c, language);

  const body = () => {
    if (loading) return <div className="py-16 text-center text-xs text-slate-400">{tr("Loading...", "Chargement...")}</div>;
    if (error || !invoice) {
      return (
        <div className="py-16 text-center text-xs text-red-600 font-semibold">
          {error || tr("Not found", "Introuvable")}{" "}
          <button type="button" onClick={load} className="underline cursor-pointer">
            {tr("Retry", "Réessayer")}
          </button>
        </div>
      );
    }
    const unpaid = invoice.status === "issued" || invoice.status === "overdue";
    const p = invoice.payment;
    return (
      <div className="space-y-5">
        {p.state === "mismatch" && (
          <div role="alert" className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 space-y-1">
            <p className="flex items-center gap-2 font-bold">
              <AlertTriangle className="w-4 h-4" />
              {tr("Needs attention", "Requiert votre attention")}
            </p>
            <p>{tr("A card payment did not match the invoice amount, so it was not accepted. Check it in the payment provider.", "Un paiement par carte ne correspondait pas au montant de la facture; il n'a donc pas été accepté. Vérifiez-le chez le fournisseur de paiement.")}</p>
            {p.mismatchNote && <p className="text-xs font-mono bg-white/60 rounded p-2 break-words">{p.mismatchNote}</p>}
          </div>
        )}

        <div className="grid lg:grid-cols-5 gap-5">
          <section className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-mono font-bold text-[#0B2545]">{invoice.number}</h2>
              <InvoiceStatusBadge status={invoice.status} />
            </div>
            <dl className="text-sm divide-y divide-slate-100">
              {[
                [tr("Account", "Compte"), `${invoice.owner.companyName || invoice.owner.name} · ${invoice.owner.email}`],
                [tr("Issued", "Émise"), formatDate(invoice.issuedAt, language)],
                [tr("Due", "Échéance"), `${formatDate(invoice.dueAt, language)} (${invoice.paymentTermsDays} ${tr("days", "jours")})`],
                ...(invoice.paidAt
                  ? [[tr("Paid", "Payée"), `${formatDate(invoice.paidAt, language)} · ${invoice.paidMethod === "manual" ? `${tr("manual", "manuel")}: ${invoice.paidReference}` : tr("card", "carte")}`]]
                  : []),
                ...(invoice.status === "void" ? [[tr("Voided", "Annulée"), `${formatDate(invoice.voidedAt, language)} · ${invoice.voidReason}`]] : []),
                [tr("Reminders sent", "Rappels envoyés"), `${invoice.reminderCount}${invoice.lastReminderAt ? ` (${formatDate(invoice.lastReminderAt, language)})` : ""}`],
              ].map(([k, v]) => (
                <div key={k} className="py-2 grid sm:grid-cols-3 gap-1">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="sm:col-span-2 font-semibold text-slate-800 break-words">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm">
              {invoice.lines.map((l, i) => (
                <div key={i} className="flex items-start justify-between gap-4 px-4 py-2.5">
                  <div className="min-w-0">
                    {l.kind === "shipment" && l.shipmentId ? (
                      <Link href={`/admin/express/shipments/${l.shipmentId}`} className="font-mono text-xs font-bold text-[#0B2545] hover:underline">
                        {l.reference}
                      </Link>
                    ) : (
                      <span className="text-xs font-bold text-slate-600">{tr("Credit", "Crédit")}</span>
                    )}
                    <p className="text-xs text-slate-500">{l.description}</p>
                  </div>
                  <span className={`whitespace-nowrap font-semibold tabular-nums ${l.amountCents < 0 ? "text-emerald-700" : ""}`}>{l.amountCents < 0 ? `−${m(-l.amountCents)}` : m(l.amountCents)}</span>
                </div>
              ))}
              <div className="flex justify-between bg-slate-50 px-4 py-3 font-extrabold text-[#0B2545]">
                <span>{tr("Total", "Total")}</span>
                <span className="tabular-nums">{m(invoice.totalCents)}</span>
              </div>
            </div>
          </section>

          <div className="lg:col-span-2 space-y-5">
            {unpaid && (
              <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                <h2 className="font-bold text-[#0B2545] text-sm">{tr("Actions", "Actions")}</h2>
                {mode ? (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700">
                      {mode === "pay" ? tr("Payment reference (bank transfer or cheque number)", "Référence du paiement (virement ou numéro de chèque)") : tr("Reason for voiding", "Motif de l'annulation")}
                    </label>
                    <input className={adminInput} value={text} onChange={(e) => setText(e.target.value)} maxLength={mode === "pay" ? 200 : 500} />
                    {mode === "void" && <p className="text-[11px] text-slate-500">{tr("The bookings and credits on this invoice go back to not invoiced, so the next run bills them again.", "Les réservations et crédits de cette facture redeviennent non facturés; la prochaine exécution les refacturera.")}</p>}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={submit}
                        disabled={busy !== "" || text.trim().length < (mode === "pay" ? 2 : 3)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0B2545] hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
                      >
                        {busy !== "" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {mode === "pay" ? tr("Confirm payment", "Confirmer le paiement") : tr("Confirm void", "Confirmer l'annulation")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMode("");
                          setText("");
                        }}
                        className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer"
                      >
                        {tr("Cancel", "Annuler")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setMode("pay")} className="px-4 py-2 rounded-lg bg-[#0B2545] hover:bg-slate-800 text-white text-xs font-bold cursor-pointer">
                      {tr("Mark as paid", "Marquer comme payée")}
                    </button>
                    <button type="button" onClick={() => setMode("void")} className="px-4 py-2 rounded-lg border border-red-300 text-red-700 text-xs font-bold hover:bg-red-50 cursor-pointer">
                      {tr("Void invoice", "Annuler la facture")}
                    </button>
                  </div>
                )}
              </section>
            )}

            <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2 text-sm">
              <h2 className="font-bold text-[#0B2545] text-sm">{tr("Card payment", "Paiement par carte")}</h2>
              <p className="text-slate-600">
                {p.state === "none" ? tr("No card payment started.", "Aucun paiement par carte démarré.") : `${p.state} · ${p.provider || ""} · ${p.attempts} ${tr("attempt(s)", "tentative(s)")}`}
              </p>
              {p.paymentIntentId && <p className="text-xs font-mono text-slate-500 break-all">{p.paymentIntentId}</p>}
              {p.duplicatePayments.length > 0 && (
                <p className="text-xs text-amber-700">
                  {tr("Duplicate or late payments refunded automatically", "Paiements en double ou tardifs remboursés automatiquement")}: {p.duplicatePayments.length}
                </p>
              )}
            </section>
          </div>
        </div>
      </div>
    );
  };

  return (
    <PermissionGuard module="express">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Link href="/admin/express/invoices" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-3.5 h-3.5" />
            {tr("Back to invoices", "Retour aux factures")}
          </Link>
        </div>
        <ExpressAdminTabs />
        {toast && (
          <p role="status" className={`rounded-xl border px-4 py-3 text-sm font-semibold ${toast.error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
            {toast.text}
          </p>
        )}
        {body()}
      </div>
    </PermissionGuard>
  );
}

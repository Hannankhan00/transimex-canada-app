"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, Download, Loader2 } from "lucide-react";
import PermissionGuard from "@/components/admin/PermissionGuard";
import { ContentTypeBadge, ExpressAdminTabs, ShipmentStatusBadge, adminInput, dollarsToCents, formatDate, useTr } from "@/components/admin/express/expressAdminShared";
import { formatCad } from "@/lib/shipping/core/money";
import { COUNTRIES } from "@/lib/data/countries";
import type { toAdminShipmentDTO } from "@/lib/express/shipmentDto";
import type { toAdminQuoteDTO } from "@/lib/express/quoteDto";

type Shipment = ReturnType<typeof toAdminShipmentDTO>;
type Quote = ReturnType<typeof toAdminQuoteDTO>;

export default function AdminExpressShipmentPage() {
  const { id } = useParams<{ id: string }>();
  const { language, tr } = useTr();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [busy, setBusy] = useState("");
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const [showCancel, setShowCancel] = useState(false);
  const [reason, setReason] = useState("");
  const [refund, setRefund] = useState("0");
  const [tracking, setTracking] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dhlCharge, setDhlCharge] = useState("");
  const [dhlInvoiceNo, setDhlInvoiceNo] = useState("");

  const flash = useCallback((text: string, isError = false) => {
    setToast({ text, error: isError });
    setTimeout(() => setToast(null), 5000);
  }, []);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(`/api/admin/express/shipments/${id}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load shipment");
      setShipment(data.shipment);
      setQuote(data.quote);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const m = (c: number) => formatCad(c, language);
  const country = (code: string) => {
    const c = COUNTRIES.find((x) => x.code === code);
    return c ? (language === "fr" ? c.nameFr : c.name) : code;
  };

  const run = async (name: string, request: () => Promise<Response>, success: (data: any) => string) => {
    setBusy(name);
    try {
      const res = await request();
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) throw new Error(data.error || "Action failed");
      flash(success(data), false);
      await load();
    } catch (err: any) {
      flash(err.message, true);
      await load();
    } finally {
      setBusy("");
    }
  };

  const saveDhlCharge = (clear: boolean) => {
    const cents = clear ? null : dollarsToCents(dhlCharge);
    if (!clear && cents === null) return flash(tr("Enter the amount DHL charged", "Entrez le montant facturé par DHL"), true);
    return run(
      "dhlcost",
      () => fetch(`/api/admin/express/shipments/${id}/dhl-cost`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ charge: cents === null ? null : cents / 100, invoiceNumber: dhlInvoiceNo }) }),
      () => {
        setDhlCharge("");
        return clear ? tr("DHL charge cleared", "Coût DHL effacé") : tr("DHL charge saved", "Coût DHL enregistré");
      }
    );
  };

  const retryLabel = () =>
    run("retry", () => fetch(`/api/admin/express/shipments/${id}/retry-label`, { method: "POST" }), () => tr("Label created", "Étiquette créée"));

  const uploadLabel = () => {
    if (!file || !tracking.trim()) return flash(tr("Enter the tracking number and choose the PDF.", "Entrez le numéro de suivi et choisissez le PDF."), true);
    const form = new FormData();
    form.set("trackingNumber", tracking.trim());
    form.set("file", file);
    return run("upload", () => fetch(`/api/admin/express/shipments/${id}/label`, { method: "POST", body: form }), () => {
      setTracking("");
      setFile(null);
      return tr("Label saved", "Étiquette enregistrée");
    });
  };

  const cancel = () => {
    if (!shipment) return;
    if (reason.trim().length < 3) return flash(tr("Please give a reason.", "Veuillez donner un motif."), true);
    const body: Record<string, unknown> = { reason: reason.trim() };
    if (shipment.status === "label_ready") {
      const cents = refund.trim() === "" ? 0 : dollarsToCents(refund);
      if (cents == null || cents < 0) return flash(tr("Enter a refund amount.", "Entrez un montant de remboursement."), true);
      body.refundCents = cents;
    }
    return run("cancel", () => fetch(`/api/admin/express/shipments/${id}/cancel`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }), (d) => {
      setShowCancel(false);
      setReason("");
      return d.refundFailed
        ? tr("Cancelled, but the refund FAILED. Use 'Retry refund'.", "Annulé, mais le remboursement a ÉCHOUÉ. Utilisez « Réessayer le remboursement ».")
        : d.refundedCents > 0
          ? tr(`Cancelled and refunded ${m(d.refundedCents)}`, `Annulé et remboursé ${m(d.refundedCents)}`)
          : tr("Cancelled", "Annulé");
    });
  };

  const attentionText: Record<string, string> = {
    label_failed: tr("Label creation failed. Retry it, or upload the label by hand.", "La création de l'étiquette a échoué. Réessayez, ou téléversez l'étiquette à la main."),
    outcome_unknown: tr("DHL did not answer clearly and may have booked this shipment. Check with DHL, then enter its tracking number and label by hand. Do NOT retry or refund blindly.", "DHL n'a pas répondu clairement et a peut-être réservé cet envoi. Vérifiez auprès de DHL, puis entrez son numéro de suivi et son étiquette à la main. Ne PAS réessayer ni rembourser à l'aveugle."),
    label_overdue: tr("Paid, but still no label after 10 minutes.", "Payé, mais toujours pas d'étiquette après 10 minutes."),
    amount_mismatch: tr("The payment amount did not match the booking, so it was not accepted. Check it in the payment provider.", "Le montant du paiement ne correspond pas à la réservation; il n'a donc pas été accepté. Vérifiez-le chez le fournisseur de paiement."),
    refund_failed: tr("The refund failed. Retry it.", "Le remboursement a échoué. Réessayez-le."),
    delivery_exception: tr("DHL reported a delivery exception (failed attempt, customs hold or similar). Check the tracking events below and follow up with DHL.", "DHL a signalé une exception de livraison (tentative échouée, retenue douanière ou autre). Consultez les événements de suivi ci-dessous et faites le suivi avec DHL."),
    tracking_failing: tr("Checking DHL tracking keeps failing. See the error below.", "La vérification du suivi DHL échoue de façon répétée. Voir l'erreur ci-dessous."),
    no_scan: tr("DHL has no scan for this parcel more than 10 days after the label was created. Check that it was handed over.", "DHL n'a aucun scan pour ce colis plus de 10 jours après la création de l'étiquette. Vérifiez qu'il a bien été remis."),
  };

  const refreshTracking = () =>
    run("track", () => fetch(`/api/admin/express/shipments/${id}/refresh-tracking`, { method: "POST" }), (d) =>
      d.outcome === "not_scanned" ? tr("DHL has not scanned this parcel yet", "DHL n'a pas encore scanné ce colis") : d.outcome === "skipped" ? tr("Nothing to check for this booking", "Rien à vérifier pour cette réservation") : tr("Tracking refreshed", "Suivi actualisé")
    );

  const addr = (a: Shipment["shipper"]) => (
    <div className="text-sm text-slate-700 leading-relaxed">
      <p className="font-semibold text-slate-900">{a.name}</p>
      {a.company && <p>{a.company}</p>}
      <p>{a.line1}{a.line2 ? `, ${a.line2}` : ""}</p>
      <p>{a.city}{a.region ? `, ${a.region}` : ""} {a.postalCode}</p>
      <p>{country(a.countryCode)}</p>
      <p className="text-slate-500">{a.phone}{a.email ? ` · ${a.email}` : ""}</p>
    </div>
  );

  const body = () => {
    if (loading) return <div className="py-16 text-center text-xs text-slate-400">{tr("Loading...", "Chargement...")}</div>;
    if (error || !shipment) {
      return (
        <div className="py-16 text-center text-xs text-red-600 font-semibold">
          {error || tr("Not found", "Introuvable")}{" "}
          <button type="button" onClick={load} className="underline cursor-pointer">
            {tr("Retry", "Réessayer")}
          </button>
        </div>
      );
    }
    const p = quote?.pricing;
    const pay = shipment.payment;
    const ful = shipment.fulfilment;
    // A booking on the invoice account is credited, not refunded to a card.
    const onAccount = shipment.billingDetail?.mode === "invoice";
    const left = onAccount ? Math.max(0, shipment.billingDetail!.chargeCents - shipment.billingDetail!.creditedCents) : Math.max(0, (pay.amountCents ?? 0) - pay.refundedCents);
    const canRetryLabel = shipment.status === "paid" && ful.state !== "unknown" && ful.state !== "pending" && !shipment.trackingNumber;
    const canUpload = shipment.status === "paid" && ful.state !== "pending";
    const canRetryRefund = shipment.status === "cancelled" && pay.refundState === "failed";
    const canCancel = shipment.status === "awaiting_payment" || (shipment.status === "paid" && ful.state !== "unknown" && ful.state !== "pending" && !shipment.trackingNumber) || shipment.status === "label_ready";

    return (
      <div className="space-y-5">
        {shipment.attention.length > 0 && (
          <div role="alert" className="rounded-2xl border border-red-300 bg-red-50 p-4 space-y-2 text-sm text-red-800">
            <p className="flex items-center gap-2 font-bold">
              <AlertTriangle className="w-4 h-4" />
              {tr("Needs attention", "Requiert votre attention")}
            </p>
            <ul className="list-disc pl-5 space-y-1">
              {shipment.attention.map((a) => (
                <li key={a}>{attentionText[a]}</li>
              ))}
            </ul>
            {(ful.lastError || pay.refundError || pay.mismatchNote || shipment.trackingCheck.lastError) && (
              <p className="text-xs font-mono bg-white/60 rounded p-2 break-words">{ful.lastError || pay.refundError || pay.mismatchNote || shipment.trackingCheck.lastError}</p>
            )}
          </div>
        )}

        <div className="grid lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3 space-y-5">
            <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-mono font-bold text-[#0B2545]">{shipment.reference}</h2>
                <ShipmentStatusBadge status={shipment.status} />
                <ContentTypeBadge type={shipment.contentType} />
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold uppercase">{shipment.accountType}</span>
              </div>
              <dl className="text-sm divide-y divide-slate-100">
                {[
                  [tr("Client", "Client"), `${shipment.user.companyName || shipment.user.name} · ${shipment.user.email}`],
                  [tr("Booked", "Réservé"), formatDate(shipment.createdAt, language)],
                  [tr("Ship date", "Date d'expédition"), shipment.plannedShipDate],
                  [tr("Pickup", "Ramassage"), shipment.pickupRequested ? tr("DHL pickup", "Ramassage DHL") : tr("Drop-off at DHL service point", "Dépôt à un point de service DHL")],
                  ...(shipment.contentType === "documents"
                    ? [[tr("Contents", "Contenu"), shipment.contentDescription]]
                    : [[tr("Duties and taxes", "Droits et taxes"), shipment.dutiesPayer === "recipient" ? tr("Recipient pays on delivery", "Le destinataire paie à la livraison") : tr("Sender pays", "L'expéditeur paie")]]),
                  [tr("Parcels", "Colis"), shipment.parcels.map((x) => `${x.weightKg} kg · ${x.lengthCm}×${x.widthCm}×${x.heightCm} cm`).join("  |  ")],
                  ...(shipment.contentType === "documents"
                    ? [[tr("Documents confirmed", "Documents confirmés"), shipment.documentsDeclaredAt ? formatDate(shipment.documentsDeclaredAt, language) : "—"]]
                    : [[tr("Declared value", "Valeur déclarée"), m(shipment.declaredValueCents)]]),
                  [tr("Terms accepted", "Conditions acceptées"), shipment.termsVersion],
                  [tr("Tracking", "Suivi"), shipment.trackingNumber || "—"],
                  ...(shipment.pickupConfirmation ? [[tr("DHL pickup confirmation", "Confirmation du ramassage DHL"), shipment.pickupConfirmation] as [string, string]] : []),
                ].map(([k, v]) => (
                  <div key={k} className="py-2 grid sm:grid-cols-3 gap-1">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="sm:col-span-2 font-semibold text-slate-800 break-words">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {shipment.trackingNumber && shipment.status === "label_ready" && (
              <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-bold text-[#0B2545] text-sm">
                    {tr("DHL tracking", "Suivi DHL")}
                    {shipment.tracking && <span className="ml-2 text-xs font-semibold text-slate-500">{shipment.tracking.status.replace(/_/g, " ")}</span>}
                  </h2>
                  <button
                    type="button"
                    onClick={refreshTracking}
                    disabled={busy !== ""}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-bold disabled:opacity-60 cursor-pointer"
                  >
                    {busy === "track" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {tr("Refresh from DHL", "Actualiser depuis DHL")}
                  </button>
                </div>
                {shipment.tracking ? (
                  <ul className="text-sm divide-y divide-slate-100">
                    {shipment.tracking.events.map((e, i) => (
                      <li key={i} className="py-2 flex justify-between gap-3">
                        <span className={i === 0 ? "font-bold text-slate-900" : "text-slate-700"}>
                          {e.description}
                          {e.location ? <span className="text-slate-500"> · {e.location}</span> : null}
                        </span>
                        <span className="text-slate-500 whitespace-nowrap">{formatDate(e.at, language)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">{tr("DHL has not scanned this parcel yet.", "DHL n'a pas encore scanné ce colis.")}</p>
                )}
              </section>
            )}

            <div className="grid md:grid-cols-2 gap-5">
              <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
                <h2 className="font-bold text-[#0B2545] text-sm">{tr("Sender", "Expéditeur")}</h2>
                {addr(shipment.shipper)}
              </section>
              <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
                <h2 className="font-bold text-[#0B2545] text-sm">{tr("Recipient", "Destinataire")}</h2>
                {addr(shipment.recipient)}
              </section>
            </div>

            {shipment.contentType !== "documents" && (
            <section className="bg-white rounded-2xl border border-slate-200 p-5">
              <h2 className="font-bold text-[#0B2545] text-sm mb-3">{tr("Customs items", "Articles douaniers")}</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-100">
                      <th className="text-left py-2 pr-3 font-bold">{tr("Description", "Description")}</th>
                      <th className="text-left py-2 pr-3 font-bold">HS</th>
                      <th className="text-right py-2 pr-3 font-bold">{tr("Qty", "Qté")}</th>
                      <th className="text-right py-2 pr-3 font-bold">{tr("Unit value", "Valeur unitaire")}</th>
                      <th className="text-left py-2 pr-3 font-bold">{tr("Origin", "Origine")}</th>
                      <th className="text-left py-2 font-bold">{tr("Reason", "Motif")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {shipment.items.map((i, idx) => (
                      <tr key={idx}>
                        <td className="py-2 pr-3">{i.description}</td>
                        <td className="py-2 pr-3 font-mono text-xs">{i.hsCode}</td>
                        <td className="py-2 pr-3 text-right">{i.quantity}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{m(i.unitValueCents)}</td>
                        <td className="py-2 pr-3">{i.countryOfOrigin}</td>
                        <td className="py-2">{i.exportReason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            )}
          </div>

          <div className="lg:col-span-2 space-y-5">
            {/* Payment */}
            <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <h2 className="font-bold text-[#0B2545] text-sm">{tr("Payment", "Paiement")}</h2>
              <dl className="text-sm divide-y divide-slate-100">
                {(
                  [
                    [tr("State", "État"), pay.state],
                    [tr("Provider", "Fournisseur"), onAccount ? tr("Account credit (weekly invoice)", "Crédit du compte (facture hebdomadaire)") : pay.provider || "—"],
                    ...(onAccount
                      ? ([
                          [tr("Credited back", "Crédité"), shipment.billingDetail!.creditedCents > 0 ? m(shipment.billingDetail!.creditedCents) : "—"],
                          [tr("Invoice", "Facture"), shipment.billingDetail!.invoiceId ? "yes" : tr("not yet invoiced", "pas encore facturé")],
                        ] as [string, string][])
                      : []),
                    [tr("Amount due", "Montant dû"), m(shipment.totalCents)],
                    [tr("Paid", "Payé"), pay.paidAt ? `${m(pay.amountCents ?? 0)} · ${formatDate(pay.paidAt, language)}` : "—"],
                    [tr("Payment reference", "Référence du paiement"), pay.paymentIntentId || "—"],
                    [tr("Checkout attempts", "Tentatives de paiement"), String(pay.attempts)],
                    [tr("Refunded", "Remboursé"), pay.refundedCents > 0 ? `${m(pay.refundedCents)} (${tr("left", "reste")} ${m(left)})` : "—"],
                  ] as [string, string][]
                ).map(([k, v]) => (
                  <div key={k} className="py-2 flex justify-between gap-3">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="font-semibold text-slate-800 text-right break-all">{v}</dd>
                  </div>
                ))}
              </dl>
              {pay.refunds.length > 0 && (
                <ul className="text-xs divide-y divide-slate-100 border-t border-slate-100">
                  {pay.refunds.map((r) => (
                    <li key={r.refundId} className="py-2 flex justify-between gap-3">
                      <span>
                        {m(r.amountCents)} · {r.reason}
                      </span>
                      <span className="text-slate-500">{formatDate(r.at, language)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {pay.duplicatePayments.length > 0 && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
                  {tr(`${pay.duplicatePayments.length} duplicate or late payment(s) were refunded automatically.`, `${pay.duplicatePayments.length} paiement(s) en double ou tardif(s) ont été remboursé(s) automatiquement.`)}
                </p>
              )}
            </section>

            {/* Label */}
            <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <h2 className="font-bold text-[#0B2545] text-sm">{tr("DHL label", "Étiquette DHL")}</h2>
              <dl className="text-sm divide-y divide-slate-100">
                {(
                  [
                    [tr("Label work", "Création de l'étiquette"), ful.state],
                    [tr("Attempts", "Tentatives"), String(ful.attempts)],
                    [tr("Label", "Étiquette"), shipment.label ? `${shipment.label.source === "manual" ? tr("entered by hand", "saisie à la main") : "DHL"} · ${Math.round(shipment.label.bytes / 1024)} KB` : "—"],
                  ] as [string, string][]
                ).map(([k, v]) => (
                  <div key={k} className="py-2 flex justify-between gap-3">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="font-semibold text-slate-800 text-right">{v}</dd>
                  </div>
                ))}
              </dl>

              <div className="flex flex-wrap gap-2">
                {shipment.label && (
                  <a href={`/api/admin/express/shipments/${shipment.id}/label`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50">
                    <Download className="w-3.5 h-3.5" />
                    {tr("Download label", "Télécharger l'étiquette")}
                  </a>
                )}
                {shipment.invoice && (
                  <a href={`/api/admin/express/shipments/${shipment.id}/invoice`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50">
                    <Download className="w-3.5 h-3.5" />
                    {tr("Download invoice", "Télécharger la facture")} · {shipment.invoice.paperless ? tr("paperless", "sans papier") : tr("print it", "à imprimer")}
                  </a>
                )}
                {canRetryLabel && (
                  <button type="button" onClick={retryLabel} disabled={!!busy} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0B2545] text-white text-xs font-bold disabled:opacity-60 cursor-pointer">
                    {busy === "retry" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {tr("Retry label", "Réessayer l'étiquette")}
                  </button>
                )}
              </div>

              {canUpload && (
                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <p className="text-xs font-bold text-slate-700">{tr("Fallback: enter the DHL label by hand", "Solution de rechange : saisir l'étiquette DHL à la main")}</p>
                  <input className={adminInput} placeholder={tr("DHL tracking number", "Numéro de suivi DHL")} value={tracking} onChange={(e) => setTracking(e.target.value)} />
                  <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-xs" />
                  <button type="button" onClick={uploadLabel} disabled={!!busy} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#0B2545] text-[#0B2545] text-xs font-bold disabled:opacity-60 cursor-pointer">
                    {busy === "upload" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {tr("Save tracking and label", "Enregistrer le suivi et l'étiquette")}
                  </button>
                </div>
              )}
            </section>

            {/* What DHL really charged, for the profit report */}
            {shipment.trackingNumber && p && (
              <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                <h2 className="font-bold text-[#0B2545] text-sm">{tr("DHL's actual charge", "Coût réel DHL")}</h2>
                <dl className="text-sm divide-y divide-slate-100">
                  <div className="py-2 flex justify-between gap-3">
                    <dt className="text-slate-500">{tr("Quoted (DHL account rate)", "Soumis (tarif de compte DHL)")}</dt>
                    <dd className="font-semibold text-slate-800">{m(p.account.totalCents)}</dd>
                  </div>
                  <div className="py-2 flex justify-between gap-3">
                    <dt className="text-slate-500">{tr("Actual (from DHL's invoice)", "Réel (facture DHL)")}</dt>
                    <dd className="font-semibold text-slate-800 text-right">
                      {shipment.dhlActual ? (
                        <>
                          {m(shipment.dhlActual.chargeCents)}
                          {shipment.dhlActual.chargeCents !== p.account.totalCents && (
                            <span className={`ml-2 text-xs font-bold ${shipment.dhlActual.chargeCents > p.account.totalCents ? "text-red-600" : "text-emerald-700"}`}>
                              {shipment.dhlActual.chargeCents > p.account.totalCents ? "+" : "−"}
                              {m(Math.abs(shipment.dhlActual.chargeCents - p.account.totalCents))}
                            </span>
                          )}
                          <span className="block text-[11px] font-normal text-slate-500">
                            {shipment.dhlActual.source === "invoice" ? tr("imported", "importé") : tr("entered by hand", "saisi à la main")}
                            {shipment.dhlActual.invoiceNumber ? ` · ${shipment.dhlActual.invoiceNumber}` : ""}
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-400">{tr("not recorded yet", "pas encore enregistré")}</span>
                      )}
                    </dd>
                  </div>
                </dl>
                <div className="flex flex-wrap items-end gap-2">
                  <label className="space-y-1">
                    <span className="block text-xs font-bold text-slate-600">{tr("DHL charge (CAD)", "Coût DHL (CAD)")}</span>
                    <input className={`${adminInput} !w-32`} inputMode="decimal" value={dhlCharge} onChange={(e) => setDhlCharge(e.target.value)} placeholder="0.00" />
                  </label>
                  <label className="space-y-1">
                    <span className="block text-xs font-bold text-slate-600">{tr("DHL invoice no. (optional)", "No de facture DHL (facultatif)")}</span>
                    <input className={`${adminInput} !w-44`} value={dhlInvoiceNo} onChange={(e) => setDhlInvoiceNo(e.target.value)} />
                  </label>
                  <button type="button" disabled={busy !== ""} onClick={() => saveDhlCharge(false)} className="px-3 py-2 rounded-lg bg-[#0B2545] text-white text-xs font-bold disabled:opacity-50 cursor-pointer">
                    {tr("Save", "Enregistrer")}
                  </button>
                  {shipment.dhlActual && (
                    <button type="button" disabled={busy !== ""} onClick={() => saveDhlCharge(true)} className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 disabled:opacity-50 cursor-pointer">
                      {tr("Clear", "Effacer")}
                    </button>
                  )}
                </div>
              </section>
            )}

            {/* Cancel / refund */}
            {(canCancel || canRetryRefund) && (
              <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                <h2 className="font-bold text-[#0B2545] text-sm">{canRetryRefund ? tr("Refund", "Remboursement") : tr("Cancel booking", "Annuler la réservation")}</h2>
                {!showCancel ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowCancel(true);
                      setRefund("0");
                    }}
                    className="px-3 py-2 rounded-lg border border-red-300 text-red-700 text-xs font-bold hover:bg-red-50 cursor-pointer"
                  >
                    {canRetryRefund ? tr("Retry refund", "Réessayer le remboursement") : tr("Cancel this booking…", "Annuler cette réservation…")}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-600">
                      {shipment.status === "awaiting_payment" && tr("Nothing was paid, so nothing is refunded.", "Rien n'a été payé; il n'y a donc rien à rembourser.")}
                      {shipment.status === "paid" && onAccount && tr(`The full charge (${m(left)}) will be credited to the account.`, `La totalité des frais (${m(left)}) sera créditée au compte.`)}
                      {shipment.status === "paid" && !onAccount && tr(`The full payment (${m(left)}) will be refunded to the client's card.`, `Le paiement complet (${m(left)}) sera remboursé sur la carte du client.`)}
                      {shipment.status === "label_ready" && onAccount &&
                        tr(
                          "A label already exists. Choose how much to credit back to the account (on the next invoice if this one is already invoiced). The DHL shipment is NOT cancelled automatically: handle that with DHL.",
                          "Une étiquette existe déjà. Choisissez le montant à créditer au compte (sur la prochaine facture si celle-ci est déjà facturée). L'envoi DHL n'est PAS annulé automatiquement : réglez cela avec DHL."
                        )}
                      {shipment.status === "label_ready" && !onAccount &&
                        tr(
                          "A label already exists. Choose how much to refund. The DHL shipment is NOT cancelled automatically: handle that with DHL.",
                          "Une étiquette existe déjà. Choisissez le montant à rembourser. L'envoi DHL n'est PAS annulé automatiquement : réglez cela avec DHL."
                        )}
                      {canRetryRefund && tr("The booking is already cancelled; this repeats the failed refund.", "La réservation est déjà annulée; ceci répète le remboursement échoué.")}
                    </p>
                    <textarea className={adminInput} rows={2} placeholder={tr("Reason", "Motif")} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
                    {shipment.status === "label_ready" && (
                      <label className="block space-y-1">
                        <span className="text-xs font-bold text-slate-700">
                          {onAccount ? tr("Credit amount (CAD)", "Montant à créditer (CAD)") : tr("Refund amount (CAD)", "Montant à rembourser (CAD)")} · {tr("up to", "jusqu'à")} {m(left)}
                        </span>
                        <input className={adminInput} value={refund} onChange={(e) => setRefund(e.target.value)} inputMode="decimal" />
                      </label>
                    )}
                    <div className="flex gap-2">
                      <button type="button" onClick={cancel} disabled={!!busy} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#D21F27] text-white text-xs font-bold disabled:opacity-60 cursor-pointer">
                        {busy === "cancel" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {canRetryRefund ? tr("Retry refund", "Réessayer le remboursement") : tr("Confirm cancellation", "Confirmer l'annulation")}
                      </button>
                      <button type="button" onClick={() => setShowCancel(false)} className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer">
                        {tr("Back", "Retour")}
                      </button>
                    </div>
                  </div>
                )}
              </section>
            )}

            {p && (
              <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                <h2 className="font-bold text-[#0B2545] text-sm">
                  {tr("Price breakdown", "Détail du prix")} <span className="ml-1 px-1.5 py-0.5 rounded bg-slate-900 text-white text-[9px] uppercase tracking-wide">{tr("staff only", "personnel seulement")}</span>
                </h2>
                {p.belowCost && (
                  <p role="alert" className="flex gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    {tr("Below cost", "Sous le coût")}
                  </p>
                )}
                <dl className="text-sm divide-y divide-slate-100">
                  {(
                    [
                      [tr("DHL account rate", "Tarif de compte DHL"), m(p.account.totalCents)],
                      [tr("DHL public price", "Prix public DHL"), m(p.publicList.totalCents)],
                      [tr("Public price source", "Source du prix public"), p.publicSource === "carrier" ? "DHL" : tr(`Rebuilt (contract discount ${p.dhlContractDiscountPct}%)`, `Reconstruit (rabais du contrat ${p.dhlContractDiscountPct} %)`)],
                      [tr("Client discount", "Rabais client"), `${p.clientDiscountPct}% = −${m(p.discountCents)}`],
                      ...(p.pickupFeeCents > 0 ? [[tr("Pickup fee", "Frais de ramassage"), m(p.pickupFeeCents)] as [string, string]] : []),
                      [tr("Client price", "Prix client"), m(p.client.totalCents)],
                      [tr("Profit", "Profit"), m(p.profitCents)],
                    ] as [string, string][]
                  ).map(([k, v]) => (
                    <div key={k} className="py-2 flex justify-between gap-3">
                      <dt className="text-slate-500">{k}</dt>
                      <dd className={`font-semibold text-right ${k === tr("Profit", "Profit") ? (p.profitCents < 0 ? "text-red-600" : "text-emerald-700") : "text-slate-800"}`}>{v}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            <section className="bg-white rounded-2xl border border-slate-200 p-5">
              <h2 className="font-bold text-[#0B2545] text-sm mb-2">{tr("History", "Historique")}</h2>
              <ul className="text-xs divide-y divide-slate-100">
                {[...shipment.statusHistory].reverse().map((h, i) => (
                  <li key={i} className="py-2 flex justify-between gap-3">
                    <span className="flex flex-col gap-0.5">
                      <ShipmentStatusBadge status={h.status} />
                      {h.note && <span className="text-slate-500">{h.note}</span>}
                    </span>
                    <span className="text-slate-500 whitespace-nowrap">{formatDate(h.at, language)}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>
    );
  };

  return (
    <PermissionGuard module="express">
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0B2545]">Transimex Express</h1>
        </div>
        <ExpressAdminTabs />
        <Link href="/admin/express/shipments" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900">
          <ArrowLeft className="w-3.5 h-3.5" />
          {tr("Back to shipments", "Retour aux envois")}
        </Link>
        {body()}
        {toast && (
          <div role="status" className={`fixed bottom-6 right-6 z-50 max-w-sm px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white ${toast.error ? "bg-red-600" : "bg-emerald-600"}`}>
            {toast.text}
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}

"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle2, Download, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { formatCad } from "@/lib/shipping/core/money";
import { COUNTRIES } from "@/lib/data/countries";
import type { ClientShipmentDTO } from "@/lib/express/shipmentDto";
import type { ClientQuoteDTO } from "@/lib/express/quoteDto";
import { useExpressAccount } from "@/components/express/useExpressAccount";

const STATUS_STYLE: Record<string, string> = {
  awaiting_payment: "bg-amber-50 text-amber-700 border-amber-200",
  paid: "bg-blue-50 text-blue-700 border-blue-200",
  label_ready: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-slate-100 text-slate-600 border-slate-300",
};

const TRACKING_STYLE: Record<string, string> = {
  pre_transit: "bg-emerald-50 text-emerald-700 border-emerald-200",
  in_transit: "bg-blue-50 text-blue-700 border-blue-200",
  out_for_delivery: "bg-blue-50 text-blue-700 border-blue-200",
  delivered: "bg-emerald-100 text-emerald-800 border-emerald-300",
  exception: "bg-amber-50 text-amber-800 border-amber-300",
  returned: "bg-slate-100 text-slate-600 border-slate-300",
};

/** After returning from the payment page, check for the confirmation this often, for at most this long. */
const POLL_MS = 2000;
const POLL_MAX = 30;

function Detail() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const justBooked = params.get("booked") === "1";
  const returnedPaid = params.get("paid") === "1";
  const returnedCancelled = params.get("cancelled") === "1";
  const { t, language } = useLanguage();
  const s = t.express.shipments;
  const book = t.express.book;
  const pt = t.express.partner;
  const { account } = useExpressAccount();
  const isCustomer = account?.type === "customer";
  const [shipment, setShipment] = useState<ClientShipmentDTO | null>(null);
  const [quote, setQuote] = useState<ClientQuoteDTO | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [action, setAction] = useState<"" | "pay" | "cancel">("");
  const [actionError, setActionError] = useState("");
  const [polls, setPolls] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/express/shipments/${id}`);
      const data = await res.json().catch(() => ({}));
      if (res.status === 404) return setState("missing");
      if (!res.ok || !data.success) return setState("error");
      setShipment(data.shipment);
      setQuote(data.quote);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Coming back from the payment page: the webhook, not this redirect, confirms payment, so keep checking.
  const status = shipment?.status;
  const waiting = returnedPaid && (status === "awaiting_payment" || status === "paid");
  useEffect(() => {
    if (!waiting || polls >= POLL_MAX) return;
    const timer = setTimeout(() => {
      setPolls((n) => n + 1);
      load();
    }, POLL_MS);
    return () => clearTimeout(timer);
  }, [waiting, polls, load]);

  const pay = async () => {
    setAction("pay");
    setActionError("");
    try {
      const res = await fetch(`/api/express/shipments/${id}/checkout`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setActionError(data.code === "payments_unavailable" ? s.payUnavailable : s.payError);
    } catch {
      setActionError(s.payError);
    }
    setAction("");
  };

  const cancel = async () => {
    if (!window.confirm(s.cancelConfirm)) return;
    setAction("cancel");
    setActionError("");
    try {
      const res = await fetch(`/api/express/shipments/${id}/cancel`, { method: "POST" });
      if (res.ok) {
        await load();
      } else {
        setActionError(s.cancelError);
      }
    } catch {
      setActionError(s.cancelError);
    }
    setAction("");
  };

  const country = (code: string) => {
    const c = COUNTRIES.find((x) => x.code === code);
    return c ? (language === "fr" ? c.nameFr : c.name) : code;
  };
  const m = (c: number) => formatCad(c, language);
  const date = (iso: string | null) => (iso ? new Intl.DateTimeFormat(language === "fr" ? "fr-CA" : "en-CA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso)) : "");

  const back = (
    <Link href="/express/shipments" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900">
      <ArrowLeft className="w-3.5 h-3.5" />
      {s.back}
    </Link>
  );

  if (state === "loading") {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500">
        <RefreshCw className="w-4 h-4 animate-spin" />
        {t.express.loading}
      </div>
    );
  }
  if (state !== "ready" || !shipment) {
    return (
      <div className="space-y-4">
        {back}
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-600">{state === "missing" ? s.notFound : t.express.loadError}</div>
      </div>
    );
  }

  const addressBlock = (a: ClientShipmentDTO["shipper"]) => (
    <div className="text-sm text-slate-700 leading-relaxed">
      <p className="font-semibold text-slate-900">{a.name}</p>
      {a.company && <p>{a.company}</p>}
      <p>{a.line1}</p>
      {a.line2 && <p>{a.line2}</p>}
      <p>
        {a.city}
        {a.region ? `, ${a.region}` : ""} {a.postalCode}
      </p>
      <p>{country(a.countryCode)}</p>
      <p className="text-slate-500">{a.phone}</p>
    </div>
  );

  const pendingCheck = returnedPaid && shipment.status === "awaiting_payment" && polls < POLL_MAX;

  return (
    <div className="space-y-5">
      {back}

      {justBooked && shipment.status === "awaiting_payment" && (
        <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex gap-3 text-emerald-900">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">{s.booked}</p>
            <p className="text-sm">{s.bookedBody}</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold text-[#0B2545] font-mono">{shipment.reference}</h1>
        {shipment.contentType === "documents" && <span className="px-2.5 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-xs font-bold text-amber-800">{book.typeDocuments}</span>}
        {shipment.status === "label_ready" && shipment.tracking ? (
          <span className={`px-2.5 py-0.5 rounded-full border text-xs font-bold ${TRACKING_STYLE[shipment.tracking.status] || STATUS_STYLE.label_ready}`}>
            {t.express.trackingStatus[shipment.tracking.status as keyof typeof t.express.trackingStatus]}
          </span>
        ) : (
          <span className={`px-2.5 py-0.5 rounded-full border text-xs font-bold ${STATUS_STYLE[shipment.status]}`}>{isCustomer && shipment.status === "paid" ? pt.customerStatusPaid : t.express.shipmentStatus[shipment.status]}</span>
        )}
      </div>

      {isCustomer && <p className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">{pt.customerNote}</p>}

      {shipment.billing && (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          {shipment.billing.invoiceId ? (
            <>
              {t.express.invoices.shipmentOnInvoice} ·{" "}
              <Link href={`/express/invoices/${shipment.billing.invoiceId}`} className="font-bold text-[#0B2545] underline">
                {t.express.invoices.viewInvoice}
              </Link>
            </>
          ) : (
            t.express.invoices.shipmentNextInvoice
          )}
        </p>
      )}

      {shipment.partner && (
        <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2">
          <h2 className="font-bold text-[#0B2545] text-sm">{shipment.partner.customerName}</h2>
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm">
            <div className="flex justify-between px-4 py-2.5">
              <span className="text-slate-600">{pt.youPay}</span>
              <span className="font-semibold tabular-nums">{m(shipment.totalCents)}</span>
            </div>
            <div className="flex justify-between px-4 py-2.5 text-emerald-700">
              <span>{pt.yourMarkup}</span>
              <span className="font-semibold tabular-nums">+{m(shipment.partner.markupCents)}</span>
            </div>
            <div className="flex justify-between px-4 py-3 bg-slate-50 font-extrabold text-[#0B2545]">
              <span>{pt.customerPrice}</span>
              <span className="tabular-nums">{m(shipment.partner.customerTotalCents)}</span>
            </div>
          </div>
        </section>
      )}

      {shipment.tracking?.status === "exception" && (
        <p role="status" className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {s.trackingExceptionNote}
        </p>
      )}

      {/* Payment state */}
      {pendingCheck && !isCustomer && (
        <p role="status" className="flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-900">
          <Loader2 className="w-4 h-4 animate-spin" />
          {s.paymentPendingNote}
        </p>
      )}
      {shipment.status === "paid" && !isCustomer && (
        <p role="status" className="flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-900">
          {returnedPaid && polls < POLL_MAX && <Loader2 className="w-4 h-4 animate-spin" />}
          {returnedPaid && polls < POLL_MAX ? s.paidProcessing : s.paidWaiting}
        </p>
      )}
      {shipment.status === "awaiting_payment" && !pendingCheck && !isCustomer && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900 space-y-3">
          <p>{returnedCancelled ? s.paymentNotCompleted : s.awaitingNote}</p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={pay}
              disabled={action !== ""}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D21F27] hover:bg-[#b91a21] disabled:opacity-60 text-white text-sm font-bold cursor-pointer"
            >
              {action === "pay" && <Loader2 className="w-4 h-4 animate-spin" />}
              {action === "pay" ? s.paying : `${s.payNow} · ${m(shipment.totalCents)}`}
            </button>
            <button
              type="button"
              onClick={cancel}
              disabled={action !== ""}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm font-bold disabled:opacity-60 cursor-pointer"
            >
              {action === "cancel" ? s.cancelling : s.cancelBooking}
            </button>
          </div>
        </div>
      )}
      {actionError && (
        <p role="alert" className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-semibold text-red-700">
          <AlertTriangle className="w-4 h-4" />
          {actionError}
        </p>
      )}
      {shipment.status === "cancelled" && (
        <div className="rounded-xl bg-slate-100 border border-slate-300 px-4 py-3 text-sm text-slate-700 space-y-1">
          <p className="font-semibold">{s.cancelledBanner}</p>
          {shipment.refundedCents > 0 && (
            <p>
              {s.refundIssued}: <b>{m(shipment.refundedCents)}</b>. {s.refundNote}
            </p>
          )}
        </div>
      )}

      {/* Label and tracking */}
      {shipment.labelReady && (
        <section className="bg-white border border-emerald-200 rounded-2xl p-5 space-y-3">
          <h2 className="font-bold text-[#0B2545] text-sm">{s.labelTitle}</h2>
          <p className="text-sm text-slate-600">{s.labelHelp}</p>
          <a
            href={`/api/express/shipments/${shipment.id}/label`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0B2545] hover:bg-slate-800 text-white text-sm font-bold"
          >
            <Download className="w-4 h-4" />
            {s.downloadLabel}
          </a>
        </section>
      )}

      {shipment.labelReady && shipment.invoice && (
        <section className={`rounded-2xl border p-5 space-y-3 bg-white ${shipment.invoice.paperless ? "border-slate-200" : "border-amber-300"}`}>
          <h2 className="font-bold text-[#0B2545] text-sm">{s.invoiceTitle}</h2>
          <p className="text-sm text-slate-600">{shipment.invoice.paperless ? s.invoicePaperless : s.invoicePrint}</p>
          <a
            href={`/api/express/shipments/${shipment.id}/invoice`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-sm font-bold"
          >
            <Download className="w-4 h-4" />
            {s.downloadInvoice}
          </a>
        </section>
      )}

      <div className="grid md:grid-cols-2 gap-5">
        <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2">
          <h2 className="font-bold text-[#0B2545] text-sm">{s.sender}</h2>
          {addressBlock(shipment.shipper)}
        </section>
        <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2">
          <h2 className="font-bold text-[#0B2545] text-sm">{s.recipient}</h2>
          {addressBlock(shipment.recipient)}
        </section>
      </div>

      <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
        <h2 className="font-bold text-[#0B2545] text-sm">{s.details}</h2>
        <dl className="text-sm divide-y divide-slate-100">
          {[
            [book.pickupLabel, shipment.pickupRequested ? book.pickupYes : book.pickupNo],
            ...(shipment.contentType === "documents" ? [[book.docsDescription, shipment.contentDescription]] : [[book.dutiesLabel, shipment.dutiesPayer === "recipient" ? book.dutiesRecipientShort : book.dutiesSenderShort]]),
            [s.parcels, shipment.parcels.map((p) => `${p.weightKg} kg · ${p.lengthCm}×${p.widthCm}×${p.heightCm} cm`).join("  |  ")],
            ...(shipment.contentType === "documents" ? [] : [[book.declaredTotal, m(shipment.declaredValueCents)]]),
            ...(shipment.paidAt ? [[s.paidOn, date(shipment.paidAt)]] : []),
          ].map(([k, v]) => (
            <div key={k} className="py-2 grid sm:grid-cols-3 gap-1">
              <dt className="text-slate-500">{k}</dt>
              <dd className="sm:col-span-2 font-semibold text-slate-800">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {shipment.contentType !== "documents" && (
      <section className="bg-white border border-slate-200 rounded-2xl p-5">
        <h2 className="font-bold text-[#0B2545] text-sm mb-3">{s.items}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-100">
                <th className="text-left py-2 pr-3 font-bold">{book.itemDescription}</th>
                <th className="text-left py-2 pr-3 font-bold">{book.hsCode}</th>
                <th className="text-right py-2 pr-3 font-bold">{book.quantity}</th>
                <th className="text-right py-2 pr-3 font-bold">{book.unitValue}</th>
                <th className="text-left py-2 pr-3 font-bold">{book.origin}</th>
                <th className="text-left py-2 font-bold">{book.reason}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shipment.items.map((i, idx) => (
                <tr key={idx}>
                  <td className="py-2 pr-3">{i.description}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{i.hsCode}</td>
                  <td className="py-2 pr-3 text-right">{i.quantity}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{m(i.unitValueCents)}</td>
                  <td className="py-2 pr-3">{country(i.countryOfOrigin)}</td>
                  <td className="py-2">{book.reasons[i.exportReason as keyof typeof book.reasons]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      )}

      <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
        <h2 className="font-bold text-[#0B2545] text-sm">{s.priceTitle}</h2>
        {quote && !isCustomer ? (
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm">
            <div className="flex justify-between px-4 py-2.5">
              <span className="text-slate-600">{book.publicPrice}</span>
              <span className="font-semibold tabular-nums">{m(quote.price.publicBaseFreightCents)}</span>
            </div>
            <div className="flex justify-between px-4 py-2.5 text-emerald-700">
              <span>
                {book.yourDiscount} ({quote.price.discountPct}%)
              </span>
              <span className="font-semibold tabular-nums">−{m(quote.price.discountCents)}</span>
            </div>
            {quote.price.surcharges.map((sc) => (
              <div key={sc.code} className="flex justify-between px-4 py-2.5">
                <span className="text-slate-600">{sc.name}</span>
                <span className="font-semibold tabular-nums">{m(sc.amountCents)}</span>
              </div>
            ))}
            <div className="flex justify-between px-4 py-3 bg-slate-50 font-extrabold text-[#0B2545]">
              <span>{book.total}</span>
              <span className="tabular-nums">{m(shipment.totalCents)}</span>
            </div>
          </div>
        ) : (
          <p className="font-bold text-[#0B2545]">{m(shipment.totalCents)}</p>
        )}
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2">
        <h2 className="font-bold text-[#0B2545] text-sm">{s.trackingTitle}</h2>
        {shipment.trackingNumber ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-mono font-bold">{shipment.trackingNumber}</span>
            {shipment.trackingUrl && (
              <a href={shipment.trackingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-[#0B2545] underline">
                {s.track}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-500">{s.trackingNone}</p>
        )}
        {shipment.trackingNumber && !shipment.tracking && shipment.status === "label_ready" && <p className="text-sm text-slate-500">{s.trackingWaiting}</p>}
        {shipment.tracking && (
          <>
            <ol className="mt-2 border-l-2 border-slate-200 ml-1.5 space-y-3">
              {shipment.tracking.events.map((e, i) => (
                <li key={i} className="relative pl-4">
                  <span className={`absolute -left-[7px] top-1.5 w-3 h-3 rounded-full border-2 border-white ${i === 0 ? "bg-[#D21F27]" : "bg-slate-300"}`} />
                  <p className={`text-sm ${i === 0 ? "font-bold text-[#0B2545]" : "font-semibold text-slate-700"}`}>{e.description}</p>
                  <p className="text-xs text-slate-500">
                    {date(e.at)}
                    {e.location ? ` · ${e.location}` : ""}
                  </p>
                </li>
              ))}
            </ol>
            {shipment.tracking.lastCheckedAt && (
              <p className="text-xs text-slate-400">
                {s.trackingUpdated}: {date(shipment.tracking.lastCheckedAt)}
              </p>
            )}
          </>
        )}
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-5">
        <h2 className="font-bold text-[#0B2545] text-sm mb-2">{s.history}</h2>
        <ul className="text-sm divide-y divide-slate-100">
          {[...shipment.statusHistory].reverse().map((h, i) => (
            <li key={i} className="py-2 flex justify-between gap-3">
              <span className="font-semibold text-slate-800">{t.express.shipmentStatus[h.status as keyof typeof t.express.shipmentStatus]}</span>
              <span className="text-slate-500">{date(h.at)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default function ExpressShipmentDetailPage() {
  return (
    <Suspense fallback={null}>
      <Detail />
    </Suspense>
  );
}

"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, Printer, RefreshCw } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { formatCad } from "@/lib/shipping/core/money";
import type { ClientInvoiceDTO } from "@/lib/express/invoiceDto";

const STATUS_STYLE: Record<string, string> = {
  issued: "bg-amber-50 text-amber-700 border-amber-200",
  overdue: "bg-red-50 text-red-700 border-red-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  void: "bg-slate-100 text-slate-600 border-slate-300",
};

/** After returning from the payment page, check for the confirmation this often, for at most this long. */
const POLL_MS = 2000;
const POLL_MAX = 30;

function Detail() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const returnedPaid = params.get("paid") === "1";
  const returnedCancelled = params.get("cancelled") === "1";
  const { t, language } = useLanguage();
  const v = t.express.invoices;
  const [invoice, setInvoice] = useState<ClientInvoiceDTO | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const [polls, setPolls] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/express/invoices/${id}`);
      const data = await res.json().catch(() => ({}));
      if (res.status === 404) return setState("missing");
      if (!res.ok || !data.success) return setState("error");
      setInvoice(data.invoice);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Asks the server to check with the payment provider whether this invoice was paid, so it does not depend on the webhook.
  const syncPayment = useCallback(async () => {
    try {
      await fetch(`/api/express/invoices/${id}/sync-payment`, { method: "POST" });
    } catch {
      /* the webhook can still confirm it */
    }
  }, [id]);

  // Opening an invoice that still says unpaid checks once, so an earlier payment is picked up.
  const checkedOnce = useRef(false);
  useEffect(() => {
    if (!invoice?.canPay || checkedOnce.current) return;
    checkedOnce.current = true;
    syncPayment().then(load);
  }, [invoice?.canPay, syncPayment, load]);

  // Back from the payment page: keep checking for a short while.
  const waiting = returnedPaid && invoice?.canPay === true && polls < POLL_MAX;
  useEffect(() => {
    if (!waiting) return;
    const timer = setTimeout(async () => {
      setPolls((n) => n + 1);
      await syncPayment();
      load();
    }, POLL_MS);
    return () => clearTimeout(timer);
  }, [waiting, polls, load, syncPayment]);

  const pay = async () => {
    setPaying(true);
    setPayError("");
    try {
      const res = await fetch(`/api/express/invoices/${id}/checkout`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setPayError(data.code === "payments_unavailable" ? v.payUnavailable : v.payError);
    } catch {
      setPayError(v.payError);
    }
    setPaying(false);
  };

  const m = (c: number) => formatCad(c, language);
  const date = (iso: string | null) => (iso ? new Intl.DateTimeFormat(language === "fr" ? "fr-CA" : "en-CA", { dateStyle: "long" }).format(new Date(iso)) : "");

  const back = (
    <Link href="/express/invoices" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 print:hidden">
      <ArrowLeft className="h-3.5 w-3.5" />
      {v.back}
    </Link>
  );

  if (state === "loading") {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500">
        <RefreshCw className="h-4 w-4 animate-spin" />
        {t.express.loading}
      </div>
    );
  }
  if (state !== "ready" || !invoice) {
    return (
      <div className="space-y-4">
        {back}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">{state === "missing" ? v.notFound : t.express.loadError}</div>
      </div>
    );
  }

  const unpaid = invoice.canPay;

  return (
    <div className="space-y-5">
      {back}

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl font-extrabold text-[#0B2545]">{invoice.number}</h1>
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLE[invoice.status]}`}>{v.status[invoice.status]}</span>
        <button type="button" onClick={() => window.print()} className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 cursor-pointer print:hidden">
          <Printer className="h-3.5 w-3.5" />
          {v.print}
        </button>
      </div>

      {waiting && (
        <p role="status" className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 print:hidden">
          <Loader2 className="h-4 w-4 animate-spin" />
          {v.paymentPendingNote}
        </p>
      )}
      {invoice.status === "paid" && returnedPaid && (
        <p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 print:hidden">
          <CheckCircle2 className="h-4 w-4" />
          {v.status.paid}
        </p>
      )}
      {unpaid && !waiting && (
        <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 print:hidden">
          {returnedCancelled && <p>{v.paymentNotCompleted}</p>}
          <button
            type="button"
            onClick={pay}
            disabled={paying}
            className="inline-flex items-center gap-2 rounded-xl bg-[#D21F27] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#b91a21] disabled:opacity-60 cursor-pointer"
          >
            {paying && <Loader2 className="h-4 w-4 animate-spin" />}
            {paying ? v.paying : `${v.payNow} · ${m(invoice.totalCents)}`}
          </button>
        </div>
      )}
      {payError && (
        <p role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 print:hidden">
          <AlertTriangle className="h-4 w-4" />
          {payError}
        </p>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4">
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-slate-500">{v.issuedOn}</dt>
            <dd className="font-semibold text-slate-800">{date(invoice.issuedAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">{v.dueOn}</dt>
            <dd className="font-semibold text-slate-800">{date(invoice.dueAt)}</dd>
          </div>
          {invoice.paidAt && (
            <div>
              <dt className="text-xs text-slate-500">{v.paidOn}</dt>
              <dd className="font-semibold text-slate-800">
                {date(invoice.paidAt)} · {invoice.paidMethod === "manual" ? v.paidManual : v.paidByCard}
              </dd>
            </div>
          )}
        </dl>

        <div>
          <h2 className="mb-2 text-sm font-bold text-[#0B2545]">{v.lines}</h2>
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm">
            {invoice.lines.map((l, i) => (
              <div key={i} className="flex items-start justify-between gap-4 px-4 py-2.5">
                <div className="min-w-0">
                  {l.kind === "shipment" && l.shipmentId ? (
                    <Link href={`/express/shipments/${l.shipmentId}`} className="font-mono text-xs font-bold text-[#0B2545] hover:underline">
                      {l.reference}
                    </Link>
                  ) : (
                    <span className="text-xs font-bold text-slate-600">{v.creditLine}</span>
                  )}
                  <p className="text-xs text-slate-500">{l.description}</p>
                </div>
                <span className={`whitespace-nowrap font-semibold tabular-nums ${l.amountCents < 0 ? "text-emerald-700" : ""}`}>{l.amountCents < 0 ? `−${m(-l.amountCents)}` : m(l.amountCents)}</span>
              </div>
            ))}
            <div className="flex justify-between bg-slate-50 px-4 py-3 font-extrabold text-[#0B2545]">
              <span>{v.total}</span>
              <span className="tabular-nums">{m(invoice.totalCents)}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function ExpressInvoiceDetailPage() {
  return (
    <Suspense fallback={null}>
      <Detail />
    </Suspense>
  );
}

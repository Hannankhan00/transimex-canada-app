"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, ExternalLink, RefreshCw } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { formatCad } from "@/lib/shipping/core/money";
import { COUNTRIES } from "@/lib/data/countries";
import type { ClientShipmentDTO } from "@/lib/express/shipmentDto";
import type { ClientQuoteDTO } from "@/lib/express/quoteDto";

const STATUS_STYLE: Record<string, string> = {
  awaiting_payment: "bg-amber-50 text-amber-700 border-amber-200",
  paid: "bg-blue-50 text-blue-700 border-blue-200",
  label_ready: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-slate-100 text-slate-600 border-slate-300",
};

function Detail() {
  const { id } = useParams<{ id: string }>();
  const justBooked = useSearchParams().get("booked") === "1";
  const { t, language } = useLanguage();
  const s = t.express.shipments;
  const book = t.express.book;
  const [shipment, setShipment] = useState<ClientShipmentDTO | null>(null);
  const [quote, setQuote] = useState<ClientQuoteDTO | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");

  useEffect(() => {
    let alive = true;
    fetch(`/api/express/shipments/${id}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!alive) return;
        if (res.status === 404) return setState("missing");
        if (!res.ok || !data.success) return setState("error");
        setShipment(data.shipment);
        setQuote(data.quote);
        setState("ready");
      })
      .catch(() => alive && setState("error"));
    return () => {
      alive = false;
    };
  }, [id]);

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

  return (
    <div className="space-y-5">
      {back}

      {justBooked && (
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
        <span className={`px-2.5 py-0.5 rounded-full border text-xs font-bold ${STATUS_STYLE[shipment.status]}`}>{t.express.shipmentStatus[shipment.status]}</span>
      </div>

      {shipment.status === "awaiting_payment" && (
        <p className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">{s.awaitingNote}</p>
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
            [book.dutiesLabel, shipment.dutiesPayer === "recipient" ? book.dutiesRecipientShort : book.dutiesSenderShort],
            [s.parcels, shipment.parcels.map((p) => `${p.weightKg} kg · ${p.lengthCm}×${p.widthCm}×${p.heightCm} cm`).join("  |  ")],
            [book.declaredTotal, m(shipment.declaredValueCents)],
          ].map(([k, v]) => (
            <div key={k} className="py-2 grid sm:grid-cols-3 gap-1">
              <dt className="text-slate-500">{k}</dt>
              <dd className="sm:col-span-2 font-semibold text-slate-800">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

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

      <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
        <h2 className="font-bold text-[#0B2545] text-sm">{s.priceTitle}</h2>
        {quote ? (
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

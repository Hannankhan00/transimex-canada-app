"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, CreditCard, FileText, Package, PackagePlus, Percent, RefreshCw, Tag } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { formatCad } from "@/lib/shipping/core/money";
import { findCountry } from "@/lib/promotionTypes";
import { useExpressAccount } from "@/components/express/useExpressAccount";
import ExpressStatusBanner from "@/components/express/ExpressStatusBanner";
import type { ClientShipmentDTO } from "@/lib/express/shipmentDto";

const STATUS_STYLE: Record<string, string> = {
  awaiting_payment: "bg-amber-50 text-amber-700 border-amber-200",
  paid: "bg-blue-50 text-blue-700 border-blue-200",
  label_ready: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-slate-100 text-slate-600 border-slate-300",
};

const card = "rounded-2xl border border-slate-200 bg-white shadow-xs";

function Stat({ icon: Icon, label, value, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; tone: string }) {
  return (
    <div className={`${card} flex items-center gap-4 p-5`}>
      <div className={`grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl ${tone}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-extrabold leading-none text-[#0B2545]">{value}</p>
        <p className="mt-1.5 truncate text-xs font-semibold text-slate-500">{label}</p>
      </div>
    </div>
  );
}

export default function ExpressOverviewPage() {
  const { t, language } = useLanguage();
  const { account, loading, error, reload } = useExpressAccount();
  const o = t.express.overview;
  const [shipments, setShipments] = useState<ClientShipmentDTO[] | null>(null);

  const router = useRouter();

  // Someone with no Express account goes to the application popup in the client portal, not to an empty overview.
  const mustApply = !loading && !error && !account;
  useEffect(() => {
    if (mustApply) router.replace("/dashboard?express=apply");
  }, [mustApply, router]);

  const active = account?.status === "active";
  useEffect(() => {
    if (!active) return;
    let alive = true;
    fetch("/api/express/shipments")
      .then((r) => r.json())
      .then((d) => alive && d.success && setShipments(d.shipments))
      .catch(() => alive && setShipments([]));
    return () => {
      alive = false;
    };
  }, [active]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-slate-500">
        <RefreshCw className="h-4 w-4 animate-spin" />
        {t.express.loading}
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${card} space-y-3 p-8 text-center`}>
        <p className="text-sm font-semibold text-red-600">{t.express.loadError}</p>
        <button type="button" onClick={reload} className="cursor-pointer rounded-xl bg-[#0B2545] px-4 py-2 text-xs font-bold text-white">
          {t.express.retry}
        </button>
      </div>
    );
  }

  // Not applied yet: the redirect above is on its way.
  if (!account) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-slate-500">
        <RefreshCw className="h-4 w-4 animate-spin" />
        {t.express.loading}
      </div>
    );
  }

  // ---- Has an account ----
  const firstName = (account.contactName || "").trim().split(/\s+/)[0];
  const country = findCountry(account.country);
  const countryLabel = country ? (language === "fr" ? country.nameFr : country.name) : account.country;
  const count = (status: string) => (shipments ? shipments.filter((s) => s.status === status).length : 0);

  const rows: [string, string | null][] = [
    [o.accountType, t.express.accountTypes[account.type]],
    [o.contact, account.contactName],
    [o.phone, account.phone],
    [o.country, countryLabel || null],
    [o.company, account.company?.name || null],
    [o.billing, account.billingModes.length ? account.billingModes.map((m) => t.express.billingModes[m]).join(" + ") : null],
    [o.creditLimit, account.creditLimitCents != null ? formatCad(account.creditLimitCents, language) : null],
    [o.paymentTerms, account.paymentTermsDays != null ? `${account.paymentTermsDays} ${o.days}` : null],
    [
      o.termsAccepted,
      account.termsAcceptedAt ? new Intl.DateTimeFormat(language === "fr" ? "fr-CA" : "en-CA", { dateStyle: "medium" }).format(new Date(account.termsAcceptedAt)) : null,
    ],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold text-[#0B2545]">
              {o.welcome}
              {firstName ? `, ${firstName}` : ""}
            </h1>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : account.status === "pending" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {t.express.status[account.status]}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">{active ? o.activeBody : t.express.overviewIntro}</p>
        </div>
        {active && (
          <Link href="/express/book" className="inline-flex items-center gap-2 rounded-xl bg-[#0B2545] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#12315c]">
            <PackagePlus className="h-4 w-4" />
            {t.express.navBook}
          </Link>
        )}
      </div>

      <ExpressStatusBanner account={account} />

      {active && (
        <div className={`grid gap-4 sm:grid-cols-2 ${account.discountPct != null ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}>
          <Stat icon={Package} label={o.statTotal} value={shipments ? String(shipments.length) : "–"} tone="bg-[#0B2545]/10 text-[#0B2545]" />
          <Stat icon={CreditCard} label={o.statAwaiting} value={shipments ? String(count("awaiting_payment")) : "–"} tone="bg-amber-50 text-amber-600" />
          <Stat icon={CheckCircle2} label={o.statReady} value={shipments ? String(count("label_ready")) : "–"} tone="bg-emerald-50 text-emerald-600" />
          {account.discountPct != null && <Stat icon={Percent} label={o.statDiscount} value={`${account.discountPct}%`} tone="bg-red-50 text-[#D21F27]" />}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        {active && (
          <section className={`${card} lg:col-span-3`}>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="font-bold text-[#0B2545]">{o.recentTitle}</h2>
              <Link href="/express/shipments" className="inline-flex items-center gap-1 text-xs font-bold text-[#D21F27] hover:underline">
                {o.viewAll}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {shipments === null ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-400">
                <RefreshCw className="h-4 w-4 animate-spin" />
              </div>
            ) : shipments.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Package className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mx-auto mt-3 max-w-xs text-sm text-slate-500">{o.noShipments}</p>
                <Link href="/express/book" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#D21F27] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#B91A21]">
                  {t.express.shipments.bookFirst}
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {shipments.slice(0, 5).map((s) => (
                  <li key={s.id}>
                    <Link href={`/express/shipments/${s.id}`} className="flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-slate-50">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-bold text-[#0B2545]">{s.reference}</span>
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[s.status]}`}>{t.express.shipmentStatus[s.status]}</span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {s.recipient.name} · {s.recipient.city}
                        </p>
                      </div>
                      <span className="text-sm font-bold tabular-nums text-slate-800">{formatCad(s.totalCents, language)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <section className={`${card} ${active ? "lg:col-span-2" : "lg:col-span-5"}`}>
          <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
            <FileText className="h-4 w-4 text-slate-400" />
            <h2 className="font-bold text-[#0B2545]">{o.summaryTitle}</h2>
          </div>
          <dl className="divide-y divide-slate-100">
            {rows
              .filter(([, v]) => v)
              .map(([label, value]) => (
                <div key={label} className="grid gap-1 px-6 py-3 text-sm sm:grid-cols-5">
                  <dt className="text-slate-500 sm:col-span-2">{label}</dt>
                  <dd className="break-words font-semibold text-slate-800 sm:col-span-3">{value}</dd>
                </div>
              ))}
          </dl>
          {account.discountPct != null && (
            <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50 px-6 py-3 text-xs text-slate-600">
              <Tag className="h-3.5 w-3.5 text-[#D21F27]" />
              {o.discount}: <b className="text-slate-800">{account.discountPct}%</b>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

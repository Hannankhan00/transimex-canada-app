"use client";

import Link from "next/link";
import { Plane, RefreshCw } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { formatCad } from "@/lib/shipping/core/money";
import { findCountry } from "@/lib/promotionTypes";
import { useExpressAccount } from "@/components/express/useExpressAccount";
import ExpressStatusBanner from "@/components/express/ExpressStatusBanner";

export default function ExpressOverviewPage() {
  const { t, language } = useLanguage();
  const { account, loading, error, reload } = useExpressAccount();
  const o = t.express.overview;

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500">
        <RefreshCw className="w-4 h-4 animate-spin" />
        {t.express.loading}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3">
        <p className="text-sm text-red-600 font-semibold">{t.express.loadError}</p>
        <button
          type="button"
          onClick={reload}
          className="px-4 py-2 rounded-xl bg-[#0B2545] text-white text-xs font-bold cursor-pointer"
        >
          {t.express.retry}
        </button>
      </div>
    );
  }

  const country = account ? findCountry(account.country) : null;
  const countryLabel = country ? (language === "fr" ? country.nameFr : country.name) : account?.country;

  const rows: [string, string | null][] = account
    ? [
        [o.accountType, t.express.accountTypes[account.type]],
        [o.contact, account.contactName],
        [o.phone, account.phone],
        [o.country, countryLabel || null],
        [o.company, account.company?.name || null],
        [o.discount, account.discountPct != null ? `${account.discountPct}%` : null],
        [o.billing, account.billingModes.length ? account.billingModes.map((m) => t.express.billingModes[m]).join(" + ") : null],
        [o.creditLimit, account.creditLimitCents != null ? formatCad(account.creditLimitCents, language) : null],
        [o.paymentTerms, account.paymentTermsDays != null ? `${account.paymentTermsDays} ${o.days}` : null],
        [
          o.termsAccepted,
          account.termsAcceptedAt
            ? new Intl.DateTimeFormat(language === "fr" ? "fr-CA" : "en-CA", { dateStyle: "medium" }).format(new Date(account.termsAcceptedAt))
            : null,
        ],
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#0B2545]">{t.express.overviewTitle}</h1>
        <p className="mt-1 text-sm text-slate-600 max-w-2xl">{t.express.overviewIntro}</p>
      </div>

      {!account ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-xs">
          <div className="w-12 h-12 mx-auto rounded-xl bg-[#0B2545]/5 flex items-center justify-center">
            <Plane className="w-6 h-6 text-[#0B2545]" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-[#0B2545]">{o.applyTitle}</h2>
          <p className="mt-1 text-sm text-slate-600 max-w-md mx-auto">{o.applyBody}</p>
          <Link
            href="/express/apply"
            className="inline-block mt-5 px-5 py-2.5 rounded-xl bg-[#D21F27] hover:bg-[#b91a21] text-white text-sm font-bold transition"
          >
            {o.applyCta}
          </Link>
        </div>
      ) : (
        <>
          <ExpressStatusBanner account={account} />

          {account.status === "active" && (
            <div className="bg-white border border-emerald-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-bold text-emerald-800">{o.activeTitle}</h2>
                <p className="text-sm text-slate-600 mt-0.5">{o.activeBody}</p>
              </div>
              <Link
                href="/express/book"
                className="px-5 py-2.5 rounded-xl bg-[#0B2545] hover:bg-slate-800 text-white text-sm font-bold text-center transition"
              >
                {o.bookCta}
              </Link>
            </div>
          )}

          <section className="bg-white border border-slate-200 rounded-2xl shadow-xs">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-[#0B2545]">{o.summaryTitle}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                {t.express.status[account.status]}
              </span>
            </div>
            <dl className="divide-y divide-slate-100">
              {rows
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label} className="px-6 py-3 grid sm:grid-cols-3 gap-1 text-sm">
                    <dt className="text-slate-500">{label}</dt>
                    <dd className="sm:col-span-2 font-semibold text-slate-800">{value}</dd>
                  </div>
                ))}
            </dl>
          </section>
        </>
      )}
    </div>
  );
}

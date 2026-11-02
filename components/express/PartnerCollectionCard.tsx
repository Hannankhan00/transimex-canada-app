"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Banknote, CreditCard, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { formatCad } from "@/lib/shipping/core/money";
import PartnerStripeCard from "@/components/express/PartnerStripeCard";

type Collection = "stripe" | "transimex";

interface Snapshot {
  collection: Collection;
  summary: { withdrawableCents: number; pendingCents: number };
}

/**
 * Where a partner's customers pay. Either the partner's own Stripe account (the money goes straight to them), or
 * Transimex (the partner needs no Stripe account: Transimex keeps their earnings in a balance and pays them out).
 */
export default function PartnerCollectionCard() {
  const { language } = useLanguage();
  const tr = (en: string, fr: string) => (language === "fr" ? fr : en);
  const [data, setData] = useState<Snapshot | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/express/partner/earnings");
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "error");
      setData({ collection: body.collection, summary: body.summary });
    } catch {
      setError(tr("Could not load your payment setup.", "Impossible de charger votre configuration de paiement."));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const choose = async (collection: Collection) => {
    if (saving || data?.collection === collection) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/express/partner/collection", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ collection }) });
      if (!res.ok) throw new Error();
      await load();
    } catch {
      setError(tr("Could not save your choice. Please try again.", "Impossible d'enregistrer votre choix. Veuillez réessayer."));
    } finally {
      setSaving(false);
    }
  };

  if (!data && !error) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
      </div>
    );
  }

  const options: { value: Collection; icon: React.ReactNode; title: string; body: string }[] = [
    {
      value: "stripe",
      icon: <CreditCard className="h-5 w-5" />,
      title: tr("My own Stripe account", "Mon propre compte Stripe"),
      body: tr("Your customers pay on your Stripe account. You get your share straight away and pay Stripe's card fee. Transimex's share is taken automatically.", "Vos clients paient sur votre compte Stripe. Vous recevez votre part tout de suite et payez les frais de carte de Stripe. La part de Transimex est prélevée automatiquement."),
    },
    {
      value: "transimex",
      icon: <Banknote className="h-5 w-5" />,
      title: tr("Transimex collects for me", "Transimex encaisse pour moi"),
      body: tr("No Stripe account needed. Your customers pay Transimex, we keep your earnings in your balance, and we pay you when you ask. Stripe's card fee is taken from your earnings.", "Aucun compte Stripe requis. Vos clients paient Transimex, nous gardons vos revenus dans votre solde et nous vous payons sur demande. Les frais de carte de Stripe sont déduits de vos revenus."),
    },
  ];

  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
        <div>
          <h2 className="text-sm font-bold text-[#0B2545]">{tr("How your customers pay", "Comment vos clients paient")}</h2>
          <p className="mt-0.5 text-xs text-slate-600">{tr("Choose one. It applies to bookings your customers make from now on.", "Choisissez-en un. Cela s'applique aux réservations que vos clients feront à partir de maintenant.")}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={tr("How your customers pay", "Comment vos clients paient")}>
          {options.map((o) => {
            const on = data?.collection === o.value;
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={saving}
                onClick={() => choose(o.value)}
                className={`flex cursor-pointer gap-3 rounded-xl border p-4 text-left transition-colors ${on ? "border-[#0B2545] bg-slate-50" : "border-slate-200 hover:bg-slate-50"}`}
              >
                <span className={on ? "text-[#0B2545]" : "text-slate-400"}>{o.icon}</span>
                <span>
                  <span className="block text-sm font-bold text-slate-800">{o.title}</span>
                  <span className="mt-0.5 block text-xs text-slate-600">{o.body}</span>
                </span>
              </button>
            );
          })}
        </div>
        {error && <p role="alert" className="text-xs font-semibold text-red-600">{error}</p>}
      </section>

      {data?.collection === "stripe" ? (
        <PartnerStripeCard />
      ) : data ? (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div>
            <h2 className="text-sm font-bold text-[#0B2545]">{tr("Your balance with Transimex", "Votre solde chez Transimex")}</h2>
            <p className="mt-0.5 text-xs text-slate-700">
              {tr("Available to withdraw", "Disponible à retirer")}: <b className="tabular-nums">{formatCad(data.summary.withdrawableCents, language)}</b>
              {" · "}
              {tr("Still in the waiting period", "Encore en période d'attente")}: <b className="tabular-nums">{formatCad(Math.max(0, data.summary.pendingCents), language)}</b>
            </p>
          </div>
          <Link href="/express/partner/earnings" className="rounded-xl bg-[#0B2545] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#12315c]">
            {tr("Open my earnings", "Ouvrir mes revenus")}
          </Link>
        </section>
      ) : null}
    </div>
  );
}

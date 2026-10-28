"use client";

import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, CreditCard, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface StripeStatus {
  connected: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  needsMoreInfo: boolean;
}

/**
 * Lets a partner connect their own Stripe account. Once it can accept charges, their customers can pay by card:
 * the money goes to the partner's Stripe account, and Transimex's share is taken as a fee on each payment.
 */
export default function PartnerStripeCard() {
  const { language } = useLanguage();
  const tr = (en: string, fr: string) => (language === "fr" ? fr : en);
  const [status, setStatus] = useState<StripeStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (refresh: boolean) => {
    try {
      const res = await fetch(`/api/express/partner/stripe${refresh ? "?refresh=1" : ""}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "error");
      setStatus(data.stripe);
    } catch {
      setError(tr("Could not check your Stripe connection.", "Impossible de vérifier votre connexion Stripe."));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Coming back from Stripe's setup page: ask Stripe for the latest state.
    const back = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("stripe");
    load(back);
  }, [load]);

  const connect = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/express/partner/stripe", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || "error");
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message && err.message !== "error" ? err.message : tr("Could not open Stripe. Please try again.", "Impossible d'ouvrir Stripe. Veuillez réessayer."));
      setBusy(false);
    }
  };

  if (!status && !error) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
      </div>
    );
  }

  const ready = Boolean(status?.chargesEnabled);
  return (
    <section className={`rounded-2xl border p-5 ${ready ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          {ready ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" /> : <CreditCard className="mt-0.5 h-5 w-5 text-slate-500" />}
          <div>
            <h2 className="text-sm font-bold text-[#0B2545]">{tr("Customer card payments", "Paiements par carte de vos clients")}</h2>
            <p className="mt-0.5 max-w-xl text-xs text-slate-600">
              {ready
                ? tr(
                    "Your Stripe account is connected. When a customer pays by card, the payment goes to your Stripe account (you pay Stripe's card fee) and Transimex's share is taken automatically.",
                    "Votre compte Stripe est connecté. Quand un client paie par carte, le paiement va à votre compte Stripe (vous payez les frais de carte de Stripe) et la part de Transimex est prélevée automatiquement."
                  )
                : status?.needsMoreInfo
                  ? tr("Stripe still needs some details from you before it can accept payments. Continue the setup.", "Stripe a encore besoin de quelques renseignements avant d'accepter des paiements. Poursuivez la configuration.")
                  : tr(
                      "Connect your own Stripe account so your customers can book and pay by card. Their payment goes to your Stripe account, and Transimex's share is taken automatically.",
                      "Connectez votre propre compte Stripe pour que vos clients puissent réserver et payer par carte. Leur paiement va à votre compte Stripe et la part de Transimex est prélevée automatiquement."
                    )}
            </p>
          </div>
        </div>
        {!ready && (
          <button type="button" onClick={connect} disabled={busy} className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#0B2545] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#12315c] disabled:opacity-50">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {status?.connected ? tr("Continue Stripe setup", "Poursuivre la configuration Stripe") : tr("Connect Stripe", "Connecter Stripe")}
          </button>
        )}
      </div>
      {error && <p role="alert" className="mt-2 text-xs font-semibold text-red-600">{error}</p>}
    </section>
  );
}

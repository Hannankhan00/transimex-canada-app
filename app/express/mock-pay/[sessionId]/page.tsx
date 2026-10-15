"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CreditCard, FlaskConical, Loader2 } from "lucide-react";
import { formatCad } from "@/lib/shipping/core/money";
import { useLanguage } from "@/lib/i18n/LanguageContext";

/**
 * TEST MODE ONLY. Stands in for Stripe's hosted payment page while there are no
 * Stripe keys. No real money moves. The server refuses to serve it unless
 * PAYMENTS_MODE=mock, and never in production.
 */
export default function MockPayPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { language } = useLanguage();
  const tr = (en: string, fr: string) => (language === "fr" ? fr : en);
  const [info, setInfo] = useState<{ reference: string; amountCents: number; payable: boolean } | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [twice, setTwice] = useState(false);

  useEffect(() => {
    fetch(`/api/express/mock-pay/${sessionId}`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) return setState("missing");
        setInfo(d);
        setState("ready");
      })
      .catch(() => setState("missing"));
  }, [sessionId]);

  const act = async (outcome: "pay" | "fail" | "cancel" | "expire") => {
    setBusy(outcome);
    setMessage("");
    try {
      const res = await fetch(`/api/express/mock-pay/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome, duplicate: twice }),
      });
      const d = await res.json().catch(() => ({}));
      if (d.redirect) {
        window.location.href = d.redirect;
        return;
      }
      setMessage(d.message || tr("Something went wrong.", "Une erreur est survenue."));
    } catch {
      setMessage(tr("Something went wrong.", "Une erreur est survenue."));
    }
    setBusy("");
  };

  if (state === "loading") return <div className="min-h-screen grid place-items-center text-sm text-slate-500">…</div>;
  if (state === "missing" || !info) {
    return <div className="min-h-screen grid place-items-center text-sm text-slate-600">{tr("Payment page not found.", "Page de paiement introuvable.")}</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 grid place-items-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="bg-amber-100 border-b border-amber-300 px-5 py-3 flex items-center gap-2 text-amber-900 text-xs font-bold">
          <FlaskConical className="w-4 h-4" />
          {tr("TEST MODE: this is not Stripe and no real money moves.", "MODE TEST : ce n'est pas Stripe et aucun argent réel n'est déplacé.")}
        </div>
        <div className="p-6 space-y-5">
          <div>
            <p className="text-xs text-slate-500">Transimex Express</p>
            <p className="font-mono font-bold text-[#0B2545]">{info.reference}</p>
            <p className="mt-2 text-3xl font-extrabold text-[#0B2545]">{formatCad(info.amountCents, language)}</p>
          </div>

          {!info.payable && <p className="text-sm text-slate-600">{tr("This booking is no longer waiting for payment.", "Cette réservation n'attend plus de paiement.")}</p>}

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => act("pay")}
              disabled={!!busy || !info.payable}
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#0B2545] hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-sm cursor-pointer"
            >
              {busy === "pay" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              {tr("Pay with test card 4242 4242 4242 4242", "Payer avec la carte test 4242 4242 4242 4242")}
            </button>
            <button type="button" onClick={() => act("fail")} disabled={!!busy || !info.payable} className="w-full py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 disabled:opacity-50 cursor-pointer">
              {tr("Simulate a declined card", "Simuler une carte refusée")}
            </button>
            <button type="button" onClick={() => act("expire")} disabled={!!busy || !info.payable} className="w-full py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 disabled:opacity-50 cursor-pointer">
              {tr("Simulate the page expiring", "Simuler l'expiration de la page")}
            </button>
            <button type="button" onClick={() => act("cancel")} disabled={!!busy} className="w-full py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:text-slate-800 cursor-pointer">
              {tr("Cancel and go back", "Annuler et revenir")}
            </button>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={twice} onChange={(e) => setTwice(e.target.checked)} className="accent-[#0B2545]" />
            {tr("Deliver the payment event twice (like a provider retry)", "Livrer l'événement de paiement deux fois (comme une nouvelle tentative du fournisseur)")}
          </label>

          {message && (
            <p role="alert" className="text-sm font-semibold text-red-600">
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

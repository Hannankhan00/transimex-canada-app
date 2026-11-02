"use client";

import React, { useEffect, useState } from "react";
import { ShieldCheck, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import RecoveryCodes from "@/components/auth/RecoveryCodes";

interface Props {
  /** "verify": user already has 2FA, asks for a code. "enroll": staff must set it up before signing in. */
  mode: "verify" | "enroll";
  challengeToken: string;
  onDone: (user: any) => void;
  onCancel: () => void;
}

export default function TwoFactorLoginModal({ mode, challengeToken, onDone, onCancel }: Props) {
  const { language } = useLanguage();
  const fr = language === "fr";

  const [code, setCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<{ secret: string; qrDataUrl: string } | null>(null);
  const [done, setDone] = useState<{ user: any; recoveryCodes: string[] } | null>(null);

  useEffect(() => {
    if (mode !== "enroll") return;
    let cancelled = false;
    fetch("/api/auth/2fa/enroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeToken }),
    })
      .then(async (r) => ({ ok: r.ok, data: await r.json() }))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (!ok) setError(data.error || "Could not start setup");
        else setEnrollment({ secret: data.secret, qrDataUrl: data.qrDataUrl });
      })
      .catch(() => !cancelled && setError(fr ? "Erreur réseau" : "Network error"));
    return () => {
      cancelled = true;
    };
  }, [mode, challengeToken, fr]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const url = mode === "verify" ? "/api/auth/2fa/verify" : "/api/auth/2fa/enroll/confirm";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeToken, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || (fr ? "Code invalide" : "Invalid code"));
        if (data.code === "CHALLENGE_EXPIRED") setTimeout(onCancel, 1500);
        return;
      }
      if (mode === "enroll" && data.recoveryCodes) {
        setDone({ user: data.user, recoveryCodes: data.recoveryCodes });
      } else {
        onDone(data.user);
      }
    } catch {
      setError(fr ? "Erreur réseau" : "Network error");
    } finally {
      setBusy(false);
    }
  };

  const title =
    mode === "enroll"
      ? fr ? "Configurez l'authentification à deux facteurs" : "Set up two-factor authentication"
      : fr ? "Vérification en deux étapes" : "Two-step verification";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <ShieldCheck className="w-5 h-5 text-[#d21f27]" />
            {title}
          </div>
          {!done && (
            <button type="button" onClick={onCancel} aria-label="Close" className="text-slate-400 hover:text-slate-700">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {done ? (
          <RecoveryCodes codes={done.recoveryCodes} fr={fr} onDone={() => onDone(done.user)} />
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {mode === "enroll" ? (
              <>
                <p className="text-xs text-slate-600">
                  {fr
                    ? "L'authentification à deux facteurs est obligatoire pour le personnel. Scannez le code QR avec Google Authenticator, Microsoft Authenticator ou Authy, puis saisissez le code à 6 chiffres."
                    : "Two-factor authentication is required for staff. Scan the QR code with Google Authenticator, Microsoft Authenticator or Authy, then enter the 6-digit code."}
                </p>
                {enrollment ? (
                  <div className="flex flex-col items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={enrollment.qrDataUrl} alt="QR code" width={200} height={200} className="rounded-lg border border-slate-200" />
                    <p className="text-[11px] text-slate-500">{fr ? "Ou saisissez la clé :" : "Or enter this key manually:"}</p>
                    <code className="select-all break-all rounded bg-slate-100 px-2 py-1 text-[12px] text-slate-800">{enrollment.secret}</code>
                  </div>
                ) : (
                  !error && <p className="text-xs text-slate-500">{fr ? "Chargement…" : "Loading…"}</p>
                )}
              </>
            ) : (
              <p className="text-xs text-slate-600">
                {useRecovery
                  ? fr ? "Saisissez l'un de vos codes de récupération." : "Enter one of your recovery codes."
                  : fr ? "Saisissez le code à 6 chiffres de votre application d'authentification." : "Enter the 6-digit code from your authenticator app."}
              </p>
            )}

            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode={useRecovery ? "text" : "numeric"}
              autoComplete="one-time-code"
              autoFocus
              maxLength={useRecovery ? 12 : 7}
              placeholder={useRecovery ? "xxxxx-xxxxx" : "123456"}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-center font-mono text-lg tracking-widest text-slate-900 outline-none focus:border-[#d21f27]"
            />

            {error && <p className="text-[12px] font-semibold text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={busy || !code.trim() || (mode === "enroll" && !enrollment)}
              className="w-full rounded-xl bg-[#d21f27] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
            >
              {busy ? (fr ? "Vérification…" : "Verifying…") : mode === "enroll" ? (fr ? "Activer et se connecter" : "Enable and sign in") : fr ? "Vérifier" : "Verify"}
            </button>

            {mode === "verify" && (
              <button
                type="button"
                onClick={() => {
                  setUseRecovery((v) => !v);
                  setCode("");
                  setError(null);
                }}
                className="w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                {useRecovery
                  ? fr ? "Utiliser l'application d'authentification" : "Use authenticator app instead"
                  : fr ? "Utiliser un code de récupération" : "Use a recovery code instead"}
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

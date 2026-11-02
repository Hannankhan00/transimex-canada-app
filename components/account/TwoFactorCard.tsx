"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import RecoveryCodes from "@/components/auth/RecoveryCodes";

interface Status {
  enabled: boolean;
  mandatory: boolean;
  available: boolean;
  recoveryCodesRemaining: number;
}

type View = "idle" | "setup" | "codes" | "disable" | "regen";

/** Two-factor settings. Optional for clients (can switch on/off), mandatory for staff (can not switch off). */
export default function TwoFactorCard() {
  const { language } = useLanguage();
  const fr = language === "fr";

  const [status, setStatus] = useState<Status | null>(null);
  const [view, setView] = useState<View>("idle");
  const [enrollment, setEnrollment] = useState<{ secret: string; qrDataUrl: string } | null>(null);
  const [codes, setCodes] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/account/2fa");
    if (r.ok) setStatus(await r.json());
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const reset = () => {
    setView("idle");
    setCode("");
    setPassword("");
    setError(null);
    setEnrollment(null);
  };

  const call = async (url: string, body?: object) => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body || {}),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error || (fr ? "Une erreur est survenue" : "Something went wrong"));
        return null;
      }
      return data;
    } catch {
      setError(fr ? "Erreur réseau" : "Network error");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const startSetup = async () => {
    const data = await call("/api/account/2fa/setup");
    if (data) {
      setEnrollment({ secret: data.secret, qrDataUrl: data.qrDataUrl });
      setView("setup");
    }
  };

  const confirmSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = await call("/api/account/2fa/enable", { code });
    if (data) {
      setCodes(data.recoveryCodes);
      setCode("");
      setEnrollment(null);
      setView("codes");
      load();
    }
  };

  const disable = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = await call("/api/account/2fa/disable", { password, code });
    if (data) {
      reset();
      load();
    }
  };

  const regen = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = await call("/api/account/2fa/recovery-codes", { password, code });
    if (data) {
      setCodes(data.recoveryCodes);
      setCode("");
      setPassword("");
      setView("codes");
      load();
    }
  };

  const inputCls = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#d21f27]";
  const primaryBtn = "rounded-xl bg-[#d21f27] px-4 py-2 text-xs font-bold text-white disabled:opacity-40";
  const ghostBtn = "rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50";

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-4">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2 font-bold text-slate-900 text-xs uppercase tracking-wider">
          {status?.enabled ? <ShieldCheck className="w-4 h-4 text-emerald-600" /> : <ShieldOff className="w-4 h-4 text-[#d21f27]" />}
          <span>{fr ? "Authentification à deux facteurs" : "Two-Factor Authentication"}</span>
        </div>
        {status && (
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${status.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
            {status.enabled ? (fr ? "Activée" : "On") : fr ? "Désactivée" : "Off"}
          </span>
        )}
      </div>

      {!status ? (
        <p className="text-xs text-slate-500">{fr ? "Chargement…" : "Loading…"}</p>
      ) : view === "codes" ? (
        <RecoveryCodes codes={codes} fr={fr} onDone={reset} />
      ) : view === "setup" && enrollment ? (
        <form onSubmit={confirmSetup} className="space-y-3">
          <p className="text-xs text-slate-600">
            {fr
              ? "Scannez le code QR avec Google Authenticator, Microsoft Authenticator ou Authy, puis saisissez le code à 6 chiffres."
              : "Scan the QR code with Google Authenticator, Microsoft Authenticator or Authy, then enter the 6-digit code."}
          </p>
          <div className="flex flex-col items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={enrollment.qrDataUrl} alt="QR code" width={200} height={200} className="rounded-lg border border-slate-200" />
            <code className="select-all break-all rounded bg-slate-100 px-2 py-1 text-[12px] text-slate-800">{enrollment.secret}</code>
          </div>
          <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={7} placeholder="123456" className={`${inputCls} text-center font-mono tracking-widest`} />
          {error && <p className="text-[12px] font-semibold text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={busy || !code.trim()} className={primaryBtn}>{fr ? "Activer" : "Turn on"}</button>
            <button type="button" onClick={reset} className={ghostBtn}>{fr ? "Annuler" : "Cancel"}</button>
          </div>
        </form>
      ) : view === "disable" || view === "regen" ? (
        <form onSubmit={view === "disable" ? disable : regen} className="space-y-3">
          <p className="text-xs text-slate-600">
            {view === "disable"
              ? fr ? "Confirmez avec votre mot de passe et un code actuel pour désactiver." : "Confirm with your password and a current code to turn this off."
              : fr ? "Confirmez avec votre mot de passe et un code actuel pour générer de nouveaux codes de récupération (les anciens seront invalides)." : "Confirm with your password and a current code to generate new recovery codes (the old ones stop working)."}
          </p>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder={fr ? "Mot de passe" : "Password"} className={inputCls} />
          <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={7} placeholder="123456" className={`${inputCls} font-mono tracking-widest`} />
          {error && <p className="text-[12px] font-semibold text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={busy || !password || !code.trim()} className={primaryBtn}>{view === "disable" ? (fr ? "Désactiver" : "Turn off") : fr ? "Générer" : "Generate"}</button>
            <button type="button" onClick={reset} className={ghostBtn}>{fr ? "Annuler" : "Cancel"}</button>
          </div>
        </form>
      ) : status.enabled ? (
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            {fr ? "Un code de votre application d'authentification est demandé à chaque connexion." : "A code from your authenticator app is required each time you sign in."}{" "}
            <span className="font-semibold">
              {fr ? `Codes de récupération restants : ${status.recoveryCodesRemaining}` : `Recovery codes left: ${status.recoveryCodesRemaining}`}
            </span>
          </p>
          {status.mandatory && (
            <p className="text-[11px] font-semibold text-slate-500">
              {fr ? "Obligatoire pour les comptes du personnel : ne peut pas être désactivée." : "Required for staff accounts, so it can not be turned off."}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { reset(); setView("regen"); }} className={ghostBtn}>
              {fr ? "Nouveaux codes de récupération" : "New recovery codes"}
            </button>
            {!status.mandatory && (
              <button type="button" onClick={() => { reset(); setView("disable"); }} className={ghostBtn}>
                {fr ? "Désactiver" : "Turn off"}
              </button>
            )}
          </div>
        </div>
      ) : status.available ? (
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            {fr ? "Ajoutez une couche de sécurité : un code de votre téléphone sera demandé en plus du mot de passe." : "Add a layer of security: a code from your phone is asked for in addition to your password."}
          </p>
          {error && <p className="text-[12px] font-semibold text-red-600">{error}</p>}
          <button type="button" onClick={startSetup} disabled={busy} className={primaryBtn}>
            {fr ? "Activer" : "Turn on"}
          </button>
        </div>
      ) : (
        <p className="text-xs text-slate-600">
          {fr ? "Disponible uniquement pour les comptes qui se connectent avec un mot de passe." : "Only available for accounts that sign in with a password."}
        </p>
      )}
    </div>
  );
}

"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Link2, Link2Off } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import PasswordHints, { passwordProblem } from "@/components/auth/PasswordHints";

interface Status {
  connected: boolean;
  hasPassword: boolean;
}

const input =
  "w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none";

/** Connect or disconnect the Google account used to sign in. Disconnecting always leaves a password to sign in with. */
export default function GoogleCard() {
  const { language } = useLanguage();
  const fr = language === "fr";

  const [status, setStatus] = useState<Status | null>(null);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/account/google");
    if (r.ok) setStatus(await r.json());
  }, []);

  useEffect(() => {
    load().catch(() => {});
    // The Google round trip comes back to this page with the result in the URL.
    const params = new URLSearchParams(window.location.search);
    const result = params.get("google");
    if (result === "connected") setNotice(fr ? "Compte Google connecté." : "Google account connected.");
    if (result === "error") {
      const reason = params.get("reason");
      setError(
        reason === "taken"
          ? fr ? "Ce compte Google est déjà lié à un autre compte." : "That Google account is already linked to another account."
          : reason === "unavailable"
            ? fr ? "La connexion Google n'est pas offerte pour ce compte." : "Google sign-in is not available for this account."
            : fr ? "Impossible de connecter Google. Réessayez." : "Could not connect Google. Please try again."
      );
    }
    if (result) window.history.replaceState({}, "", window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const close = () => {
    setOpen(false);
    setPassword("");
    setConfirm("");
    setError(null);
  };

  const disconnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!status) return;
    if (!status.hasPassword) {
      const problem = passwordProblem(password, fr);
      if (problem) return setError(problem);
      if (password !== confirm) return setError(fr ? "Les mots de passe ne correspondent pas." : "The passwords do not match.");
    }
    setBusy(true);
    try {
      const r = await fetch("/api/account/google", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(status.hasPassword ? { password } : { newPassword: password }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) return setError(data.error || (fr ? "Une erreur est survenue" : "Something went wrong"));
      close();
      setNotice(
        status.hasPassword
          ? fr ? "Compte Google déconnecté." : "Google account disconnected."
          : fr ? "Compte Google déconnecté. Votre mot de passe est enregistré." : "Google account disconnected. Your password is saved."
      );
      await load();
    } catch {
      setError(fr ? "Erreur réseau" : "Network error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-4">
      <div className="flex items-center gap-2 font-bold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-100 pb-3">
        {status?.connected ? <Link2 className="w-4 h-4 text-[#d21f27]" /> : <Link2Off className="w-4 h-4 text-[#d21f27]" />}
        <span>{fr ? "Compte Google" : "Google Account"}</span>
      </div>

      {notice && <p className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700">{notice}</p>}
      {!open && error && <p className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}

      {!status ? (
        <p className="text-xs text-slate-400">{fr ? "Chargement…" : "Loading…"}</p>
      ) : !open ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-md text-xs leading-relaxed text-slate-600">
            {status.connected
              ? fr
                ? "Un compte Google est connecté : vous pouvez vous connecter en un clic avec Google."
                : "A Google account is connected, so you can sign in with one click."
              : fr
                ? "Connectez un compte Google pour vous connecter plus rapidement. Vous pourrez le retirer à tout moment."
                : "Connect a Google account to sign in faster. You can remove it at any time."}
          </p>
          {status.connected ? (
            <button type="button" onClick={() => setOpen(true)} className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl transition cursor-pointer">
              {fr ? "Déconnecter Google" : "Disconnect Google"}
            </button>
          ) : (
            <a href="/api/auth/google?link=1" className="px-4 py-2.5 bg-[#0B2545] hover:bg-[#123661] text-white text-xs font-bold rounded-xl transition">
              {fr ? "Connecter Google" : "Connect Google"}
            </a>
          )}
        </div>
      ) : (
        <form onSubmit={disconnect} className="space-y-3">
          <p className="text-xs leading-relaxed text-slate-600">
            {status.hasPassword
              ? fr
                ? "Entrez votre mot de passe pour confirmer. Vous vous connecterez ensuite avec votre courriel et votre mot de passe."
                : "Enter your password to confirm. You will sign in with your email and password afterwards."
              : fr
                ? "Ce compte a été créé avec Google et n'a pas de mot de passe. Choisissez-en un d'abord, pour pouvoir vous reconnecter."
                : "This account was created with Google and has no password yet. Choose one first, so you can still sign in."}
          </p>
          <div className={status.hasPassword ? "max-w-sm" : "grid gap-3 sm:grid-cols-2"}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={status.hasPassword ? (fr ? "Mot de passe actuel" : "Current password") : fr ? "Nouveau mot de passe (8+)" : "New password (8+ characters)"}
              autoComplete={status.hasPassword ? "current-password" : "new-password"}
              autoFocus
              className={input}
            />
            {!status.hasPassword && (
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={fr ? "Confirmer le mot de passe" : "Confirm password"} autoComplete="new-password" className={input} />
            )}
          </div>
          {!status.hasPassword && <PasswordHints password={password} fr={fr} />}
          {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={busy || !password} className="px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition cursor-pointer">
              {busy ? (fr ? "Patientez…" : "Please wait…") : status.hasPassword ? (fr ? "Déconnecter Google" : "Disconnect Google") : fr ? "Enregistrer le mot de passe et déconnecter" : "Save password and disconnect"}
            </button>
            <button type="button" onClick={close} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer">
              {fr ? "Annuler" : "Cancel"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

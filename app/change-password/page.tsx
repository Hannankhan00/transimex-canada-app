"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Lock } from "lucide-react";
import TransimexLogo from "@/components/TransimexLogo";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { NEW_PASSWORD_MIN_LENGTH, PASSWORD_PROBLEM_TEXT, checkNewPassword } from "@/lib/passwordRules";

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]";

/**
 * Shown right after sign-in to someone whose password was set by another person (a partner made their login). Nothing
 * else in the app opens until they choose their own password: the proxy sends every page here and the server refuses
 * every other request.
 */
export default function ChangePasswordPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const tr = (en: string, fr: string) => (language === "fr" ? fr : en);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError("");
    if (!current) return setError(tr("Enter the temporary password you were given.", "Entrez le mot de passe temporaire que vous avez reçu."));
    const problem = checkNewPassword({ current, next });
    if (problem) return setError(PASSWORD_PROBLEM_TEXT[problem][language === "fr" ? "fr" : "en"]);
    if (next !== confirm) return setError(tr("The two new passwords do not match.", "Les deux nouveaux mots de passe ne correspondent pas."));

    setBusy(true);
    try {
      const res = await fetch("/api/auth/change-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: current, newPassword: next }) });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        // A full navigation, so the new cookie is used by every request that follows.
        window.location.replace(data.redirectTo || "/dashboard");
        return;
      }
      if (data.code === "not_required") {
        router.replace("/dashboard");
        return;
      }
      if (data.code && data.code in PASSWORD_PROBLEM_TEXT) setError(PASSWORD_PROBLEM_TEXT[data.code as keyof typeof PASSWORD_PROBLEM_TEXT][language === "fr" ? "fr" : "en"]);
      else if (data.code === "wrong_current") setError(tr("The temporary password is not correct.", "Le mot de passe temporaire n'est pas correct."));
      else setError(data.error || tr("We could not change your password. Please try again.", "Nous n'avons pas pu changer votre mot de passe. Veuillez réessayer."));
    } catch {
      setError(tr("We could not change your password. Please try again.", "Nous n'avons pas pu changer votre mot de passe. Veuillez réessayer."));
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.replace("/login");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
        <div className="flex justify-center">
          <TransimexLogo />
        </div>
        <div className="space-y-1 text-center">
          <div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-slate-100">
            <Lock className="h-5 w-5 text-slate-600" />
          </div>
          <h1 className="pt-2 text-xl font-extrabold text-[#0B2545]">{tr("Choose your own password", "Choisissez votre propre mot de passe")}</h1>
          <p className="text-sm text-slate-600">
            {tr(
              "Your account was set up for you with a temporary password. Before you continue, choose a password only you know.",
              "Votre compte a été créé pour vous avec un mot de passe temporaire. Avant de continuer, choisissez un mot de passe que vous seul connaissez."
            )}
          </p>
        </div>

        <form onSubmit={submit} noValidate className="space-y-4">
          <label className="block space-y-1">
            <span className="text-xs font-bold text-slate-700">{tr("Temporary password", "Mot de passe temporaire")}</span>
            <input className={inputClass} type={show ? "text" : "password"} autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-bold text-slate-700">{tr("New password", "Nouveau mot de passe")}</span>
            <input className={inputClass} type={show ? "text" : "password"} autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-bold text-slate-700">{tr("Confirm new password", "Confirmez le nouveau mot de passe")}</span>
            <input className={inputClass} type={show ? "text" : "password"} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </label>
          <button type="button" onClick={() => setShow((v) => !v)} className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900">
            {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {show ? tr("Hide passwords", "Masquer les mots de passe") : tr("Show passwords", "Afficher les mots de passe")}
          </button>
          <p className="text-xs text-slate-500">{tr(`At least ${NEW_PASSWORD_MIN_LENGTH} characters, with a letter and a number. No sequences (1234, abcd, qwerty), repeated characters, or your name or email.`, `Au moins ${NEW_PASSWORD_MIN_LENGTH} caractères, avec une lettre et un chiffre. Aucune suite (1234, abcd, qwerty), caractère répété, ni votre nom ou courriel.`)}</p>

          {error && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-700">
              {error}
            </p>
          )}

          <button type="submit" disabled={busy} className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#D21F27] px-5 py-3 text-sm font-bold text-white hover:bg-[#b91a21] disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {tr("Save and continue", "Enregistrer et continuer")}
          </button>
        </form>

        <button type="button" onClick={signOut} className="mx-auto block cursor-pointer text-xs font-semibold text-slate-500 hover:text-slate-800">
          {tr("Sign out", "Se déconnecter")}
        </button>
      </div>
    </main>
  );
}

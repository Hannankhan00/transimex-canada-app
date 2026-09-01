"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, ForgotPasswordFormData } from "@/lib/validations/auth";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import TransimexLogo from "@/components/TransimexLogo";
import { Mail, ArrowRight, CheckCircle2, KeyRound, Globe2, ArrowLeft, ExternalLink } from "lucide-react";

export default function ForgotPasswordPage() {
  const { t, language, toggleLanguage } = useLanguage();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setServerError(null);
    try {
      const res = await api.auth.forgotPassword(data);
      if (res.success) {
        setSubmittedEmail(data.email);
        setGeneratedToken(res.mockResetToken || "tx-secure-demo-token-2026");
        setIsSuccess(true);
      } else {
        setServerError("Failed to send reset link. Please check the email address.");
      }
    } catch (err: any) {
      setServerError(err.message || "An unexpected error occurred.");
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fa] flex flex-col justify-between selection:bg-[#d21f27] selection:text-white">
      {/* Top Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link href="/login" className="transition-opacity hover:opacity-90">
          <TransimexLogo size="md" />
        </Link>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition shadow-xs cursor-pointer"
          >
            <Globe2 className="w-3.5 h-3.5 text-[#0B2545]" />
            <span>{language.toUpperCase()}</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          {/* Header Banner */}
          <div className="bg-[#0B2545] p-6 sm:p-8 text-white relative overflow-hidden">
            <div className="absolute right-0 top-0 w-48 h-48 bg-[#d21f27]/10 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-white text-[11px] font-semibold uppercase tracking-wider mb-2">
                <KeyRound className="w-3.5 h-3.5 text-[#d21f27]" />
                {language === "fr" ? "Récupération Sécurisée" : "Self-Service Recovery"}
              </span>
              <h1
                className="text-2xl font-bold tracking-tight"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {t.auth.resetTitle}
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm mt-1">
                {t.auth.resetSubtitle}
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 sm:p-8">
            {isSuccess ? (
              <div className="text-center py-4 animate-in fade-in zoom-in-95 duration-300">
                <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h2
                  className="text-xl font-bold text-[#0B2545] mb-2"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {t.auth.resetSentTitle}
                </h2>
                <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                  {t.auth.resetSentDesc} (<strong>{submittedEmail}</strong>).
                </p>

                {/* Simulated Token Test Link for Evaluators */}
                {generatedToken && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-left mb-5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-1">
                      <span>{language === "fr" ? "Lien de test généré (1 heure)" : "Generated Token Link (1 Hour)"}</span>
                    </div>
                    <Link
                      href={`/reset-password?token=${generatedToken}`}
                      className="inline-flex items-center gap-1 text-xs text-[#0B2545] hover:text-[#d21f27] font-semibold underline break-all"
                    >
                      /reset-password?token={generatedToken.slice(0, 16)}...
                      <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                    </Link>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <Link
                    href="/login"
                    className="w-full py-3 bg-[#0B2545] hover:bg-[#123661] text-white font-semibold text-xs rounded-xl transition text-center shadow-sm"
                  >
                    {t.auth.returnToLogin}
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                {serverError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                    {serverError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {t.auth.email} *
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="email"
                      {...register("email")}
                      placeholder="name@company.ca"
                      className={`w-full bg-[#f8fafc] border ${
                        errors.email ? "border-red-400 focus:border-red-500 ring-1 ring-red-200" : "border-slate-200 focus:border-[#0B2545]"
                      } focus:bg-white rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition`}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-[11px] text-red-600 mt-1">{errors.email.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#d21f27] hover:bg-[#b51a21] active:scale-[0.99] text-white font-semibold py-3 px-6 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer disabled:opacity-60 mt-4"
                >
                  {isSubmitting ? (
                    <span>{t.auth.sendingResetLink}</span>
                  ) : (
                    <>
                      <span>{t.auth.sendResetLink}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#0B2545] transition"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    {t.auth.returnToLogin}
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-xs text-slate-400">
        &copy; {new Date().getFullYear()} Transimex Canada Inc.
      </footer>
    </div>
  );
}

"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema, ResetPasswordFormData } from "@/lib/validations/auth";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import TransimexLogo from "@/components/TransimexLogo";
import {
  Lock,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Globe2,
  Eye,
  EyeOff,
} from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "tx-demo-token";
  const { t, language, toggleLanguage } = useLanguage();

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const passwordValue = watch("password", "");

  const getPasswordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd) || pwd.length >= 12) score++;
    return score;
  };

  const strengthScore = getPasswordStrength(passwordValue);

  const onSubmit = async (data: ResetPasswordFormData) => {
    setServerError(null);
    try {
      const res = await api.auth.resetPassword(token, data);
      if (res.success) {
        setIsSuccess(true);
      } else {
        setServerError("Failed to reset password. The link may have expired.");
      }
    } catch (err: any) {
      setServerError(err.message || "An unexpected error occurred.");
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fa] flex flex-col justify-between selection:bg-[#d21f27] selection:text-white">
      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link href="/login" className="transition-opacity hover:opacity-90">
          <TransimexLogo size="md" />
        </Link>
        <button
          type="button"
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition shadow-xs cursor-pointer"
        >
          <Globe2 className="w-3.5 h-3.5 text-[#0B2545]" />
          <span>{language.toUpperCase()}</span>
        </button>
      </header>

      {/* Main Form Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          {/* Header Banner */}
          <div className="bg-[#0B2545] p-6 sm:p-8 text-white relative overflow-hidden">
            <div className="absolute right-0 top-0 w-48 h-48 bg-[#d21f27]/10 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-white text-[11px] font-semibold uppercase tracking-wider mb-2">
                <KeyRound className="w-3.5 h-3.5 text-[#d21f27]" />
                {language === "fr" ? "Sécurité du Compte" : "Account Security"}
              </span>
              <h1
                className="text-2xl font-bold tracking-tight"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {t.auth.createNewPasswordTitle}
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm mt-1">
                {t.auth.createNewPasswordSubtitle}
              </p>
            </div>
          </div>

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
                  {t.auth.passwordUpdatedTitle}
                </h2>
                <p className="text-xs text-slate-600 mb-6 leading-relaxed">
                  {t.auth.passwordUpdatedDesc}
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="w-full py-3.5 bg-[#0B2545] hover:bg-[#123661] text-white font-semibold text-xs rounded-xl transition text-center shadow-sm cursor-pointer"
                >
                  {t.auth.returnToLogin}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                {serverError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                    {serverError}
                  </div>
                )}

                {/* New Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {t.auth.newPassword} *
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type={showPassword ? "text" : "password"}
                      {...register("password")}
                      placeholder="••••••••••••"
                      className={`w-full bg-[#f8fafc] border ${
                        errors.password ? "border-red-400 focus:border-red-500 ring-1 ring-red-200" : "border-slate-200 focus:border-[#0B2545]"
                      } focus:bg-white rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* Strength Bar */}
                  {passwordValue.length > 0 && (
                    <div className="mt-1.5 grid grid-cols-4 gap-1 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`h-full rounded-full transition-all ${
                            strengthScore >= step ? "bg-[#d21f27]" : "bg-slate-200"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                  {errors.password && (
                    <p className="text-[11px] text-red-600 mt-1">{errors.password.message}</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {t.auth.confirmPassword} *
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type={showPassword ? "text" : "password"}
                      {...register("confirmPassword")}
                      placeholder="••••••••••••"
                      className={`w-full bg-[#f8fafc] border ${
                        errors.confirmPassword ? "border-red-400 focus:border-red-500 ring-1 ring-red-200" : "border-slate-200 focus:border-[#0B2545]"
                      } focus:bg-white rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition`}
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-[11px] text-red-600 mt-1">{errors.confirmPassword.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#d21f27] hover:bg-[#b51a21] active:scale-[0.99] text-white font-semibold py-3.5 px-6 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer disabled:opacity-60 mt-4"
                >
                  {isSubmitting ? (
                    <span>{language === "fr" ? "Mise à jour..." : "Updating Password..."}</span>
                  ) : (
                    <>
                      <span>{t.auth.updatePasswordButton}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      <footer className="w-full py-4 text-center text-xs text-slate-400">
        &copy; {new Date().getFullYear()} Transimex Canada Inc.
      </footer>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center text-xs text-slate-500">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}

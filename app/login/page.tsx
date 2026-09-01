"use client";

import React, { useState, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginFormData } from "@/lib/validations/auth";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  Shield,
  Globe2,
  Sparkles,
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, language, toggleLanguage } = useLanguage();

  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const urlError = searchParams.get("error");
  const [serverError, setServerError] = useState<string | null>(urlError || null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: true,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    try {
      const res = await api.auth.login(data);
      if (res.success && res.user) {
        if (typeof window !== "undefined") {
          localStorage.setItem("transimex_user", JSON.stringify(res.user));
        }
        const role = res.user.role;
        if (role === "superadmin" || role === "admin" || role === "subadmin") {
          router.push("/admin");
        } else {
          router.push("/dashboard");
        }
      } else {
        setServerError(res.error || "Invalid credentials");
      }
    } catch (err: any) {
      setServerError(err.message || "Failed to log in");
    }
  };

  const fillMock = (type: "client" | "admin") => {
    if (type === "client") {
      setValue("email", "client@transimex.ca");
      setValue("password", "Transimex2026!");
    } else {
      setValue("email", "admin@transimex.ca");
      setValue("password", "Transimex2026!");
    }
    setServerError(null);
  };

  const handleGoogleAuth = () => {
    setGoogleLoading(true);
    setServerError(null);
    window.location.href = "/api/auth/google";
  };

  return (
    <div className="bg-[#f9f9ff] text-[#111c2d] min-h-screen flex antialiased">
      <div className="flex flex-col md:flex-row w-full min-h-screen">
        {/* Left Side: Hero Image & Branding */}
        <div className="hidden md:flex md:w-1/2 relative bg-[#0B2545] overflow-hidden flex-col justify-between">
          <div className="absolute inset-0 z-0">
            <Image
              src="/freight-hero.png"
              alt="Transimex Freight and Logistics Cargo Ship"
              fill
              priority
              sizes="50vw"
              className="object-cover opacity-35 filter grayscale-[20%]"
            />
          </div>

          {/* Heavy Navy Overlay */}
          <div className="absolute inset-0 bg-[#0B2545]/85 z-10" />

          <div className="relative z-20 flex flex-col justify-between h-full p-10 lg:p-14">
            {/* Logo and Brand */}
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-white rounded-xl p-1.5 flex items-center justify-center shadow-xs">
                <svg
                  viewBox="0 0 100 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-full h-full"
                >
                  <rect width="100" height="100" rx="12" fill="#FFFFFF" />
                  <path d="M20 30H80V40H58V80H42V40H20V30Z" fill="#D21F27" />
                  <path d="M50 15L56 26H44L50 15Z" fill="#D21F27" />
                  <circle cx="50" cy="56" r="6" fill="#0B2545" />
                  <path
                    d="M32 78C37 81 43 83 50 83C57 83 63 81 68 78"
                    stroke="#0B2545"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div>
                <h1
                  className="text-2xl font-bold text-white leading-tight"
                  style={{
                    fontFamily: "var(--font-playfair), 'Playfair Display', serif",
                  }}
                >
                  Transimex
                </h1>
                <p className="text-[10px] uppercase tracking-[0.25em] text-[#d21f27] font-semibold">
                  Canada Logistics
                </p>
              </div>
            </div>

            {/* Core Value Statement */}
            <div className="max-w-xl pb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-[11px] font-semibold uppercase tracking-wider mb-4">
                <Shield className="w-3.5 h-3.5 text-[#d21f27]" />
                Institutional Logistics Portal
              </span>
              <h2
                className="text-4xl lg:text-[44px] font-bold text-white mb-4 text-balance leading-[1.1] tracking-[-0.02em]"
                style={{
                  fontFamily: "var(--font-playfair), 'Playfair Display', serif",
                }}
              >
                Global Reach. Personal Touch.
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed max-w-md">
                Institutional-grade freight management, cross-border customs compliance, and full visibility cargo logistics across North America.
              </p>
            </div>

            {/* Bottom Certifications */}
            <div className="pt-6 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
              <span>PIP &bull; C-TPAT &bull; CBSA Verified</span>
              <span>&copy; {new Date().getFullYear()} Transimex Canada</span>
            </div>
          </div>
        </div>

        {/* Right Side: Authentication Form */}
        <div className="w-full md:w-1/2 flex items-center justify-center p-6 sm:p-10 md:p-12 bg-white overflow-y-auto min-h-screen">
          <div className="w-full max-w-md my-auto py-6">
            {/* Top Bar on Mobile & Language Switcher */}
            <div className="flex items-center justify-between mb-8">
              <div className="md:hidden">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 bg-[#0B2545] rounded-lg p-1 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">T</span>
                  </div>
                  <span
                    className="font-bold text-lg text-[#0B2545]"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    Transimex
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleLanguage}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition shadow-xs cursor-pointer"
              >
                <Globe2 className="w-3.5 h-3.5 text-[#0B2545]" />
                <span>{language.toUpperCase()}</span>
              </button>
            </div>

            {/* Title & Subtitle */}
            <div className="mb-6">
              <h2
                className="text-3xl sm:text-[34px] font-bold text-[#0B2545] tracking-tight leading-tight"
                style={{
                  fontFamily: "var(--font-playfair), 'Playfair Display', serif",
                }}
              >
                {t.auth.welcomeBack}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
                {t.auth.welcomeSubtitle}
              </p>
            </div>

            {/* Fast Demo Credentials Helpers */}
            <div className="mb-6 p-3 bg-slate-50 border border-slate-200/90 rounded-xl">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-2">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#d21f27]" />
                  Quick Test Logins:
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => fillMock("client")}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-[#0B2545] text-left transition cursor-pointer shadow-xs"
                >
                  🏢 {t.auth.demoClient}
                </button>
                <button
                  type="button"
                  onClick={() => fillMock("admin")}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-[#d21f27] text-left transition cursor-pointer shadow-xs"
                >
                  🛡️ {t.auth.demoAdmin}
                </button>
              </div>
            </div>

            {/* Server Error banner */}
            {serverError && (
              <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2 animate-in fade-in">
                <span className="font-semibold">{t.common.error}:</span> {serverError}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  {t.auth.email} *
                </label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    id="email"
                    type="email"
                    {...register("email")}
                    placeholder="client@transimex.ca"
                    className={`w-full bg-[#f8fafc] border ${
                      errors.email ? "border-red-400 focus:border-red-500 ring-1 ring-red-200" : "border-slate-200 focus:border-[#0B2545]"
                    } focus:bg-white rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none transition`}
                  />
                </div>
                {errors.email && (
                  <p className="text-[11px] text-red-600 mt-1">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  {t.auth.password} *
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    {...register("password")}
                    placeholder="••••••••••••"
                    className={`w-full bg-[#f8fafc] border ${
                      errors.password ? "border-red-400 focus:border-red-500 ring-1 ring-red-200" : "border-slate-200 focus:border-[#0B2545]"
                    } focus:bg-white rounded-xl pl-10 pr-10 py-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none transition`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-[11px] text-red-600 mt-1">{errors.password.message}</p>
                )}
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center space-x-2 cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    {...register("rememberMe")}
                    className="rounded border-slate-300 text-[#d21f27] focus:ring-[#d21f27]/30 w-4 h-4 cursor-pointer accent-[#d21f27]"
                  />
                  <span className="text-xs text-slate-600 group-hover:text-slate-900 transition">
                    {t.auth.rememberMe}
                  </span>
                </label>

                <Link
                  href="/forgot-password"
                  className="text-xs text-[#d21f27] hover:text-[#b51a21] font-semibold transition"
                >
                  {t.auth.forgotPassword}
                </Link>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#d21f27] hover:bg-[#b51a21] active:scale-[0.99] text-white font-semibold py-3.5 px-6 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer disabled:opacity-60 mt-4"
              >
                {isSubmitting ? (
                  <span>{t.auth.signingIn}</span>
                ) : (
                  <>
                    <span>{t.auth.signInButton}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6 flex items-center justify-center">
              <div className="w-full border-t border-slate-200" />
              <span className="bg-white px-3 text-[11px] uppercase tracking-wider text-slate-400 font-semibold absolute">
                {language === "fr" ? "Ou continuer avec" : "Or continue with"}
              </span>
            </div>

            {/* Continue with Google */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99] text-slate-700 font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-60"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{googleLoading ? "Connecting..." : "Continue with Google"}</span>
            </button>

            {/* Link to Register */}
            <div className="text-center pt-6 text-xs text-slate-500">
              {t.auth.noAccount}{" "}
              <Link
                href="/register"
                className="text-[#0B2545] hover:text-[#d21f27] font-bold transition ml-1"
              >
                {t.auth.createAccount}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f9f9ff] flex items-center justify-center text-xs text-slate-500">Loading portal...</div>}>
      <LoginForm />
    </Suspense>
  );
}

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  registerSchema,
  RegisterFormData,
  industriesEnum,
  provincesEnum,
} from "@/lib/validations/auth";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import TransimexLogo from "@/components/TransimexLogo";
import {
  User,
  Mail,
  Lock,
  Phone,
  Building2,
  Factory,
  MapPin,
  CheckCircle2,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Globe2,
  FileCheck,
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { t, language, toggleLanguage } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      phone: "",
      companyName: "",
      industry: "Manufacturing",
      city: "Montreal",
      province: "QC",
      terms: true,
    },
  });

  const passwordValue = watch("password", "");

  // Calculate password strength score (0 to 4)
  const getPasswordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd) || pwd.length >= 12) score++;
    return score;
  };

  const strengthScore = getPasswordStrength(passwordValue);

  const getStrengthLabel = (score: number) => {
    switch (score) {
      case 0:
      case 1:
        return { label: language === "fr" ? "Faible" : "Weak", color: "bg-red-500", text: "text-red-600" };
      case 2:
        return { label: language === "fr" ? "Moyen" : "Fair", color: "bg-amber-500", text: "text-amber-600" };
      case 3:
        return { label: language === "fr" ? "Bon" : "Strong", color: "bg-blue-600", text: "text-blue-600" };
      case 4:
        return { label: language === "fr" ? "Excellent" : "Excellent", color: "bg-emerald-600", text: "text-emerald-600" };
      default:
        return { label: "", color: "bg-slate-200", text: "text-slate-400" };
    }
  };

  const strength = getStrengthLabel(strengthScore);

  const onSubmit = async (data: RegisterFormData) => {
    setServerError(null);
    try {
      const res = await api.auth.register(data);
      if (res.success) {
        setSubmittedEmail(data.email);
        setIsSuccess(true);
      } else {
        setServerError(res.error || "Failed to submit registration");
      }
    } catch (err: any) {
      setServerError(err.message || "An unexpected error occurred. Please try again.");
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
          <Link
            href="/login"
            className="text-xs font-bold text-[#0B2545] hover:text-[#d21f27] transition"
          >
            {language === "fr" ? "Se connecter" : "Sign In"}
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          {/* Header Banner */}
          <div className="bg-[#0B2545] p-6 sm:p-8 text-white relative overflow-hidden">
            <div className="absolute right-0 top-0 w-64 h-64 bg-[#d21f27]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-white text-[11px] font-semibold uppercase tracking-wider mb-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#d21f27]" />
                  {language === "fr" ? "Accréditation Entreprise" : "Enterprise Onboarding"}
                </span>
                <h1
                  className="text-2xl sm:text-3xl font-bold tracking-tight"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {t.auth.createAccount}
                </h1>
                <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-lg">
                  {t.auth.createSubtitle}
                </p>
              </div>
            </div>
          </div>

          {/* Form / Success Content */}
          <div className="p-6 sm:p-8">
            {isSuccess ? (
              /* Success State: Check Email */
              <div className="text-center py-6 animate-in fade-in zoom-in-95 duration-300">
                <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2
                  className="text-2xl font-bold text-[#0B2545] mb-2"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {t.auth.checkEmailTitle}
                </h2>
                <p className="text-sm text-slate-600 max-w-md mx-auto mb-2">
                  {t.auth.checkEmailDesc}{" "}
                  <strong className="text-slate-900 font-semibold">{submittedEmail}</strong>.
                </p>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-md mx-auto text-xs text-slate-600 leading-relaxed text-left mb-6">
                  <div className="flex items-start gap-2.5">
                    <FileCheck className="w-4 h-4 text-[#d21f27] flex-shrink-0 mt-0.5" />
                    <span>{t.auth.checkEmailInfo}</span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => router.push("/login")}
                    className="w-full sm:w-auto px-6 py-3 bg-[#0B2545] hover:bg-[#123661] text-white font-semibold text-xs rounded-xl transition cursor-pointer shadow-sm"
                  >
                    {t.auth.returnToLogin}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSuccess(false);
                    }}
                    className="w-full sm:w-auto px-6 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer"
                  >
                    {language === "fr" ? "Modifier la demande" : "Edit Application"}
                  </button>
                </div>
              </div>
            ) : (
              /* Registration Form */
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                {serverError && (
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                    {serverError}
                  </div>
                )}

                {/* Section 1: Contact Information */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1.5">
                    1. {language === "fr" ? "Coordonnées de l'Administrateur" : "Primary Account Administrator"}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Full Name */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        {t.auth.fullName} *
                      </label>
                      <div className="relative flex items-center">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          {...register("fullName")}
                          placeholder="e.g. Marc Tremblay"
                          className={`w-full bg-[#f8fafc] border ${
                            errors.fullName ? "border-red-400 focus:border-red-500 ring-1 ring-red-200" : "border-slate-200 focus:border-[#0B2545]"
                          } focus:bg-white rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition`}
                        />
                      </div>
                      {errors.fullName && (
                        <p className="text-[11px] text-red-600 mt-1">{errors.fullName.message}</p>
                      )}
                    </div>

                    {/* Corporate Email */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        {t.auth.email} *
                      </label>
                      <div className="relative flex items-center">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                          type="email"
                          {...register("email")}
                          placeholder="dispatch@company.ca"
                          className={`w-full bg-[#f8fafc] border ${
                            errors.email ? "border-red-400 focus:border-red-500 ring-1 ring-red-200" : "border-slate-200 focus:border-[#0B2545]"
                          } focus:bg-white rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition`}
                        />
                      </div>
                      {errors.email && (
                        <p className="text-[11px] text-red-600 mt-1">{errors.email.message}</p>
                      )}
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        {t.auth.phoneNumber} *
                      </label>
                      <div className="relative flex items-center">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                          type="tel"
                          {...register("phone")}
                          placeholder="+1 (514) 555-0199"
                          className={`w-full bg-[#f8fafc] border ${
                            errors.phone ? "border-red-400 focus:border-red-500 ring-1 ring-red-200" : "border-slate-200 focus:border-[#0B2545]"
                          } focus:bg-white rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition`}
                        />
                      </div>
                      {errors.phone && (
                        <p className="text-[11px] text-red-600 mt-1">{errors.phone.message}</p>
                      )}
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        {t.auth.password} *
                      </label>
                      <div className="relative flex items-center">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                          type={showPassword ? "text" : "password"}
                          {...register("password")}
                          placeholder="Min. 8 chars (1 uppercase, 1 number)"
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
                      {/* Password Strength Indicator */}
                      {passwordValue.length > 0 && (
                        <div className="mt-1.5 space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-500 font-medium">
                              {language === "fr" ? "Robustesse:" : "Password Strength:"}
                            </span>
                            <span className={`font-bold ${strength.text}`}>{strength.label}</span>
                          </div>
                          <div className="grid grid-cols-4 gap-1 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            {[1, 2, 3, 4].map((step) => (
                              <div
                                key={step}
                                className={`h-full rounded-full transition-all ${
                                  strengthScore >= step ? strength.color : "bg-slate-200"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                      {errors.password && (
                        <p className="text-[11px] text-red-600 mt-1">{errors.password.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section 2: Corporate & Operational Details */}
                <div className="space-y-4 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1.5">
                    2. {language === "fr" ? "Profil Corporatif & Expédition" : "Commercial Profile & Freight Needs"}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Company Name */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        {t.auth.companyName} *
                      </label>
                      <div className="relative flex items-center">
                        <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          {...register("companyName")}
                          placeholder="e.g. Laurentian Global Logistics Ltd."
                          className={`w-full bg-[#f8fafc] border ${
                            errors.companyName ? "border-red-400 focus:border-red-500 ring-1 ring-red-200" : "border-slate-200 focus:border-[#0B2545]"
                          } focus:bg-white rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition`}
                        />
                      </div>
                      {errors.companyName && (
                        <p className="text-[11px] text-red-600 mt-1">{errors.companyName.message}</p>
                      )}
                    </div>

                    {/* Industry */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        {t.auth.industry} *
                      </label>
                      <div className="relative flex items-center">
                        <Factory className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <select
                          {...register("industry")}
                          className="w-full bg-[#f8fafc] border border-slate-200 focus:border-[#0B2545] focus:bg-white rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-900 outline-none transition cursor-pointer"
                        >
                          {industriesEnum.map((ind) => (
                            <option key={ind} value={ind}>
                              {ind}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* City */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        {t.auth.city} *
                      </label>
                      <div className="relative flex items-center">
                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          {...register("city")}
                          placeholder="e.g. Montreal"
                          className={`w-full bg-[#f8fafc] border ${
                            errors.city ? "border-red-400 focus:border-red-500 ring-1 ring-red-200" : "border-slate-200 focus:border-[#0B2545]"
                          } focus:bg-white rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition`}
                        />
                      </div>
                      {errors.city && (
                        <p className="text-[11px] text-red-600 mt-1">{errors.city.message}</p>
                      )}
                    </div>

                    {/* Province */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        {t.auth.province} *
                      </label>
                      <select
                        {...register("province")}
                        className="w-full bg-[#f8fafc] border border-slate-200 focus:border-[#0B2545] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none transition cursor-pointer"
                      >
                        {provincesEnum.map((prov) => (
                          <option key={prov} value={prov}>
                            {prov} - {prov === "QC" ? "Quebec" : prov === "ON" ? "Ontario" : prov === "BC" ? "British Columbia" : prov === "AB" ? "Alberta" : prov}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Terms Agreement Checkbox */}
                <div className="pt-2">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      {...register("terms")}
                      className="mt-0.5 rounded border-slate-300 text-[#d21f27] focus:ring-[#d21f27]/30 w-4 h-4 cursor-pointer accent-[#d21f27]"
                    />
                    <span className="text-xs text-slate-600 leading-snug">
                      {t.auth.agreeTerms}
                    </span>
                  </label>
                  {errors.terms && (
                    <p className="text-[11px] text-red-600 mt-1 pl-6.5">{errors.terms.message}</p>
                  )}
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#d21f27] hover:bg-[#b51a21] active:scale-[0.99] text-white font-semibold py-3.5 px-6 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer disabled:opacity-60 mt-4"
                >
                  {isSubmitting ? (
                    <span>{t.auth.registering}</span>
                  ) : (
                    <>
                      <span>{t.auth.registerButton}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Return to Login */}
                <div className="text-center pt-2 text-xs text-slate-500">
                  {t.auth.haveAccount}{" "}
                  <Link
                    href="/login"
                    className="text-[#0B2545] hover:text-[#d21f27] font-bold transition ml-1"
                  >
                    {language === "fr" ? "Connectez-vous ici" : "Sign In here"}
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-xs text-slate-400">
        &copy; {new Date().getFullYear()} Transimex Canada Inc. Institutional Logistics Portal. All Rights Reserved.
      </footer>
    </div>
  );
}

"use client";

import React, { useState, Suspense, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { api } from "@/lib/api";
import {
  Eye,
  EyeOff,
  User,
  Building2,
  Mail,
  Lock,
  ArrowRight,
  Shield,
  Globe2,
  CheckCircle2,
  Phone,
  MapPin,
} from "lucide-react";

function AuthComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "signup" ? "signup" : "login";
  const urlError = searchParams.get("error");
  const { t, language, toggleLanguage } = useLanguage();

  const [activeTab, setActiveTab] = useState<"login" | "signup">(initialTab);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(urlError || null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [registerSuccess, setRegisterSuccess] = useState(false);

  // Form Fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(true);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "signup") {
      setActiveTab("signup");
    } else if (tab === "login") {
      setActiveTab("login");
    }
  }, [searchParams]);

  // Password strength calculation
  const getPasswordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const strength = getPasswordStrength(password);
  const strengthLabels = ["Weak", "Fair", "Good", "Strong"];
  const strengthColors = ["bg-red-500", "bg-amber-500", "bg-blue-500", "bg-emerald-500"];

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNeedsVerification(false);
    setResendStatus("idle");
    setLoading(true);

    try {
      const res = await api.auth.login({
        email,
        password,
        rememberMe,
      });

      if (res.success && res.user) {
        if (typeof window !== "undefined") {
          localStorage.setItem("transimex_user", JSON.stringify(res.user));
        }
        const role = res.user.role;
        const isStaff = role === "superadmin" || role === "admin" || role === "subadmin";
        const fromParam = searchParams.get("from");

        if (isStaff) {
          if (fromParam && fromParam.startsWith("/admin")) {
            router.push(fromParam);
          } else {
            router.push("/admin");
          }
        } else {
          if (fromParam && fromParam.startsWith("/dashboard")) {
            router.push(fromParam);
          } else {
            router.push("/dashboard");
          }
        }
      } else {
        setError(res.error || "Invalid credentials");
      }
    } catch (err: any) {
      setError(err.message || "Failed to log in");
      if (err.code === "EMAIL_NOT_VERIFIED") {
        setNeedsVerification(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) return;
    setResendStatus("sending");
    try {
      await api.auth.resendVerification(email);
    } finally {
      setResendStatus("sent");
    }
  };

  // Handle Registration
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!agreeTerms) {
      setError("Please agree to the Transimex Terms of Service & Compliance Policies");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      if (!fullName) {
        setError("Please provide your first and last name");
        return;
      }

      const res = await api.auth.register({
        fullName,
        email: email.trim().toLowerCase(),
        password,
        companyName: companyName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        industry: "Industrial",
        city: "Montreal",
        province: "QC",
        terms: agreeTerms,
      });

      if (res.success) {
        setRegisterSuccess(true);
      } else {
        setError(res.error || "Registration failed");
      }
    } catch (err: any) {
      setError(err.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = () => {
    setGoogleLoading(true);
    setError(null);
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
        <div className="w-full md:w-1/2 flex items-center justify-center p-4 sm:p-8 md:p-14 bg-white overflow-y-auto min-h-screen">
          <div className="w-full max-w-[420px] my-auto py-6">
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

            {registerSuccess ? (
              /* Success State Screen */
              <div className="text-center py-8 space-y-5 animate-in fade-in zoom-in-95">
                <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h2
                    className="text-2xl font-bold text-[#0B2545]"
                    style={{ fontFamily: "var(--font-playfair), 'Playfair Display', serif" }}
                  >
                    {t.auth.checkEmailTitle}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-xs mx-auto leading-relaxed">
                    {t.auth.checkEmailDesc} <strong>{email}</strong>. {t.auth.checkEmailInfo}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRegisterSuccess(false);
                    setActiveTab("login");
                  }}
                  className="w-full py-3.5 bg-[#0B2545] hover:bg-[#123661] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{t.auth.returnToLogin}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                {/* Title & Description with Smooth Slide Transitions */}
                <div className="relative mb-6 min-h-[72px]">
                  {/* Sign In Title */}
                  <div
                    className={`transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      activeTab === "login"
                        ? "opacity-100 translate-x-0 relative z-10"
                        : "opacity-0 -translate-x-4 absolute top-0 left-0 right-0 pointer-events-none -z-10"
                    }`}
                  >
                    <h2
                      className="text-3xl font-bold text-[#0B2545] tracking-tight leading-tight"
                      style={{
                        fontFamily: "var(--font-playfair), 'Playfair Display', serif",
                      }}
                    >
                      {t.auth.welcomeBack}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-2">
                      {t.auth.welcomeSubtitle}
                    </p>
                  </div>

                  {/* Create Account Title */}
                  <div
                    className={`transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      activeTab === "signup"
                        ? "opacity-100 translate-x-0 relative z-10"
                        : "opacity-0 translate-x-4 absolute top-0 left-0 right-0 pointer-events-none -z-10"
                    }`}
                  >
                    <h2
                      className="text-3xl font-bold text-[#0B2545] tracking-tight leading-tight"
                      style={{
                        fontFamily: "var(--font-playfair), 'Playfair Display', serif",
                      }}
                    >
                      {t.auth.createAccount}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-2">
                      {t.auth.createSubtitle}
                    </p>
                  </div>
                </div>

                {/* Sliding Segmented Tab Controller */}
                <div className="relative flex p-1 mb-6 bg-slate-100 rounded-xl select-none">
                  {/* Sliding Pill Indicator */}
                  <div
                    className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      activeTab === "login"
                        ? "left-1 translate-x-0"
                        : "left-1 translate-x-[calc(100%+0px)]"
                    }`}
                  />

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("login");
                      setError(null);
                      setNeedsVerification(false);
                      setResendStatus("idle");
                    }}
                    className={`relative z-10 flex-1 py-2 text-center text-xs sm:text-sm font-semibold rounded-lg transition-colors duration-200 cursor-pointer ${
                      activeTab === "login"
                        ? "text-[#0B2545] font-bold"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {language === "fr" ? "Connexion" : "Sign In"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("signup");
                      setError(null);
                      setNeedsVerification(false);
                      setResendStatus("idle");
                    }}
                    className={`relative z-10 flex-1 py-2 text-center text-xs sm:text-sm font-semibold rounded-lg transition-colors duration-200 cursor-pointer ${
                      activeTab === "signup"
                        ? "text-[#0B2545] font-bold"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {language === "fr" ? "Créer un compte" : "Create Account"}
                  </button>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{t.common.error}:</span> {error}
                    </div>
                    {needsVerification && (
                      <div className="mt-2 pt-2 border-t border-red-200/70">
                        {resendStatus === "sent" ? (
                          <span className="text-emerald-700 font-medium">
                            If that account exists, a new verification email has been sent.
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={handleResendVerification}
                            disabled={resendStatus === "sending"}
                            className="font-semibold text-[#0B2545] hover:text-[#d21f27] underline disabled:opacity-60 cursor-pointer"
                          >
                            {resendStatus === "sending" ? "Sending..." : "Resend verification email"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Form */}
                <form
                  onSubmit={activeTab === "login" ? handleLogin : handleSignUp}
                  className="space-y-4"
                  noValidate
                >
                  {/* Collapsible Signup Additional Fields */}
                  <div
                    className="grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                    style={{
                      gridTemplateRows: activeTab === "signup" ? "1fr" : "0fr",
                      opacity: activeTab === "signup" ? 1 : 0,
                    }}
                  >
                    <div className="overflow-hidden space-y-4">
                      {/* Name Fields (2 Columns on tablet/desktop) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            First Name *
                          </label>
                          <div className="relative flex items-center">
                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            <input
                              type="text"
                              required={activeTab === "signup"}
                              placeholder="Marc"
                              value={firstName}
                              onChange={(e) => setFirstName(e.target.value)}
                              className="w-full bg-[#f8fafc] border border-slate-200 focus:border-[#d21f27] focus:bg-white focus:ring-2 focus:ring-[#d21f27]/10 rounded-xl pl-10 pr-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Last Name *
                          </label>
                          <div className="relative flex items-center">
                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            <input
                              type="text"
                              required={activeTab === "signup"}
                              placeholder="Tremblay"
                              value={lastName}
                              onChange={(e) => setLastName(e.target.value)}
                              className="w-full bg-[#f8fafc] border border-slate-200 focus:border-[#d21f27] focus:bg-white focus:ring-2 focus:ring-[#d21f27]/10 rounded-xl pl-10 pr-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Company Name */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          {t.auth.companyName} *
                        </label>
                        <div className="relative flex items-center">
                          <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          <input
                            type="text"
                            required={activeTab === "signup"}
                            placeholder="e.g. Laurentian Global Logistics Ltd."
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            className="w-full bg-[#f8fafc] border border-slate-200 focus:border-[#d21f27] focus:bg-white focus:ring-2 focus:ring-[#d21f27]/10 rounded-xl pl-10 pr-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all"
                          />
                        </div>
                      </div>

                      {/* Phone Number */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          {t.auth.phoneNumber} *
                        </label>
                        <div className="relative flex items-center">
                          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          <input
                            type="tel"
                            required={activeTab === "signup"}
                            placeholder="+1 (514) 555-0199"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full bg-[#f8fafc] border border-slate-200 focus:border-[#d21f27] focus:bg-white focus:ring-2 focus:ring-[#d21f27]/10 rounded-xl pl-10 pr-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all"
                          />
                        </div>
                      </div>

                      {/* Address */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          {t.auth.address} *
                        </label>
                        <div className="relative flex items-center">
                          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          <input
                            type="text"
                            required={activeTab === "signup"}
                            placeholder="e.g. 1250 René-Lévesque Blvd W, Montreal, QC"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className="w-full bg-[#f8fafc] border border-slate-200 focus:border-[#d21f27] focus:bg-white focus:ring-2 focus:ring-[#d21f27]/10 rounded-xl pl-10 pr-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Email Field (Shared) */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      {t.auth.email} *
                    </label>
                    <div className="relative flex items-center">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        type="email"
                        required
                        placeholder="corporate@company.ca"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-[#f8fafc] border border-slate-200 focus:border-[#d21f27] focus:bg-white focus:ring-2 focus:ring-[#d21f27]/10 rounded-xl pl-10 pr-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Password Field (Shared) */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      {t.auth.password} *
                    </label>
                    <div className="relative flex items-center">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-[#f8fafc] border border-slate-200 focus:border-[#d21f27] focus:bg-white focus:ring-2 focus:ring-[#d21f27]/10 rounded-xl pl-10 pr-10 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Password Strength Indicator (in Create Account) */}
                    {activeTab === "signup" && password.length > 0 && (
                      <div className="mt-2 space-y-1 animate-in fade-in">
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span>{language === "fr" ? "Robustesse:" : "Password Strength:"}</span>
                          <span className="font-semibold">{strengthLabels[strength - 1] || "Weak"}</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1 h-1.5">
                          {[1, 2, 3, 4].map((step) => (
                            <div
                              key={step}
                              className={`rounded-full transition-all duration-300 ${
                                strength >= step ? strengthColors[strength - 1] : "bg-slate-200"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sub Actions: Remember Me vs Terms */}
                  <div className="relative min-h-[24px]">
                    {/* Remember Me & Forgot Password */}
                    <div
                      className={`transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                        activeTab === "login"
                          ? "opacity-100 translate-x-0 relative z-10"
                          : "opacity-0 -translate-x-4 absolute top-0 left-0 right-0 pointer-events-none -z-10"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <label className="flex items-center space-x-2 cursor-pointer select-none group">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="rounded border-slate-300 text-[#d21f27] focus:ring-[#d21f27]/30 w-4 h-4 cursor-pointer accent-[#d21f27]"
                          />
                          <span className="text-xs text-slate-600 group-hover:text-slate-900 transition-colors">
                            {t.auth.rememberMe}
                          </span>
                        </label>
                        <Link
                          href="/forgot-password"
                          className="text-xs text-[#d21f27] hover:text-[#b51a21] font-semibold transition-colors"
                        >
                          {t.auth.forgotPassword}
                        </Link>
                      </div>
                    </div>

                    {/* Terms Agreement */}
                    <div
                      className={`transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                        activeTab === "signup"
                          ? "opacity-100 translate-x-0 relative z-10"
                          : "opacity-0 translate-x-4 absolute top-0 left-0 right-0 pointer-events-none -z-10"
                      }`}
                    >
                      <label className="flex items-center space-x-2.5 cursor-pointer select-none group">
                        <input
                          type="checkbox"
                          checked={agreeTerms}
                          onChange={(e) => setAgreeTerms(e.target.checked)}
                          className="rounded border-slate-300 text-[#d21f27] focus:ring-[#d21f27]/30 w-4 h-4 cursor-pointer accent-[#d21f27]"
                        />
                        <span className="text-xs text-slate-600">
                          {t.auth.agreeTerms}
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#d21f27] hover:bg-[#b51a21] active:scale-[0.99] text-white font-semibold py-3.5 px-6 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-60 mt-4"
                  >
                    {loading ? (
                      <span>{t.common.loading}</span>
                    ) : (
                      <>
                        <span>
                          {activeTab === "signup"
                            ? t.auth.registerButton
                            : t.auth.signInButton}
                        </span>
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

                {/* Continue with Google Button */}
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={googleLoading}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99] text-slate-700 font-semibold text-sm rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-60"
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
                  <span>
                    {googleLoading
                      ? t.common.loading
                      : language === "fr"
                      ? "Continuer avec Google"
                      : "Continue with Google"}
                  </span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f9f9ff] flex items-center justify-center text-xs text-slate-500">
          Loading...
        </div>
      }
    >
      <AuthComponent />
    </Suspense>
  );
}

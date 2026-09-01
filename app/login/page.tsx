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
  Phone,
  ArrowRight,
  Shield,
  Globe2,
  CheckCircle2,
  Sparkles,
  MapPin,
  Briefcase,
} from "lucide-react";
import { IndustryType, ProvinceType } from "@/lib/validations/auth";

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
  const [registerSuccess, setRegisterSuccess] = useState(false);

  // Sign In Form States
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  // Sign Up Form States
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [industry, setIndustry] = useState<IndustryType>("Industrial");
  const [city, setCity] = useState("Montreal");
  const [province, setProvince] = useState<ProvinceType>("QC");
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

  const strength = getPasswordStrength(signupPassword);
  const strengthLabels = ["Weak", "Fair", "Good", "Strong"];
  const strengthColors = ["bg-red-500", "bg-amber-500", "bg-blue-500", "bg-emerald-500"];

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.auth.login({
        email: loginEmail,
        password: loginPassword,
        rememberMe,
      });

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
        setError(res.error || "Invalid credentials");
      }
    } catch (err: any) {
      setError(err.message || "Failed to log in");
    } finally {
      setLoading(false);
    }
  };

  // Handle Registration
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!agreeTerms) {
      setError("Please agree to the Transimex Terms & Commercial Policy");
      return;
    }

    if (signupPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      const res = await api.auth.register({
        fullName: fullName.trim() || "Marc Tremblay",
        email: signupEmail,
        password: signupPassword,
        companyName: companyName.trim() || "Laurentian Global Logistics Ltd.",
        phone: phone || "+1 (514) 555-0199",
        industry,
        city: city || "Montreal",
        province,
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

  const fillMock = (type: "client" | "admin") => {
    setActiveTab("login");
    if (type === "client") {
      setLoginEmail("client@transimex.ca");
      setLoginPassword("Transimex2026!");
    } else {
      setLoginEmail("admin@transimex.ca");
      setLoginPassword("Transimex2026!");
    }
    setError(null);
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

          <div className="relative z-20 flex flex-col justify-between h-full p-8 lg:p-12">
            {/* Logo and Brand */}
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 bg-white rounded-xl p-1.5 flex items-center justify-center shadow-xs">
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
            <div className="max-w-xl pb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-[11px] font-semibold uppercase tracking-wider mb-3">
                <Shield className="w-3.5 h-3.5 text-[#d21f27]" />
                Institutional Logistics Portal
              </span>
              <h2
                className="text-3xl lg:text-[40px] font-bold text-white mb-3 text-balance leading-[1.15] tracking-[-0.02em]"
                style={{
                  fontFamily: "var(--font-playfair), 'Playfair Display', serif",
                }}
              >
                Global Reach. Personal Touch.
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-md">
                Institutional-grade freight management, cross-border customs compliance, and full visibility cargo logistics across North America.
              </p>
            </div>

            {/* Bottom Certifications */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
              <span>PIP &bull; C-TPAT &bull; CBSA Verified</span>
              <span>&copy; {new Date().getFullYear()} Transimex Canada</span>
            </div>
          </div>
        </div>

        {/* Right Side: Interactive Compact Sliding Form */}
        <div className="w-full md:w-1/2 flex flex-col justify-center items-center px-4 sm:px-8 lg:px-12 py-4 bg-white overflow-y-auto min-h-screen">
          <div className="w-full max-w-[490px] my-auto py-2">
            {/* Top Bar on Mobile & Language Switcher */}
            <div className="flex items-center justify-between mb-3">
              <div className="md:hidden">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 bg-[#0B2545] rounded-lg p-1 flex items-center justify-center">
                    <span className="text-white font-bold text-xs">T</span>
                  </div>
                  <span
                    className="font-bold text-base text-[#0B2545]"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    Transimex
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleLanguage}
                className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-[11px] font-semibold text-slate-700 transition shadow-2xs cursor-pointer"
              >
                <Globe2 className="w-3.5 h-3.5 text-[#0B2545]" />
                <span>{language.toUpperCase()}</span>
              </button>
            </div>

            {registerSuccess ? (
              /* Success State Screen */
              <div className="text-center py-6 space-y-4 animate-in fade-in zoom-in-95">
                <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h2
                    className="text-2xl font-bold text-[#0B2545]"
                    style={{ fontFamily: "var(--font-playfair), 'Playfair Display', serif" }}
                  >
                    {t.auth.checkEmailTitle}
                  </h2>
                  <p className="text-xs text-slate-600 mt-2 max-w-xs mx-auto leading-relaxed">
                    {t.auth.checkEmailDesc} <strong>{signupEmail}</strong>. {t.auth.checkEmailInfo}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRegisterSuccess(false);
                    setActiveTab("login");
                    setLoginEmail(signupEmail);
                  }}
                  className="w-full py-3 bg-[#0B2545] hover:bg-[#123661] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{t.auth.returnToLogin}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                {/* Dynamic Title with Sliding Transitions */}
                <div className="relative mb-3 min-h-[52px]">
                  {/* Sign In Header */}
                  <div
                    className={`transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      activeTab === "login"
                        ? "opacity-100 translate-x-0 relative z-10"
                        : "opacity-0 -translate-x-4 absolute top-0 left-0 right-0 pointer-events-none -z-10"
                    }`}
                  >
                    <h2
                      className="text-2xl sm:text-[26px] font-bold text-[#0B2545] tracking-tight leading-tight"
                      style={{
                        fontFamily: "var(--font-playfair), 'Playfair Display', serif",
                      }}
                    >
                      {t.auth.welcomeBack}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {t.auth.welcomeSubtitle}
                    </p>
                  </div>

                  {/* Create Account Header */}
                  <div
                    className={`transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      activeTab === "signup"
                        ? "opacity-100 translate-x-0 relative z-10"
                        : "opacity-0 translate-x-4 absolute top-0 left-0 right-0 pointer-events-none -z-10"
                    }`}
                  >
                    <h2
                      className="text-2xl sm:text-[26px] font-bold text-[#0B2545] tracking-tight leading-tight"
                      style={{
                        fontFamily: "var(--font-playfair), 'Playfair Display', serif",
                      }}
                    >
                      {t.auth.createAccount}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {t.auth.createSubtitle}
                    </p>
                  </div>
                </div>

                {/* Sliding Segmented Tab Controller */}
                <div className="relative flex p-1 mb-3 bg-slate-100 rounded-xl select-none">
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
                    }}
                    className={`relative z-10 flex-1 py-1.5 text-center text-xs font-semibold rounded-lg transition-colors duration-200 cursor-pointer ${
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
                    }}
                    className={`relative z-10 flex-1 py-1.5 text-center text-xs font-semibold rounded-lg transition-colors duration-200 cursor-pointer ${
                      activeTab === "signup"
                        ? "text-[#0B2545] font-bold"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {language === "fr" ? "Créer un compte" : "Create Account"}
                  </button>
                </div>

                {/* Quick Test Logins Helper (only in login mode) */}
                {activeTab === "login" && (
                  <div className="mb-3 p-2.5 bg-slate-50 border border-slate-200/90 rounded-xl animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1.5">
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
                )}

                {/* Error Banner */}
                {error && (
                  <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2 animate-in fade-in">
                    <span className="font-semibold">{t.common.error}:</span> {error}
                  </div>
                )}

                {/* Unified Form */}
                <form
                  onSubmit={activeTab === "login" ? handleLogin : handleSignUp}
                  className="space-y-2.5"
                  noValidate
                >
                  {/* SIGN IN FORM (Single Column) */}
                  {activeTab === "login" && (
                    <div className="space-y-2.5 animate-in fade-in duration-200">
                      {/* Email Field */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {t.auth.email} *
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="email"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            placeholder="corporate@company.ca"
                            required
                            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#0B2545] focus:ring-1 focus:ring-[#0B2545] outline-none transition"
                          />
                        </div>
                      </div>

                      {/* Password Field */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {t.auth.password} *
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type={showPassword ? "text" : "password"}
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            placeholder="••••••••••••"
                            required
                            className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#0B2545] focus:ring-1 focus:ring-[#0B2545] outline-none transition"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Remember Me & Forgot Password */}
                      <div className="flex items-center justify-between pt-0.5">
                        <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-600">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-slate-300 text-[#0B2545] focus:ring-[#0B2545]"
                          />
                          <span>{t.auth.rememberMe}</span>
                        </label>
                        <Link
                          href="/forgot-password"
                          className="text-xs font-semibold text-[#d21f27] hover:underline"
                        >
                          {t.auth.forgotPassword}
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* SIGN UP FORM (Space-Efficient 2-Column Grid Layout) */}
                  {activeTab === "signup" && (
                    <div className="space-y-2.5 animate-in fade-in duration-200">
                      {/* Row 1: Full Name & Company Name */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            {t.auth.fullName} *
                          </label>
                          <div className="relative">
                            <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                              type="text"
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              placeholder="Marc Tremblay"
                              required
                              className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#0B2545] outline-none transition"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            {t.auth.companyName} *
                          </label>
                          <div className="relative">
                            <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                              type="text"
                              value={companyName}
                              onChange={(e) => setCompanyName(e.target.value)}
                              placeholder="Laurentian Logistics"
                              required
                              className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#0B2545] outline-none transition"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Row 2: Corporate Email & Phone */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            {t.auth.email} *
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                              type="email"
                              value={signupEmail}
                              onChange={(e) => setSignupEmail(e.target.value)}
                              placeholder="dispatch@company.ca"
                              required
                              className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#0B2545] outline-none transition"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            {t.auth.phoneNumber} *
                          </label>
                          <div className="relative">
                            <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                              type="tel"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              placeholder="+1 (514) 555-0199"
                              className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#0B2545] outline-none transition"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Row 3: Password & Industry */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            {t.auth.password} *
                          </label>
                          <div className="relative">
                            <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                              type={showPassword ? "text" : "password"}
                              value={signupPassword}
                              onChange={(e) => setSignupPassword(e.target.value)}
                              placeholder="Min. 8 chars"
                              required
                              className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#0B2545] outline-none transition"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                          {/* Password Strength Meter */}
                          {signupPassword.length > 0 && (
                            <div className="mt-1 space-y-0.5">
                              <div className="flex items-center justify-between text-[9px] text-slate-500">
                                <span>Strength:</span>
                                <span className="font-semibold">{strengthLabels[strength - 1] || "Weak"}</span>
                              </div>
                              <div className="grid grid-cols-4 gap-1 h-1">
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
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            {t.auth.industry}
                          </label>
                          <div className="relative">
                            <Briefcase className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                            <select
                              value={industry}
                              onChange={(e) => setIndustry(e.target.value as IndustryType)}
                              className="w-full pl-8 pr-6 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:border-[#0B2545] outline-none transition cursor-pointer"
                            >
                              <option value="Automotive">Automotive</option>
                              <option value="Manufacturing">Manufacturing</option>
                              <option value="Pharma">Pharma</option>
                              <option value="Retail">Retail</option>
                              <option value="Food">Food &amp; Beverage</option>
                              <option value="Industrial">Industrial</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Row 4: City & Province */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            {t.auth.city}
                          </label>
                          <div className="relative">
                            <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                              type="text"
                              value={city}
                              onChange={(e) => setCity(e.target.value)}
                              placeholder="Montreal"
                              className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#0B2545] outline-none transition"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            {t.auth.province}
                          </label>
                          <select
                            value={province}
                            onChange={(e) => setProvince(e.target.value as ProvinceType)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:border-[#0B2545] outline-none transition cursor-pointer"
                          >
                            <option value="QC">QC - Quebec</option>
                            <option value="ON">ON - Ontario</option>
                            <option value="BC">BC - British Columbia</option>
                            <option value="AB">AB - Alberta</option>
                            <option value="MB">MB - Manitoba</option>
                            <option value="SK">SK - Saskatchewan</option>
                            <option value="NB">NB - New Brunswick</option>
                            <option value="NS">NS - Nova Scotia</option>
                          </select>
                        </div>
                      </div>

                      {/* Terms Agreement */}
                      <div className="pt-0.5">
                        <label className="flex items-start gap-2 cursor-pointer select-none text-[11px] text-slate-600">
                          <input
                            type="checkbox"
                            checked={agreeTerms}
                            onChange={(e) => setAgreeTerms(e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-slate-300 text-[#0B2545] focus:ring-[#0B2545] mt-0.5"
                          />
                          <span className="leading-tight">
                            I agree to Transimex Canada's Terms of Service &amp; Compliance Policy.
                          </span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Submit CTA Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-[#d21f27] hover:bg-[#b0181f] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm transition transform active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 mt-1"
                  >
                    {loading ? (
                      <span>{t.common.loading}</span>
                    ) : (
                      <>
                        <span>{activeTab === "login" ? t.auth.signInButton : t.auth.registerButton}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Divider */}
                <div className="relative my-3 text-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <span className="relative px-3 bg-white text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {language === "fr" ? "Ou continuer avec" : "Or continue with"}
                  </span>
                </div>

                {/* Google SSO Button */}
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={googleLoading}
                  className="w-full py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition flex items-center justify-center gap-2.5 shadow-2xs cursor-pointer disabled:opacity-70"
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
                  <span>{googleLoading ? t.common.loading : language === "fr" ? "Continuer avec Google" : "Continue with Google"}</span>
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

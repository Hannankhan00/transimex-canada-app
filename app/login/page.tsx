"use client";

import React, { useState, Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Eye,
  EyeOff,
  User,
  Building2,
  Mail,
  Lock,
  Sparkles,
  ArrowRight,
} from "lucide-react";

function AuthComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("mode") === "signup" ? "signup" : "signup";

  const [activeTab, setActiveTab] = useState<"login" | "signup">(initialTab);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [rememberMe, setRememberMe] = useState(true);

  // Demo Credentials Quick-fill
  const fillDemoCredentials = () => {
    setError(null);
    if (activeTab === "signup") {
      setFullName("Jean Tremblay");
      setCompanyName("Acme Corp");
      setEmail("freight@acmecorp.com");
      setPassword("AcmeCorp2026!");
      setAgreeTerms(true);
    } else {
      setEmail("freight@acmecorp.com");
      setPassword("AcmeCorp2026!");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invalid email or password");
      }

      if (typeof window !== "undefined" && data.user) {
        localStorage.setItem("transimex_user", JSON.stringify(data.user));
      }

      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to log in");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!agreeTerms) {
      setError("Please agree to the Transimex Logistics Terms & Privacy Policy");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName.trim() || "Jean Tremblay",
          email,
          password,
          companyName: companyName.trim() || "Acme Corp",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create account");
      }

      if (typeof window !== "undefined" && data.user) {
        localStorage.setItem("transimex_user", JSON.stringify(data.user));
      }

      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to register account");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      // Mock Google SSO sign-in / registration
      const mockGoogleUser = {
        userId: "google_client_demo",
        name: fullName || "Jean Tremblay",
        email: email || "freight@acmecorp.com",
        companyName: companyName || "Acme Corp",
        role: "client",
        provider: "google",
      };

      if (typeof window !== "undefined") {
        localStorage.setItem("transimex_user", JSON.stringify(mockGoogleUser));
      }

      // Simulate authentication delay for smooth UX
      setTimeout(() => {
        router.push("/dashboard");
      }, 600);
    } catch (err: any) {
      setError("Google authentication failed. Please try with email/password.");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="bg-[#f9f9ff] text-[#111c2d] min-h-screen flex antialiased">
      <div className="flex flex-col md:flex-row w-full min-h-screen">
        {/* Left Side: Hero Image & Branding */}
        <div className="hidden md:flex md:w-1/2 relative bg-[#0B2545] overflow-hidden">
          <div className="absolute inset-0 z-0">
            <Image
              src="/assets/login-img.png"
              alt="Transimex Canada Fleet and Logistics Warehouse Facility"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
              className="w-full h-full object-cover opacity-60 mix-blend-overlay"
            />
          </div>

          {/* Heavy Navy Overlay */}
          <div className="absolute inset-0 bg-[#0B2545]/90 z-10"></div>

          <div className="relative z-20 flex flex-col justify-between h-full p-10 lg:p-12">
            {/* Logo and Brand */}
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-white rounded-md p-1.5 flex items-center justify-center shadow-xs">
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
                <p className="text-[10px] text-white/70 uppercase tracking-wider font-semibold">
                  Canada Logistics
                </p>
              </div>
            </div>

            {/* Hero Message */}
            <div className="max-w-xl pb-10">
              <h1
                className="text-4xl lg:text-[48px] font-bold text-white mb-6 text-balance leading-[1.1] tracking-[-0.02em]"
                style={{
                  fontFamily: "var(--font-playfair), 'Playfair Display', serif",
                }}
              >
                Global Reach. Personal Touch.
              </h1>
              <p className="text-base text-white/70 leading-[1.6]">
                Institutional-grade freight management, cross-border customs
                compliance, and full visibility cargo logistics across North
                America.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Authentication Form */}
        <div className="w-full md:w-1/2 flex items-center justify-center p-6 sm:p-10 md:p-12 bg-white overflow-y-auto">
          <div className="w-full max-w-md my-auto py-6">
            {/* Title & Subtitle */}
            <div className="mb-6">
              <h2
                className="text-3xl sm:text-[34px] font-bold text-[#0B2545] tracking-tight leading-tight"
                style={{
                  fontFamily: "var(--font-playfair), 'Playfair Display', serif",
                }}
              >
                {activeTab === "signup" ? "Create Client Account" : "Sign In to Portal"}
              </h2>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                {activeTab === "signup"
                  ? "Register your corporate logistics account to start shipping with Transimex."
                  : "Access your Transimex corporate logistics dashboard and shipments."}
              </p>
            </div>

            {/* Segmented Pill Tabs */}
            <div className="bg-[#f0f4f9] p-1 rounded-xl flex gap-1 mb-4">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("login");
                  setError(null);
                }}
                className={`flex-1 py-2 text-center text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === "login"
                    ? "bg-white text-[#0B2545] shadow-xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("signup");
                  setError(null);
                }}
                className={`flex-1 py-2 text-center text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === "signup"
                    ? "bg-white text-[#0B2545] shadow-xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Quick-fill Demo Credentials Button */}
            <button
              type="button"
              onClick={fillDemoCredentials}
              className="w-full py-2.5 px-3 bg-[#fff1f2] border border-[#fecdd3] hover:bg-[#ffe4e6] text-[#d21f27] rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer mb-6"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#d21f27]" />
              <span>Quick-fill Demo Credentials (Acme Corp)</span>
            </button>

            {/* Error banner */}
            {error && (
              <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                <span className="font-semibold">Error:</span> {error}
              </div>
            )}

            {/* ----------------- SIGN UP FORM ----------------- */}
            {activeTab === "signup" && (
              <form onSubmit={handleSignUp} className="space-y-4">
                {/* Full Name */}
                <div>
                  <label
                    htmlFor="fullName"
                    className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                  >
                    Full Name
                  </label>
                  <div className="relative flex items-center">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="fullName"
                      type="text"
                      required
                      placeholder="e.g. Jean Tremblay"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-slate-200 focus:border-[#d21f27] focus:bg-white focus:ring-2 focus:ring-[#d21f27]/10 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Company Name */}
                <div>
                  <label
                    htmlFor="companyName"
                    className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                  >
                    Company Name
                  </label>
                  <div className="relative flex items-center">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="companyName"
                      type="text"
                      required
                      placeholder="Acme Corp"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-slate-200 focus:border-[#d21f27] focus:bg-white focus:ring-2 focus:ring-[#d21f27]/10 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Corporate Email Address */}
                <div>
                  <label
                    htmlFor="signupEmail"
                    className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                  >
                    Corporate Email Address
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="signupEmail"
                      type="email"
                      required
                      placeholder="freight@acmecorp.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-slate-200 focus:border-[#d21f27] focus:bg-white focus:ring-2 focus:ring-[#d21f27]/10 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="signupPassword"
                    className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                  >
                    Password
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="signupPassword"
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
                      {showPassword ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Terms Agreement */}
                <div className="pt-1">
                  <label className="flex items-center space-x-2.5 cursor-pointer select-none group">
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="rounded border-slate-300 text-[#d21f27] focus:ring-[#d21f27]/30 w-4 h-4 cursor-pointer accent-[#d21f27]"
                    />
                    <span className="text-xs text-slate-600 group-hover:text-slate-900 transition-colors">
                      I agree to Transimex Logistics Terms &amp; Privacy
                    </span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#d21f27] hover:bg-[#b51a21] active:scale-[0.99] text-white font-semibold py-3.5 px-6 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-60 mt-4"
                >
                  {loading ? (
                    <span>Creating Account...</span>
                  ) : (
                    <>
                      <span>Create Account &amp; Open Portal</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* ----------------- SIGN IN FORM ----------------- */}
            {activeTab === "login" && (
              <form onSubmit={handleLogin} className="space-y-4">
                {/* Corporate Email Address */}
                <div>
                  <label
                    htmlFor="loginEmail"
                    className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                  >
                    Corporate Email Address
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="loginEmail"
                      type="email"
                      required
                      placeholder="freight@acmecorp.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-slate-200 focus:border-[#d21f27] focus:bg-white focus:ring-2 focus:ring-[#d21f27]/10 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="loginPassword"
                    className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                  >
                    Password
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="loginPassword"
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
                      {showPassword ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center space-x-2 cursor-pointer select-none group">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-300 text-[#d21f27] focus:ring-[#d21f27]/30 w-4 h-4 cursor-pointer accent-[#d21f27]"
                    />
                    <span className="text-xs text-slate-600 group-hover:text-slate-900 transition-colors">
                      Remember me
                    </span>
                  </label>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      alert("Please contact dispatch support at support@transimex.ca");
                    }}
                    className="text-xs text-[#d21f27] hover:text-[#b51a21] font-semibold transition-colors"
                  >
                    Forgot password?
                  </a>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#d21f27] hover:bg-[#b51a21] active:scale-[0.99] text-white font-semibold py-3.5 px-6 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-60 mt-4"
                >
                  {loading ? (
                    <span>Signing In...</span>
                  ) : (
                    <>
                      <span>Sign In &amp; Open Portal</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Divider */}
            <div className="relative my-6 flex items-center justify-center">
              <div className="w-full border-t border-slate-200" />
              <span className="bg-white px-3 text-[11px] uppercase tracking-wider text-slate-400 font-semibold absolute">
                Or continue with
              </span>
            </div>

            {/* Continue with Google Button */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-60"
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
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#f9f9ff]">
          <div className="w-8 h-8 border-2 border-[#D21F27] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AuthComponent />
    </Suspense>
  );
}

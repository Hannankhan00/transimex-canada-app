"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import TransimexLogo from "@/components/TransimexLogo";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { CheckCircle2, AlertCircle, ArrowRight, Loader2, ShieldCheck, Globe2 } from "lucide-react";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { language, toggleLanguage } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setErrorMessage("No verification token provided.");
      return;
    }

    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSuccess(true);
        } else {
          setErrorMessage(data.error || "Invalid or expired verification token.");
        }
      })
      .catch(() => {
        setErrorMessage("Something went wrong while verifying your email. Please try again.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

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

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          {/* Top Banner */}
          <div className="bg-[#0B2545] p-6 sm:p-8 text-white text-center relative overflow-hidden">
            <div className="absolute right-0 top-0 w-48 h-48 bg-[#d21f27]/10 rounded-full blur-2xl pointer-events-none" />
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-white text-[11px] font-semibold uppercase tracking-wider mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#d21f27]" />
              Account Verification
            </span>
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Email Confirmation
            </h1>
          </div>

          <div className="p-6 sm:p-8 text-center">
            {loading ? (
              <div className="py-8 space-y-3">
                <Loader2 className="w-8 h-8 text-[#d21f27] animate-spin mx-auto" />
                <p className="text-xs text-slate-600 font-medium">
                  Verifying corporate credentials and activating portal access...
                </p>
              </div>
            ) : success ? (
              <div className="py-4 space-y-4 animate-in fade-in zoom-in-95">
                <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h2
                    className="text-xl font-bold text-[#0B2545]"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    Email Verified Successfully!
                  </h2>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    Your corporate dispatch credentials have been verified. You can now access your Transimex Client Dashboard.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="w-full py-3.5 bg-[#0B2545] hover:bg-[#123661] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Continue to Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="py-4 space-y-4 animate-in fade-in">
                <div className="w-16 h-16 bg-red-50 border border-red-200 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <div>
                  <h2
                    className="text-xl font-bold text-[#0B2545]"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    Verification Issue
                  </h2>
                  <p className="text-xs text-red-600 mt-2">{errorMessage}</p>
                </div>
                <Link
                  href="/login"
                  className="inline-block w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
                >
                  Return to Sign In
                </Link>
              </div>
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

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center text-xs text-slate-500">Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}

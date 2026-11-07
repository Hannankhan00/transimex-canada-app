"use client";

import React from "react";
import Image from "next/image";
import { Globe2, Shield } from "lucide-react";
import TransimexLogo from "@/components/TransimexLogo";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface Props {
  /** Headline and paragraph on the navy panel. */
  title: string;
  text: string;
  /** Extra block under the paragraph (the sign-up progress steps, for example). */
  extra?: React.ReactNode;
  /** Tailwind max-width class for the form column. */
  widthClass?: string;
  children: React.ReactNode;
}

/** The split-screen layout shared by sign in, create account and complete profile, so they always look the same. */
export default function AuthShell({ title, text, extra, widthClass = "max-w-[420px]", children }: Props) {
  const { language, toggleLanguage } = useLanguage();

  return (
    <div className="bg-[#f9f9ff] text-[#111c2d] min-h-screen flex antialiased">
      <div className="flex flex-col md:flex-row w-full min-h-screen">
        {/* Left: image and brand statement */}
        <div className="hidden md:flex md:w-1/2 relative bg-[#0B2545] overflow-hidden flex-col justify-between">
          <div className="absolute inset-0 z-0">
            <Image
              src="/assets/login-hero.webp"
              alt="Transimex Canada Ocean Freight and Port Terminal Logistics"
              fill
              priority
              sizes="50vw"
              className="object-cover object-center"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B2545] via-[#0B2545]/75 to-[#0B2545]/40 z-10" />
          <div className="absolute inset-0 bg-[#0B2545]/20 mix-blend-multiply z-10" />

          <div className="relative z-20 flex flex-col justify-between h-full p-10 lg:p-14">
            <div>
              <TransimexLogo variant="dark" size="lg" />
            </div>

            <div className="max-w-xl pb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-[11px] font-semibold uppercase tracking-wider mb-4">
                <Shield className="w-3.5 h-3.5 text-[#d21f27]" />
                {language === "fr" ? "Portail logistique institutionnel" : "Institutional Logistics Portal"}
              </span>
              <h2
                className="text-4xl lg:text-[44px] font-bold text-white mb-4 text-balance leading-[1.1] tracking-[-0.02em]"
                style={{ fontFamily: "var(--font-playfair), 'Playfair Display', serif" }}
              >
                {title}
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed max-w-md">{text}</p>
              {extra}
            </div>

            <div className="pt-6 border-t border-white/10 text-xs text-slate-400">
              <span>&copy; {new Date().getFullYear()} Transimex Canada</span>
            </div>
          </div>
        </div>

        {/* Right: the form */}
        <div className="w-full md:w-1/2 flex items-center justify-center p-4 sm:p-8 md:p-14 bg-white overflow-y-auto min-h-screen">
          <div className={`w-full ${widthClass} my-auto py-6`}>
            <div className="flex items-center justify-between mb-8">
              <div className="md:hidden">
                <TransimexLogo size="sm" />
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
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

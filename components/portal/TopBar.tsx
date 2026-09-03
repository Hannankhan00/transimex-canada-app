"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { api } from "@/lib/api";
import {
  Menu,
  Globe2,
  Plus,
  LogOut,
  Building2,
  User,
  Shield,
  ChevronDown,
  Search,
  Bell,
  Check,
} from "lucide-react";

interface TopBarProps {
  onOpenMobileMenu: () => void;
  user: {
    name?: string;
    email?: string;
    companyName?: string;
    role?: string;
  } | null;
  unreadCount?: number;
}

export default function TopBar({
  onOpenMobileMenu,
  user,
  unreadCount = 3,
}: TopBarProps) {
  const router = useRouter();
  const { t, language, setLanguage } = useLanguage();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setLangMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await api.auth.logout();
    router.push("/login");
  };

  const handleNewQuote = () => {
    router.push("/dashboard/quotes?new=true");
  };

  const displayName = user?.name || "Client User";
  const displayCompany = user?.companyName || "Organization Account";
  const displayEmail = user?.email || "";
  const isStaff = user?.role === "admin" || user?.role === "superadmin" || user?.role === "subadmin";

  return (
    <header className="sticky top-0 z-20 h-16 bg-white border-b border-slate-200/90 shadow-2xs px-4 sm:px-6 lg:px-8 flex items-center justify-between">
      {/* Left Area: Mobile Menu & Search / Page Context */}
      <div className="flex items-center gap-3 flex-1 max-w-lg">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-lg text-slate-600 hover:text-[#0B2545] hover:bg-slate-100 transition"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Logistics Quick Search */}
        <div className="relative w-full hidden sm:flex items-center">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder={t.topBar.searchPlaceholder}
            className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-[#0B2545] focus:ring-1 focus:ring-[#0B2545]/10 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition"
          />
        </div>
      </div>

      {/* Right Area: Language Switcher, Action Button & User Profile */}
      <div className="flex items-center gap-2 sm:gap-3.5">
        {/* Bilingual Language Switcher Dropdown */}
        <div className="relative" ref={langRef}>
          <button
            type="button"
            onClick={() => setLangMenuOpen(!langMenuOpen)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition shadow-2xs cursor-pointer"
            title="Toggle English / French"
          >
            <Globe2 className="w-4 h-4 text-[#0B2545]" />
            <span className="font-bold">{language.toUpperCase()}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {langMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-36 bg-white rounded-xl shadow-lg border border-slate-200 py-1 text-xs z-30 animate-in fade-in zoom-in-95 duration-150">
              <button
                type="button"
                onClick={() => {
                  setLanguage("en");
                  setLangMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2 text-left hover:bg-slate-50 transition cursor-pointer ${
                  language === "en" ? "font-bold text-[#0B2545] bg-slate-50" : "text-slate-700"
                }`}
              >
                <span>English (EN)</span>
                {language === "en" && <Check className="w-3.5 h-3.5 text-[#D21F27]" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setLanguage("fr");
                  setLangMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2 text-left hover:bg-slate-50 transition cursor-pointer ${
                  language === "fr" ? "font-bold text-[#0B2545] bg-slate-50" : "text-slate-700"
                }`}
              >
                <span>Français (FR)</span>
                {language === "fr" && <Check className="w-3.5 h-3.5 text-[#D21F27]" />}
              </button>
            </div>
          )}
        </div>

        {/* Notifications Quick Link */}
        <button
          type="button"
          onClick={() => router.push("/dashboard/notifications")}
          className="relative p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-[#0B2545] transition shadow-2xs cursor-pointer"
          title={t.topBar.notificationsTooltip}
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#D21F27] text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Primary Action Button: Red #D21F27 CTA */}
        <button
          type="button"
          onClick={handleNewQuote}
          className="flex items-center gap-1.5 px-2.5 sm:px-4 py-2 bg-[#D21F27] hover:bg-[#b51a21] active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-sm hover:shadow-md transition cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span className="hidden xs:inline">{t.topBar.newQuote}</span>
        </button>

        {/* User Avatar / Profile Dropdown */}
        <div className="relative pl-1 border-l border-slate-200" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100/70 transition cursor-pointer"
          >
            <div className="w-8 sm:w-9 h-8 sm:h-9 rounded-xl bg-[#0B2545] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
              {displayName.charAt(0)}
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-900 leading-tight">
                {displayName}
              </span>
              <span className="text-[10px] text-slate-500 truncate max-w-[140px]">
                {displayCompany}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-72 sm:w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-30 animate-in fade-in zoom-in-95 duration-150">
              {/* Profile Card Summary */}
              <div className="p-3 bg-slate-50 rounded-xl mb-1 border border-slate-100">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    {t.topBar.signedInAs}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isStaff
                        ? "bg-amber-100 text-amber-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {isStaff ? t.topBar.staffAccount : t.topBar.clientAccount}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-900">{displayName}</p>
                <p className="text-[11px] text-slate-500 truncate">{displayEmail}</p>
                <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-200/80 text-[11px] text-slate-700 font-medium">
                  <Building2 className="w-3.5 h-3.5 text-[#d21f27]" />
                  <span className="truncate">{displayCompany}</span>
                </div>
              </div>

              {/* Navigation Actions */}
              <div className="py-1 space-y-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    router.push("/dashboard/account");
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 font-medium transition cursor-pointer"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  <span>{t.nav.account}</span>
                </button>

                {isStaff && (
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      router.push("/admin");
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-amber-700 hover:bg-amber-50 font-bold transition cursor-pointer"
                  >
                    <Shield className="w-4 h-4 text-amber-600" />
                    <span>{t.nav.adminPanel}</span>
                  </button>
                )}
              </div>

              <div className="pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 font-bold text-xs transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t.topBar.logout}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

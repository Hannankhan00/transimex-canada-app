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
  Truck,
  Sparkles,
  Layers,
  Radio,
} from "lucide-react";

interface AdminTopBarProps {
  onOpenMobileMenu: () => void;
  user: {
    name?: string;
    email?: string;
    companyName?: string;
    role?: string;
  } | null;
  onOpenNewShipmentModal?: () => void;
}

export default function AdminTopBar({
  onOpenMobileMenu,
  user,
  onOpenNewShipmentModal,
}: AdminTopBarProps) {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
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

  const displayName = user?.name || "Transimex Staff";
  const displayCompany = user?.companyName || "Transimex Canada Operations";
  const displayEmail = user?.email || "";
  const displayRole = (user?.role || "admin").toUpperCase();

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs px-4 sm:px-6 lg:px-8 flex items-center justify-between">
      {/* Left Area: Mobile Menu & Operations Search */}
      <div className="flex items-center gap-3 flex-1 max-w-lg">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-lg text-slate-600 hover:text-[#0B2545] hover:bg-slate-100 transition cursor-pointer"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Logistics Quick Search */}
        <div className="relative w-full hidden sm:flex items-center">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder={
              language === "fr"
                ? "Recherche de chargement, soumission, client ou CBSA..."
                : "Search shipments, quotes, manifests, or CBSA entry..."
            }
            className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-[#0B2545] focus:ring-2 focus:ring-[#0B2545]/10 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition"
          />
        </div>
      </div>

      {/* Right Area: Session Badge, Language Toggle, Quick Action & User Profile */}
      <div className="flex items-center gap-2 sm:gap-3.5">
        {/* Active Session Indicator */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200/80 rounded-full text-xs font-semibold text-emerald-800">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[11px]">
            {language === "fr" ? "Session Dispatch Active" : "Live Dispatch Active"}
          </span>
        </div>

        {/* Quick Action: Create New Shipment */}
        <button
          type="button"
          onClick={() => {
            if (onOpenNewShipmentModal) {
              onOpenNewShipmentModal();
            } else {
              router.push("/admin/shipments?new=true");
            }
          }}
          className="px-2.5 sm:px-3.5 py-2 bg-[#d21f27] hover:bg-[#b51a21] text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span className="hidden sm:inline">
            {language === "fr" ? "Nouveau Fret" : "Create Shipment"}
          </span>
        </button>

        {/* Bilingual Language Switcher */}
        <div className="relative" ref={langRef}>
          <button
            type="button"
            onClick={() => setLangMenuOpen(!langMenuOpen)}
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-[#0B2545] hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
          >
            <Globe2 className="w-3.5 h-3.5 text-[#d21f27]" />
            <span className="uppercase">{language}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {langMenuOpen && (
            <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-50 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
              <button
                type="button"
                onClick={() => {
                  setLanguage("en");
                  setLangMenuOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2 flex items-center justify-between hover:bg-slate-50 transition ${
                  language === "en" ? "font-bold text-[#d21f27]" : "text-slate-700"
                }`}
              >
                <span>English (Canada)</span>
                {language === "en" && <Check className="w-3.5 h-3.5 text-[#d21f27]" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setLanguage("fr");
                  setLangMenuOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2 flex items-center justify-between hover:bg-slate-50 transition ${
                  language === "fr" ? "font-bold text-[#d21f27]" : "text-slate-700"
                }`}
              >
                <span>Français (Canada)</span>
                {language === "fr" && <Check className="w-3.5 h-3.5 text-[#d21f27]" />}
              </button>
            </div>
          )}
        </div>

        {/* Staff User Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 pl-1.5 pr-1 py-1 rounded-xl hover:bg-slate-100 transition border border-transparent hover:border-slate-200 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-[#0B2545] text-white flex items-center justify-center font-bold text-xs shadow-xs border border-white/20">
              {displayName
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("") || "AD"}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-900 leading-tight max-w-[120px] truncate">
                {displayName}
              </span>
              <span className="text-[10px] text-amber-700 font-bold tracking-tight">
                {displayRole}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-72 sm:w-72 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Header Info */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 mb-1.5">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-900 text-sm">{displayName}</p>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-800 text-[10px] font-bold border border-amber-500/20">
                    {displayRole}
                  </span>
                </div>
                <p className="text-slate-500 text-[11px] truncate mt-0.5">{displayEmail}</p>
                <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
                  <Building2 className="w-3 h-3 text-[#d21f27]" />
                  <span className="truncate">{displayCompany}</span>
                </div>
              </div>

              {/* Menu Links */}
              <div className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    router.push("/admin/settings");
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 flex items-center gap-2.5 transition font-medium"
                >
                  <Shield className="w-4 h-4 text-slate-500" />
                  <span>{language === "fr" ? "Sécurité & Accès" : "Security & Staff Access"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    router.push("/dashboard");
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 flex items-center gap-2.5 transition font-medium"
                >
                  <Radio className="w-4 h-4 text-blue-500" />
                  <span>{language === "fr" ? "Aller au Portail Client" : "Switch to Client Portal"}</span>
                </button>
              </div>

              {/* Logout Button */}
              <div className="mt-1.5 pt-1.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 rounded-lg text-[#d21f27] hover:bg-red-50 flex items-center gap-2.5 transition font-semibold"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{language === "fr" ? "Déconnexion Staff" : "Sign Out (Staff Session)"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

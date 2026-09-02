"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import TransimexLogo from "@/components/TransimexLogo";
import {
  LayoutDashboard,
  FileText,
  Truck,
  Users,
  Briefcase,
  FileSpreadsheet,
  Mail,
  LifeBuoy,
  BarChart3,
  Settings,
  Shield,
  X,
  ExternalLink,
  ChevronRight,
  Radio,
} from "lucide-react";

interface AdminSidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  userRole?: string;
}

export default function AdminSidebar({
  mobileOpen = false,
  onCloseMobile,
  userRole = "admin",
}: AdminSidebarProps) {
  const pathname = usePathname();
  const { language } = useLanguage();

  const navItems = [
    {
      name: language === "fr" ? "Aperçu Opérations" : "Dashboard Overview",
      href: "/admin",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      name: language === "fr" ? "Gestion des Soumissions" : "Quotes Management",
      href: "/admin/quotes",
      icon: FileText,
      badge: "8 New",
      badgeColor: "bg-[#d21f27] text-white",
    },
    {
      name: language === "fr" ? "Fret & Expéditions" : "Freight & Shipments",
      href: "/admin/shipments",
      icon: Truck,
      badge: "24 Live",
      badgeColor: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
    },
    {
      name: language === "fr" ? "Comptes Clients" : "Clients & Accounts",
      href: "/admin/clients",
      icon: Users,
    },
    {
      name: language === "fr" ? "Réseau Transporteurs" : "Carrier Network",
      href: "/admin/carriers",
      icon: Briefcase,
    },
    {
      name: language === "fr" ? "Messages & Formulaires" : "Inquiries & Leads",
      href: "/admin/messages",
      icon: Mail,
      badge: "4 Leads",
      badgeColor: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
    },
    {
      name: language === "fr" ? "Centre d'Assistance" : "Support Tickets",
      href: "/admin/support",
      icon: LifeBuoy,
      badge: "3 Open",
      badgeColor: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
    },
    {
      name: language === "fr" ? "Blogue Bilingue" : "Bilingual Blog CMS",
      href: "/admin/blog",
      icon: FileSpreadsheet,
    },
    {
      name: language === "fr" ? "Ressources & FAQ" : "Resources & FAQs",
      href: "/admin/resources",
      icon: FileText,
    },
    {
      name: language === "fr" ? "Analyses Logistiques" : "Logistics Analytics",
      href: "/admin/analytics",
      icon: BarChart3,
    },
    {
      name: language === "fr" ? "Paramètres Système" : "System Settings",
      href: "/admin/settings",
      icon: Settings,
    },
  ];

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between bg-[#0B2545] text-slate-200 select-none overflow-y-auto">
      {/* Top Branding Section */}
      <div>
        <div className="p-5 flex items-center justify-between border-b border-white/10">
          <Link href="/admin" className="flex items-center gap-2">
            <TransimexLogo variant="dark" size="sm" />
          </Link>
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Staff Operations Security Tag */}
        <div className="px-5 py-3 bg-white/5 border-b border-white/10 flex items-center justify-between text-[11px]">
          <span className="font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#d21f27] animate-pulse" />
            {language === "fr" ? "Centre de Commandement" : "Staff Operations Shell"}
          </span>
          <span className="text-[10px] font-mono text-amber-400 font-bold px-1.5 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">
            STAFF v4.2
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1 mt-2">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={`relative group flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? "bg-white/10 text-white font-bold shadow-xs"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                {/* 4px Red Active Indicator specified in design.md */}
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#D21F27] rounded-r-full" />
                )}

                <div className="flex items-center gap-3">
                  <item.icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? "text-[#D21F27]" : "text-slate-400 group-hover:text-slate-200"
                    }`}
                  />
                  <span>{item.name}</span>
                </div>

                {/* Badges */}
                {item.badge && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold min-w-5 text-center ${
                      item.badgeColor || "bg-[#D21F27] text-white"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Switcher & Dispatch Hotline */}
      <div className="p-3 space-y-2">
        {/* Switch to Client Portal View */}
        <Link
          href="/dashboard"
          className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition group"
        >
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
            <span>{language === "fr" ? "Voir Portail Client" : "Switch to Client Portal"}</span>
          </div>
          <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-white" />
        </Link>

        {/* Dispatch System Status Card */}
        <div className="p-3 bg-black/20 border border-white/5 rounded-xl text-xs space-y-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-bold uppercase tracking-wider text-slate-400">
              {language === "fr" ? "Système Central" : "Dispatch Telematics"}
            </span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              ONLINE
            </span>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            Transimex Montreal EDI Terminal &bull; CBSA Direct Gateway
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop 260px Fixed Sidebar as defined in design.md */}
      <aside className="hidden md:block w-[260px] fixed inset-y-0 left-0 z-30 shadow-lg border-r border-slate-800">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-[280px] max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { api } from "@/lib/api";
import { useInstallPrompt } from "@/lib/useInstallPrompt";
import TransimexLogo from "@/components/TransimexLogo";
import {
  LayoutDashboard,
  Truck,
  FileSpreadsheet,
  Calculator,
  FolderOpen,
  Bell,
  MapPin,
  Settings,
  HelpCircle,
  ShieldCheck,
  X,
  ExternalLink,
  ChevronUp,
  Download,
  LogOut,
} from "lucide-react";

interface PortalSidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  unreadCount?: number;
  userRole?: string;
  user?: {
    name?: string;
    email?: string;
    companyName?: string;
  } | null;
}

export default function PortalSidebar({
  mobileOpen = false,
  onCloseMobile,
  unreadCount = 3,
  userRole = "client",
  user = null,
}: PortalSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t, language } = useLanguage();
  const { isStandalone, isIOS, promptInstall } = useInstallPrompt();
  const [menuOpen, setMenuOpen] = useState(false);
  const [installHint, setInstallHint] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
        setInstallHint(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayName = user?.name || "Client User";
  const displayCompany = user?.companyName || "Organization Account";
  const initialsSource = user?.name?.trim() || user?.email || "";
  const initials = initialsSource
    ? initialsSource
        .trim()
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  const handleLogout = async () => {
    await api.auth.logout();
    router.push("/login");
  };

  const handleInstallClick = async () => {
    const result = await promptInstall();
    if (result === "ios") {
      setInstallHint(
        language === "fr"
          ? "Appuyez sur Partager, puis « Sur l'écran d'accueil »."
          : "Tap Share, then \"Add to Home Screen.\""
      );
    } else if (result === "unavailable") {
      setInstallHint(
        language === "fr"
          ? "Utilisez le menu de votre navigateur pour installer l'application."
          : "Use your browser menu to install this app."
      );
    } else {
      setMenuOpen(false);
      setInstallHint(null);
    }
  };

  const navigationItems = [
    {
      name: t.nav.dashboard,
      href: "/dashboard",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      name: t.nav.shipments,
      href: "/dashboard/shipments",
      icon: Truck,
      badge: "12 Live",
    },
    {
      name: t.nav.quotes,
      href: "/dashboard/quotes",
      icon: FileSpreadsheet,
    },
    {
      name: t.nav.estimator,
      href: "/dashboard/estimator",
      icon: Calculator,
      badge: "Instant",
    },
    {
      name: t.nav.documents,
      href: "/dashboard/documents",
      icon: FolderOpen,
    },
    {
      name: t.nav.notifications,
      href: "/dashboard/notifications",
      icon: Bell,
      badgeCount: unreadCount,
    },
    {
      name: t.nav.addresses,
      href: "/dashboard/addresses",
      icon: MapPin,
    },
    {
      name: t.nav.account,
      href: "/dashboard/account",
      icon: Settings,
    },
    {
      name: t.nav.support,
      href: "/dashboard/support",
      icon: HelpCircle,
    },
  ];

  const isStaff = userRole === "admin" || userRole === "superadmin" || userRole === "subadmin";

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between bg-[#0B2545] text-slate-200 select-none overflow-y-auto">
      {/* Top Branding Section */}
      <div>
        <div className="p-5 flex items-center justify-between border-b border-white/10">
          <Link href="/dashboard" className="flex items-center gap-2">
            <TransimexLogo variant="dark" size="sm" />
          </Link>
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Client Portal Tag */}
        <div className="px-5 py-3 bg-white/5 border-b border-white/10 flex items-center justify-between text-[11px]">
          <span className="font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {language === "fr" ? "Portail Client Actif" : "Client Portal Active"}
          </span>
          <span className="text-[10px] font-mono text-[#d21f27] font-bold">EDI v4.2</span>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1 mt-2">
          {navigationItems.map((item) => {
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

                {/* Dynamic Red Notification Badge as required by specification */}
                {typeof item.badgeCount === "number" && item.badgeCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-[#D21F27] text-white text-[10px] font-bold min-w-5 text-center shadow-xs">
                    {item.badgeCount}
                  </span>
                )}

                {/* Custom Status Chip */}
                {item.badge && (
                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-medium border border-emerald-500/30">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Admin Switcher for Staff */}
          {isStaff && (
            <div className="pt-3 mt-3 border-t border-white/10">
              <Link
                href="/admin"
                className="flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 transition border border-amber-500/20"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>{t.nav.adminPanel}</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </nav>
      </div>

      {/* Bottom Nameplate & Account Menu */}
      <div className="p-3 relative" ref={menuRef}>
        {menuOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-2 bg-[#132a52] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150 z-10">
            {installHint && (
              <div className="px-3.5 py-2.5 text-[11px] text-slate-300 leading-snug border-b border-white/10 bg-white/5">
                {installHint}
              </div>
            )}
            {!isStandalone && (
              <button
                type="button"
                onClick={handleInstallClick}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/10 transition cursor-pointer"
              >
                <Download className="w-4 h-4 text-slate-400" />
                <span>{language === "fr" ? "Installer l'application" : "Install App"}</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold text-red-300 hover:bg-red-500/10 transition cursor-pointer border-t border-white/10"
            >
              <LogOut className="w-4 h-4" />
              <span>{language === "fr" ? "Se déconnecter" : "Log Out"}</span>
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            setMenuOpen((open) => !open);
            setInstallHint(null);
          }}
          className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1 text-left">
            <div className="text-xs font-bold text-white truncate">{displayName}</div>
            <div className="text-[10px] text-slate-400 truncate">{displayCompany}</div>
          </div>
          <ChevronUp
            className={`w-3.5 h-3.5 text-slate-400 transition-transform flex-shrink-0 ${
              menuOpen ? "rotate-180" : ""
            }`}
          />
        </button>
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

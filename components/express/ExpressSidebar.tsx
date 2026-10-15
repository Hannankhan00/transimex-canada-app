"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, LayoutDashboard, Lock, LogOut, Package, PackagePlus, Users, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import TransimexLogo from "@/components/TransimexLogo";

export interface ExpressUser {
  name?: string;
  companyName?: string;
  email?: string;
}

interface Props {
  mobileOpen: boolean;
  onClose: () => void;
  user: ExpressUser | null;
  fallbackName?: string;
  onLogout: () => void;
  /** The client's Express account status; anything but "active" locks booking. null = unknown or none. */
  accountStatus?: string | null;
  /** An approved reseller: shows the partner area. */
  isPartner?: boolean;
  /** A login a partner gave to their customer: can check prices and follow shipments, not book. */
  isCustomer?: boolean;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Pathnames (besides href itself) that should highlight this item. */
  match?: (pathname: string) => boolean;
  /** Shown as a small padlock with this tooltip. */
  lockedHint?: string;
}

export default function ExpressSidebar({ mobileOpen, onClose, user, fallbackName, onLogout, accountStatus = null, isPartner = false, isCustomer = false }: Props) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const e = t.express;

  const overview: NavItem = {
    href: "/express",
    label: e.navOverview,
    icon: LayoutDashboard,
    match: (p) => p === "/express" || p === "/express/apply",
  };
  const shipping: NavItem[] = [
    { href: "/express/book", label: isCustomer ? e.partner.customerQuoteTitle : e.navBook, icon: PackagePlus, match: (p) => p.startsWith("/express/book"), lockedHint: accountStatus && accountStatus !== "active" ? e.lockedHint : undefined },
    { href: "/express/shipments", label: e.navShipments, icon: Package, match: (p) => p.startsWith("/express/shipments") },
  ];

  const displayName = user?.name || fallbackName || "";
  const initials = displayName
    ? displayName
        .trim()
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  const renderItem = (item: NavItem) => {
    const active = item.match ? item.match(pathname) : pathname === item.href;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        aria-current={active ? "page" : undefined}
        title={item.lockedHint}
        className={`relative flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-semibold transition-colors ${
          active ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
        }`}
      >
        {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-[#D21F27]" />}
        <item.icon className={`h-4 w-4 ${active ? "text-white" : "text-slate-400"}`} />
        <span className="flex-1">{item.label}</span>
        {item.lockedHint && <Lock className="h-3.5 w-3.5 text-slate-400" aria-label={item.lockedHint} />}
      </Link>
    );
  };

  const sectionLabel = (text: string) => (
    <div className="px-3.5 pb-1.5 pt-5 text-[10px] font-bold uppercase tracking-wider text-slate-500">{text}</div>
  );

  const content = (
    <div className="flex h-full select-none flex-col overflow-hidden bg-[#0B2545] text-slate-200">
      {/* Brand */}
      <div className="shrink-0 border-b border-white/10 px-5 pb-4 pt-5">
        <div className="flex items-start justify-between">
          <Link href="/express" onClick={onClose} aria-label="Transimex Express">
            <TransimexLogo variant="dark" size="sm" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label={e.closeMenu}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white md:hidden cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4">
          <p className="text-[15px] font-bold leading-tight text-white">{e.brand}</p>
          <p className="mt-0.5 text-xs font-medium text-slate-400">{e.poweredBy}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-3" aria-label="Express">
        <div className="space-y-0.5">{renderItem(overview)}</div>

        {sectionLabel(e.navShipping)}
        <div className="space-y-0.5">{shipping.map(renderItem)}</div>

        {isPartner && (
          <>
            {sectionLabel(e.partner.navSection)}
            <div className="space-y-0.5">
              {renderItem({ href: "/express/partner", label: e.partner.navCustomers, icon: Users, match: (p) => p.startsWith("/express/partner") })}
            </div>
          </>
        )}

        {sectionLabel(e.navAccount)}
        <div className="space-y-0.5">
          <Link
            href="/dashboard"
            onClick={onClose}
            className="flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-semibold text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 text-slate-400" />
            {e.backToPortal}
          </Link>
        </div>
      </nav>

      {/* Signed-in user */}
      <div className="shrink-0 border-t border-white/10 p-3">
        <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 p-2.5">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-xs font-bold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-bold text-white">{displayName}</div>
            {user?.companyName && <div className="truncate text-[10px] text-slate-400">{user.companyName}</div>}
          </div>
          <button
            type="button"
            onClick={onLogout}
            title={e.logout}
            aria-label={e.logout}
            className="flex-shrink-0 rounded-lg p-2 text-slate-300 transition hover:bg-red-500/15 hover:text-red-300 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] border-r border-slate-800 shadow-lg md:block">{content}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-slate-900/60" onClick={onClose} />
          <div className="relative z-10 h-full w-[280px] max-w-[85vw] shadow-2xl">{content}</div>
        </div>
      )}
    </>
  );
}

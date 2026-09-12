"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { api } from "@/lib/api";
import {
  Menu,
  Globe2,
  LogOut,
  Building2,
  User,
  ChevronDown,
  Search,
  Bell,
  Check,
  X,
  Truck,
  FileText,
  FileSpreadsheet,
  ShieldCheck,
  Loader2,
} from "lucide-react";

function getNotificationIcon(category: string) {
  switch (category) {
    case "customs":
      return <ShieldCheck className="w-4 h-4 text-amber-600" />;
    case "transit":
      return <Truck className="w-4 h-4 text-blue-600" />;
    case "document":
      return <FileText className="w-4 h-4 text-emerald-600" />;
    case "quote":
      return <FileSpreadsheet className="w-4 h-4 text-indigo-600" />;
    default:
      return <Bell className="w-4 h-4 text-slate-600" />;
  }
}

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
  unreadCount = 0,
}: TopBarProps) {
  const router = useRouter();
  const { t, language, setLanguage } = useLanguage();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setLangMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Live notification feed (badge count + hover preview)
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifLoading, setNotifLoading] = useState(true);
  const [notifLoaded, setNotifLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/notifications")
      .then((res) => res.json())
      .then((data) => {
        if (active && data.success) {
          setNotifications(data.notifications);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) {
          setNotifLoading(false);
          setNotifLoaded(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const liveUnreadCount = notifLoaded
    ? notifications.filter((n) => n.unread).length
    : unreadCount;

  const handleNotifClick = (notif: any) => {
    if (notif.unread) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, unread: false } : n))
      );
      fetch(`/api/notifications/${notif.id}`, { method: "PATCH" }).catch(() => {});
    }
    setNotifOpen(false);
    router.push(notif.link || "/dashboard/notifications");
  };

  // Global quick search across shipments & quotes (fetched once, filtered live as-you-type)
  const [searchShipments, setSearchShipments] = useState<any[]>([]);
  const [searchQuotes, setSearchQuotes] = useState<any[]>([]);
  const [searchDataLoaded, setSearchDataLoaded] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const loadSearchData = () => {
    if (searchDataLoaded || searchLoading) return;
    setSearchLoading(true);
    Promise.all([
      fetch("/api/shipments").then((r) => r.json()),
      fetch("/api/quotes").then((r) => r.json()),
    ])
      .then(([shipmentsRes, quotesRes]) => {
        setSearchShipments(shipmentsRes.success ? shipmentsRes.shipments : []);
        setSearchQuotes(quotesRes.success ? quotesRes.quotes : []);
      })
      .catch(() => {})
      .finally(() => {
        setSearchLoading(false);
        setSearchDataLoaded(true);
      });
  };

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const matchedShipments = trimmedQuery
    ? searchShipments
        .filter((s) =>
          [s.id, s.origin, s.destination, s.statusLabel]
            .filter(Boolean)
            .some((field) => String(field).toLowerCase().includes(trimmedQuery))
        )
        .slice(0, 5)
    : [];
  const matchedQuotes = trimmedQuery
    ? searchQuotes
        .filter((q) =>
          [q.id, q.origin, q.destination]
            .filter(Boolean)
            .some((field) => String(field).toLowerCase().includes(trimmedQuery))
        )
        .slice(0, 5)
    : [];
  const hasSearchResults = matchedShipments.length > 0 || matchedQuotes.length > 0;

  const handleSearchResultClick = (href: string) => {
    setSearchOpen(false);
    setSearchQuery("");
    router.push(href);
  };

  const handleLogout = async () => {
    await api.auth.logout();
    router.push("/login");
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
        <div className="relative w-full hidden sm:block" ref={searchRef}>
          <div className="relative flex items-center">
            {searchLoading ? (
              <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none animate-spin" />
            ) : (
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            )}
            <input
              type="text"
              value={searchQuery}
              onFocus={() => {
                loadSearchData();
                if (searchQuery.trim()) setSearchOpen(true);
              }}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchOpen(e.target.value.trim().length > 0);
              }}
              placeholder={t.topBar.searchPlaceholder}
              className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-[#0B2545] focus:ring-1 focus:ring-[#0B2545]/10 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSearchOpen(false);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/70 transition cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Live Filtered Results Dropdown */}
          {searchOpen && trimmedQuery && (
            <div className="absolute left-0 right-0 mt-1.5 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-30 max-h-96 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
              {!searchDataLoaded ? (
                <div className="px-3.5 py-3 text-xs text-slate-400">
                  {language === "fr" ? "Chargement..." : "Loading..."}
                </div>
              ) : !hasSearchResults ? (
                <div className="px-3.5 py-3 text-xs text-slate-400">
                  {language === "fr" ? "Aucun résultat trouvé" : "No matches found"}
                </div>
              ) : (
                <>
                  {matchedShipments.length > 0 && (
                    <div>
                      <div className="px-3.5 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {language === "fr" ? "Expéditions" : "Shipments"}
                      </div>
                      {matchedShipments.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handleSearchResultClick(`/dashboard/shipments?id=${encodeURIComponent(s.id)}`)}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left hover:bg-slate-50 transition cursor-pointer"
                        >
                          <Truck className="w-3.5 h-3.5 text-[#0B2545] flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-slate-900 truncate">{s.id}</div>
                            <div className="text-[11px] text-slate-500 truncate">{s.origin} → {s.destination}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {matchedQuotes.length > 0 && (
                    <div>
                      <div className="px-3.5 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {language === "fr" ? "Soumissions" : "Quotes"}
                      </div>
                      {matchedQuotes.map((q) => (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => handleSearchResultClick("/dashboard/quotes")}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left hover:bg-slate-50 transition cursor-pointer"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-[#0B2545] flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-slate-900 truncate">{q.id}</div>
                            <div className="text-[11px] text-slate-500 truncate">{q.origin} → {q.destination}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
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

        {/* Notifications: Badge Tag + Hover Preview Dropdown */}
        <div
          className="relative"
          ref={notifRef}
          onMouseEnter={() => setNotifOpen(true)}
          onMouseLeave={() => setNotifOpen(false)}
        >
          <button
            type="button"
            onClick={() => setNotifOpen((open) => !open)}
            className="relative p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-[#0B2545] transition shadow-2xs cursor-pointer"
            title={t.topBar.notificationsTooltip}
          >
            <Bell className="w-4 h-4" />
            {liveUnreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#D21F27] text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs">
                {liveUnreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-1.5 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-30 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">
                  {language === "fr" ? "Notifications" : "Notifications"}
                </span>
                {liveUnreadCount > 0 && (
                  <span className="text-[10px] font-bold text-white bg-[#D21F27] px-2 py-0.5 rounded-full">
                    {liveUnreadCount} {language === "fr" ? "nouvelle(s)" : "new"}
                  </span>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifLoading ? (
                  <div className="px-4 py-6 text-center text-xs text-slate-400">
                    {language === "fr" ? "Chargement..." : "Loading..."}
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-slate-400">
                    {language === "fr" ? "Aucune notification pour le moment" : "No notifications yet"}
                  </div>
                ) : (
                  notifications.slice(0, 5).map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => handleNotifClick(n)}
                      className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        {getNotificationIcon(n.category)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {n.unread && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#D21F27] flex-shrink-0" />
                          )}
                          <span
                            className={`text-xs truncate ${
                              n.unread ? "font-bold text-slate-900" : "font-semibold text-slate-700"
                            }`}
                          >
                            {language === "fr" ? n.titleFr : n.title}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-snug">
                          {language === "fr" ? n.descFr : n.desc}
                        </p>
                        <span className="text-[10px] text-slate-400 mt-1 inline-block">{n.time}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setNotifOpen(false);
                  router.push("/dashboard/notifications");
                }}
                className="w-full text-center py-2.5 text-xs font-bold text-[#D21F27] hover:bg-red-50 border-t border-slate-100 transition cursor-pointer"
              >
                {language === "fr" ? "Voir toutes les notifications" : "View All Notifications"}
              </button>
            </div>
          )}
        </div>

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

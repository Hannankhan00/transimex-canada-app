"use client";

import React, { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, Menu } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface Props {
  onOpenMenu: () => void;
  userName?: string;
}

interface ExpressNotification {
  id: string;
  title: string;
  titleFr: string;
  desc: string;
  descFr: string;
  time: string;
  link: string;
  unread: boolean;
}

/** Bell with the Express-only feed. The client portal has its own bell and never shows these. */
function ExpressNotifications() {
  const router = useRouter();
  const pathname = usePathname();
  const { t, language } = useLanguage();
  const n = t.express.notif;
  const [items, setItems] = useState<ExpressNotification[] | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Reload on every page change so a booking or payment made a moment ago shows up.
  useEffect(() => {
    let alive = true;
    fetch("/api/notifications?scope=express")
      .then((r) => r.json())
      .then((d) => alive && setItems(d.success ? d.notifications : []))
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const unread = items ? items.filter((i) => i.unread).length : 0;

  const openItem = (item: ExpressNotification) => {
    if (item.unread) {
      setItems((prev) => prev && prev.map((i) => (i.id === item.id ? { ...i, unread: false } : i)));
      fetch(`/api/notifications/${item.id}`, { method: "PATCH" }).catch(() => {});
    }
    setOpen(false);
    if (item.link) router.push(item.link);
  };

  const markAll = () => {
    setItems((prev) => prev && prev.map((i) => ({ ...i, unread: false })));
    fetch("/api/notifications?scope=express", { method: "PATCH" }).catch(() => {});
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={n.title}
        aria-expanded={open}
        className="relative cursor-pointer rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50 hover:text-[#0B2545]"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#D21F27] px-1 text-[9px] font-bold text-white">{unread}</span>}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="text-xs font-bold text-slate-900">{n.title}</span>
            {unread > 0 && (
              <button type="button" onClick={markAll} className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-bold text-[#D21F27] hover:underline">
                <CheckCheck className="h-3.5 w-3.5" />
                {n.markAll}
              </button>
            )}
          </div>
          <div className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
            {items === null ? (
              <p className="px-4 py-6 text-center text-xs text-slate-400">{n.loading}</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-slate-400">{n.empty}</p>
            ) : (
              items.slice(0, 20).map((item) => (
                <button key={item.id} type="button" onClick={() => openItem(item)} className="flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50">
                  <span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${item.unread ? "bg-[#D21F27]" : "bg-transparent"}`} />
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-xs ${item.unread ? "font-bold text-slate-900" : "font-semibold text-slate-700"}`}>{language === "fr" ? item.titleFr : item.title}</span>
                    <span className="mt-0.5 line-clamp-2 block text-[11px] leading-snug text-slate-500">{language === "fr" ? item.descFr : item.desc}</span>
                    <span className="mt-1 block text-[10px] text-slate-400">{item.time}</span>
                  </span>
                </button>
              ))
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              router.push("/express/notifications");
            }}
            className="w-full cursor-pointer border-t border-slate-100 py-2.5 text-center text-xs font-bold text-[#D21F27] transition-colors hover:bg-red-50"
          >
            {n.viewAll}
          </button>
        </div>
      )}
    </div>
  );
}

export default function ExpressTopBar({ onOpenMenu, userName }: Props) {
  const pathname = usePathname();
  const { t, language, setLanguage } = useLanguage();
  const e = t.express;

  const pageTitle =
    pathname === "/express"
      ? e.navOverview
      : pathname.startsWith("/express/apply")
        ? e.pageApply
        : pathname.startsWith("/express/notifications")
          ? e.notif.title
          : pathname.startsWith("/express/book")
          ? e.navBook
          : pathname.startsWith("/express/shipments/")
            ? e.shipments.details
            : pathname.startsWith("/express/shipments")
              ? e.navShipments
              : e.brand;

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label={e.openMenu}
          className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-[#0B2545] md:hidden cursor-pointer"
        >
          <Menu className="h-5 w-5" />
        </button>
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm">
          <span className="hidden font-semibold text-slate-500 sm:inline">{e.brand}</span>
          <span className="hidden text-slate-300 sm:inline" aria-hidden="true">
            /
          </span>
          <span className="truncate font-bold text-[#0B2545]">{pageTitle}</span>
        </nav>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <ExpressNotifications />
        <div role="group" aria-label={e.switchLanguage} className="flex overflow-hidden rounded-lg border border-slate-200 text-xs font-bold">
          {(["en", "fr"] as const).map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setLanguage(lang)}
              aria-pressed={language === lang}
              className={`px-3 py-1.5 transition cursor-pointer ${language === lang ? "bg-[#0B2545] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </div>
        {userName && (
          <div className="hidden items-center gap-2 border-l border-slate-200 pl-4 lg:flex">
            <span className="max-w-[160px] truncate text-xs font-semibold text-slate-700">{userName}</span>
          </div>
        )}
      </div>
    </header>
  );
}

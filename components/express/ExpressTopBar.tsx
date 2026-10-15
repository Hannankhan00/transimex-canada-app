"use client";

import React from "react";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface Props {
  onOpenMenu: () => void;
  userName?: string;
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

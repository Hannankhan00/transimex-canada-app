"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, LayoutDashboard, LogOut } from "lucide-react";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import TransimexLogo from "@/components/TransimexLogo";

interface ExpressShellProps {
  children: React.ReactNode;
  userName?: string;
}

export default function ExpressShell({ children, userName }: ExpressShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t, language, setLanguage } = useLanguage();

  const navItems = [{ href: "/express", label: t.express.navOverview, icon: LayoutDashboard, exact: true }];

  const handleLogout = async () => {
    await api.auth.logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-[#f5f7fa] text-[#111c2d] antialiased">
      <header className="bg-[#0B2545] text-white border-b border-white/10">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/express" className="flex items-center gap-3 min-w-0">
            <TransimexLogo variant="dark" size="sm" />
            <span className="hidden sm:inline text-sm font-extrabold tracking-wide uppercase">
              {t.express.brand}
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setLanguage(language === "en" ? "fr" : "en")}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-white/20 hover:bg-white/10 transition cursor-pointer"
              aria-label="Switch language"
            >
              {language === "en" ? "FR" : "EN"}
            </button>
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-200 hover:bg-white/10 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.express.backToPortal}</span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-red-300 hover:bg-red-500/10 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.express.logout}</span>
            </button>
          </div>
        </div>

        <nav className="max-w-[1200px] mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto">
          {navItems.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-[13px] font-semibold border-b-2 whitespace-nowrap transition ${
                  active
                    ? "border-[#D21F27] text-white"
                    : "border-transparent text-slate-300 hover:text-white"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {userName && (
          <p className="sr-only">
            {t.express.signedInAs} {userName}
          </p>
        )}
        {children}
      </main>
    </div>
  );
}

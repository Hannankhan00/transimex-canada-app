"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import TransimexLogo from "@/components/TransimexLogo";
import { hasModulePermission, PermissionModule, getRolePreset } from "@/lib/rbac";
import { api } from "@/lib/api";
import {
  LayoutDashboard,
  FileText,
  Truck,
  Users,
  Briefcase,
  Mail,
  Settings,
  Shield,
  X,
  LogOut,
  ChevronRight,
  ShieldCheck,
  LifeBuoy,
  BarChart3,
  Newspaper,
  BookOpen,
  Receipt,
} from "lucide-react";

interface AdminSidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  userRole?: string;
  user?: {
    userId?: string;
    name?: string;
    email?: string;
    role?: string;
    permissions?: string[];
    department?: string;
  } | null;
}

export default function AdminSidebar({
  mobileOpen = false,
  onCloseMobile,
  userRole = "admin",
  user,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { language } = useLanguage();

  const handleLogout = async () => {
    await api.auth.logout();
    router.push("/login");
  };

  const role = user?.role || userRole;
  const rolePreset = getRolePreset(role);
  const displayName = user?.name || "Staff Personnel";
  const displayRoleTitle =
    language === "fr" ? rolePreset.titleFr : rolePreset.titleEn;

  const sectionLabels: Record<"operations" | "clients" | "insights" | "system", string> = {
    operations: language === "fr" ? "Opérations" : "Operations",
    clients: language === "fr" ? "Clients & Support" : "Clients & Support",
    insights: language === "fr" ? "Analytique & Contenu" : "Analytics & Content",
    system: language === "fr" ? "Système & Accès" : "System & Access",
  };

  // Streamlined primary navigation items mapped to RBAC modules
  const navItems: Array<{
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    exact?: boolean;
    module: PermissionModule | null;
    section: "operations" | "clients" | "insights" | "system" | null;
  }> = [
    {
      name: language === "fr" ? "Aperçu Opérations" : "Dashboard Overview",
      href: "/admin",
      icon: LayoutDashboard,
      exact: true,
      module: null,
      section: null,
    },
    {
      name: language === "fr" ? "Gestion des Soumissions" : "Quotes Management",
      href: "/admin/quotes",
      icon: FileText,
      module: "quotes",
      section: "operations",
    },
    {
      name: language === "fr" ? "Factures & Paiements" : "Invoices & Payments",
      href: "/admin/invoices",
      icon: Receipt,
      module: "invoices",
      section: "operations",
    },
    {
      name: language === "fr" ? "Fret & Expéditions" : "Freight & Shipments",
      href: "/admin/shipments",
      icon: Truck,
      module: "shipments",
      section: "operations",
    },
    {
      name: language === "fr" ? "Réseau Transporteurs" : "Carrier Network",
      href: "/admin/carriers",
      icon: Briefcase,
      module: "carriers",
      section: "operations",
    },
    {
      name: language === "fr" ? "Comptes Clients" : "Clients & Accounts",
      href: "/admin/clients",
      icon: Users,
      module: "clients",
      section: "clients",
    },
    {
      name: language === "fr" ? "Billets de Support" : "Support Tickets",
      href: "/admin/support",
      icon: LifeBuoy,
      module: "support",
      section: "clients",
    },
    {
      name: language === "fr" ? "Messages & Formulaires" : "Inquiries & Leads",
      href: "/admin/messages",
      icon: Mail,
      module: "messages",
      section: "clients",
    },
    {
      name: language === "fr" ? "Analytique & Rapports" : "Analytics & Reports",
      href: "/admin/analytics",
      icon: BarChart3,
      module: "analytics",
      section: "insights",
    },
    {
      name: language === "fr" ? "Blogue & Contenu" : "Blog & Content",
      href: "/admin/blog",
      icon: Newspaper,
      module: "blog",
      section: "insights",
    },
    {
      name: language === "fr" ? "Ressources & FAQ" : "Resources & FAQ",
      href: "/admin/resources",
      icon: BookOpen,
      module: "resources",
      section: "insights",
    },
    {
      name: language === "fr" ? "Personnel & Accès (RBAC)" : "Staff & Access (RBAC)",
      href: "/admin/staff",
      icon: Shield,
      module: "staff",
      section: "system",
    },
    {
      name: language === "fr" ? "Paramètres Système" : "System Settings",
      href: "/admin/settings",
      icon: Settings,
      module: "settings",
      section: "system",
    },
  ];

  // Filter items based on user's assigned RBAC permissions
  const visibleNavItems = navItems.filter((item) => {
    if (!item.module) return true;
    return hasModulePermission(user || { role }, item.module);
  });

  const sidebarContent = (
    <div className="h-full flex flex-col bg-[#0B2545] text-slate-200 select-none overflow-hidden">
      {/* Upper Sticky Logo Card */}
      <div className="shrink-0 sticky top-0 z-10 bg-[#0B2545] border-b border-white/10 p-5 flex items-center justify-between">
        <Link href="/admin" className="flex items-center gap-2">
          <TransimexLogo variant="dark" size="sm" />
        </Link>
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Scrollable Navigation Links */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-sidebar-scrollbar">
        <nav className="p-3 space-y-0.5">
          {visibleNavItems.map((item, index) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + "/");

            const showSectionLabel =
              item.section && item.section !== visibleNavItems[index - 1]?.section;

            const IconComponent = item.icon;

            return (
              <React.Fragment key={item.href}>
                {showSectionLabel && (
                  <div className="px-3.5 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {sectionLabels[item.section as "operations" | "clients" | "insights" | "system"]}
                  </div>
                )}
                <Link
                  href={item.href}
                  onClick={onCloseMobile}
                  className={`relative group flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? "bg-white/12 text-white font-bold shadow-xs"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {/* Active Indicator */}
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#D21F27] rounded-r-full" />
                  )}

                  <div className="flex items-center gap-3">
                    <IconComponent
                      className={`w-4 h-4 transition-colors ${
                        isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                      }`}
                    />
                    <span>{item.name}</span>
                  </div>

                  {isActive && (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </Link>
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      {/* Lower Sticky Profile Card */}
      <div className="shrink-0 sticky bottom-0 z-10 p-3 border-t border-white/10 bg-[#0B2545]/95 backdrop-blur-xs">
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#d21f27] text-white font-bold flex items-center justify-center text-xs flex-shrink-0 shadow-xs">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate leading-tight">
                {displayName}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <ShieldCheck className="w-2.5 h-2.5 text-amber-400 flex-shrink-0" />
                <p className="text-[10px] text-slate-300 truncate font-medium">
                  {displayRoleTitle}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            title={language === "fr" ? "Déconnexion" : "Sign Out"}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/10 transition cursor-pointer flex-shrink-0 ml-1.5"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop 260px Fixed Sidebar */}
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

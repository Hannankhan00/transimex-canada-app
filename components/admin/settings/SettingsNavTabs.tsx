"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Mail, ShieldAlert, Settings } from "lucide-react";

export default function SettingsNavTabs() {
  const pathname = usePathname();

  const tabs = [
    {
      name: "Staff Access & Roles",
      href: "/admin/settings/users",
      icon: Users,
    },
    {
      name: "Bilingual Email Templates",
      href: "/admin/settings/emails",
      icon: Mail,
    },
    {
      name: "Activity Audit Log",
      href: "/admin/settings/audit",
      icon: ShieldAlert,
    },
  ];

  return (
    <div className="flex items-center gap-1.5 border-b border-slate-200 bg-white p-1 rounded-2xl shadow-2xs overflow-x-auto">
      {tabs.map((t) => {
        const Icon = t.icon;
        const isActive = pathname === t.href;

        return (
          <Link
            key={t.href}
            href={t.href}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              isActive
                ? "bg-[#0B2545] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#d21f27]" : "text-slate-400"}`} />
            <span>{t.name}</span>
          </Link>
        );
      })}
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { PermissionModule, hasModulePermission, getRolePreset } from "@/lib/rbac";
import { api } from "@/lib/api";
import { ShieldAlert, ArrowLeft, Lock, RefreshCw } from "lucide-react";

interface PermissionGuardProps {
  module: PermissionModule;
  children: React.ReactNode;
}

export default function PermissionGuard({ module, children }: PermissionGuardProps) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ role?: string; permissions?: string[] } | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function checkPermission() {
      try {
        const { user: currentUser } = await api.auth.me();
        if (isMounted) {
          setUser(currentUser || null);
        }
      } catch (err) {
        console.error("Permission check failed:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    checkPermission();
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  const authorized = hasModulePermission(user, module);

  if (!authorized) {
    const rolePreset = getRolePreset(user?.role);

    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-2xl border border-slate-200 shadow-sm text-center space-y-4 animate-in fade-in duration-200">
        <div className="w-14 h-14 rounded-2xl bg-red-50 text-[#d21f27] border border-red-100 flex items-center justify-center mx-auto shadow-2xs">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <div>
          <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-mono font-bold uppercase tracking-wider">
            RBAC Access Guard
          </span>
          <h2 className="text-xl font-bold text-[#0B2545] mt-2">Access Restricted</h2>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-md mx-auto">
            Your current operational account is assigned the role{" "}
            <span className="font-bold text-slate-800">{rolePreset.titleEn}</span>, which does not have permission to access the{" "}
            <span className="font-mono font-bold text-[#d21f27] uppercase">{module}</span> module.
          </p>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-center gap-3">
          <Link
            href="/admin"
            className="px-4 py-2 bg-[#0B2545] hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Operations Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

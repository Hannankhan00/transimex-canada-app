"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutGrid,
  Truck,
  Users,
  Shield,
  FileText,
  DollarSign,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  LogOut,
  ChevronRight,
  X,
  Sparkles,
  UserPlus,
  Lock,
  Mail,
  Building2,
  RefreshCw,
  Key,
  MoreVertical,
  Check,
  Zap,
} from "lucide-react";
import TransimexLogo from "@/components/TransimexLogo";

interface AdminUser {
  name: string;
  email: string;
  companyName: string;
  role: "superadmin" | "admin" | "subadmin";
}

interface SubAdminItem {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  role: string;
  companyName: string;
  createdAt: string;
}

export default function AdminPortalPage() {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "team" | "clients" | "dispatch">("overview");

  // Sub-admin creation form state
  const [isSubAdminModalOpen, setIsSubAdminModalOpen] = useState(false);
  const [subAdminName, setSubAdminName] = useState("");
  const [subAdminEmail, setSubAdminEmail] = useState("");
  const [subAdminPassword, setSubAdminPassword] = useState("");
  const [subAdminRole, setSubAdminRole] = useState<"subadmin" | "admin">("subadmin");
  const [subAdminDept, setSubAdminDept] = useState("Dispatch & Operations");
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  // Sub-admins list state
  const [subAdminsList, setSubAdminsList] = useState<SubAdminItem[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);

  const loadSubAdmins = useCallback(async () => {
    setLoadingAdmins(true);
    try {
      const res = await fetch("/api/admin/subadmins");
      const data = await res.json();
      if (res.ok && data.admins) {
        setSubAdminsList(data.admins);
      }
    } catch {
      // Fallback
    } finally {
      setLoadingAdmins(false);
    }
  }, []);

  // Check auth & role on mount
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          if (data.user.role === "client") {
            router.push("/dashboard");
            return;
          }
          setUser(data.user);
          loadSubAdmins();
        } else {
          const stored = localStorage.getItem("transimex_user");
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              if (parsed.role === "client") {
                router.push("/dashboard");
                return;
              }
              setUser(parsed);
              loadSubAdmins();
            } catch {
              router.push("/login");
            }
          } else {
            router.push("/login");
          }
        }
      })
      .catch(() => {
        router.push("/login");
      });
  }, [router, loadSubAdmins]);

  const handleCreateSubAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setModalSuccess(null);
    setModalLoading(true);

    try {
      const res = await fetch("/api/admin/subadmins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: subAdminName,
          email: subAdminEmail,
          password: subAdminPassword,
          role: subAdminRole,
          companyName: `Transimex - ${subAdminDept}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create sub-admin");
      }

      setModalSuccess(`Successfully created sub-admin account for ${subAdminName}`);
      setSubAdminName("");
      setSubAdminEmail("");
      setSubAdminPassword("");
      loadSubAdmins();

      setTimeout(() => {
        setIsSubAdminModalOpen(false);
        setModalSuccess(null);
      }, 1500);
    } catch (err: any) {
      setModalError(err.message || "Failed to create account");
    } finally {
      setModalLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    localStorage.removeItem("transimex_user");
    router.push("/login");
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9f9ff]">
        <div className="w-8 h-8 border-2 border-[#D21F27] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isSuperAdmin = user.role === "superadmin";

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-slate-800 antialiased font-sans">
      {/* ----------------- LEFT SIDEBAR ----------------- */}
      <aside className="w-64 bg-[#0B2545] text-slate-300 flex flex-col justify-between flex-shrink-0 min-h-screen z-20">
        <div>
          {/* Brand Logo */}
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <TransimexLogo variant="dark" size="md" />
          </div>

          {/* Admin Role Tag */}
          <div className="mx-4 my-4 p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#D21F27]" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                {isSuperAdmin ? "Super Admin" : "Admin Portal"}
              </span>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#D21F27] text-white">
              HQ CONTROL
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1 text-sm font-medium">
            <button
              onClick={() => setActiveTab("overview")}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all cursor-pointer text-left ${
                activeTab === "overview"
                  ? "bg-[#D21F27] text-white font-semibold shadow-md"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Operations Console</span>
            </button>

            <button
              onClick={() => setActiveTab("team")}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all cursor-pointer text-left ${
                activeTab === "team"
                  ? "bg-[#D21F27] text-white font-semibold shadow-md"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3.5">
                <Users className="w-4 h-4" />
                <span>Admin Staff &amp; Team</span>
              </div>
              {isSuperAdmin && (
                <span className="text-[10px] font-bold bg-white/20 px-1.5 py-0.5 rounded text-white">
                  Super
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("dispatch")}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all cursor-pointer text-left ${
                activeTab === "dispatch"
                  ? "bg-[#D21F27] text-white font-semibold shadow-md"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Fleet &amp; Dispatches</span>
            </button>

            <button
              onClick={() => setActiveTab("clients")}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all cursor-pointer text-left ${
                activeTab === "clients"
                  ? "bg-[#D21F27] text-white font-semibold shadow-md"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Client Accounts</span>
            </button>
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="p-4 m-3 rounded-xl bg-black/20 border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-[#D21F27] flex items-center justify-center font-bold text-white text-sm flex-shrink-0 shadow-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-white truncate">
                {user.name}
              </div>
              <div className="text-[11px] text-slate-300 truncate">
                {user.email}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* ----------------- MAIN CONTENT AREA ----------------- */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Bar */}
        <header className="h-16 px-8 flex items-center justify-between bg-white border-b border-slate-200/80">
          <div className="flex items-center gap-3">
            <h2
              className="text-lg font-bold text-[#0B2545]"
              style={{ fontFamily: "var(--font-playfair), 'Playfair Display', serif" }}
            >
              Transimex Canada Institutional Administration
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {isSuperAdmin && (
              <button
                onClick={() => setIsSubAdminModalOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 bg-[#D21F27] hover:bg-[#b51a21] active:scale-[0.99] text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Create Sub-Admin</span>
              </button>
            )}

            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-semibold text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>HQ Server: Online</span>
            </div>
          </div>
        </header>

        {/* Page Inner Content */}
        <div className="p-8 max-w-7xl w-full mx-auto space-y-8">
          {/* Welcome Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1
                className="text-3xl font-bold text-[#0B2545] tracking-tight leading-tight"
                style={{ fontFamily: "var(--font-playfair), 'Playfair Display', serif" }}
              >
                Welcome back, {user.name}
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Centralized system oversight, team delegations, and nationwide logistics dispatching.
              </p>
            </div>

            {isSuperAdmin && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsSubAdminModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#0B2545] hover:bg-[#123156] text-white rounded-xl font-semibold text-xs transition-all shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-[#D21F27]" />
                  <span>+ New Sub-Admin Account</span>
                </button>
              </div>
            )}
          </div>

          {/* KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Active Dispatches
                </span>
                <div className="p-2 bg-red-50 text-[#D21F27] rounded-xl">
                  <Truck className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-bold text-[#0B2545] mt-3">28 Loads</div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold mt-2">
                <span>↑ 12% vs last week</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Client Portals
                </span>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-bold text-[#0B2545] mt-3">142 Accounts</div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
                <span>Verified Corporate Shippers</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Admin &amp; Dispatch Staff
                </span>
                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-bold text-[#0B2545] mt-3">
                {subAdminsList.length > 0 ? subAdminsList.length : "1"} Active
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
                <span>Super &amp; Sub-Admins</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Customs Clearance
                </span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-bold text-[#0B2545] mt-3">100% Valid</div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold mt-2">
                <span>CBSA &amp; US-CBP In Compliance</span>
              </div>
            </div>
          </div>

          {/* ----------------- SUB-ADMINS & TEAM MANAGEMENT SECTION ----------------- */}
          {(activeTab === "team" || activeTab === "overview") && (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3
                      className="text-xl font-bold text-[#0B2545]"
                      style={{ fontFamily: "var(--font-playfair), 'Playfair Display', serif" }}
                    >
                      Admin Staff &amp; Sub-Admins
                    </h3>
                    <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-full">
                      {subAdminsList.length} Team Members
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Super Admins can create and authorize dedicated sub-admin credentials that use the unified login portal.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={loadSubAdmins}
                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                    title="Refresh list"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingAdmins ? "animate-spin" : ""}`} />
                  </button>

                  {isSuperAdmin && (
                    <button
                      onClick={() => setIsSubAdminModalOpen(true)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-[#D21F27] hover:bg-[#b51a21] text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>+ Create Sub-Admin Account</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Team Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#F8FAFC] text-slate-500 text-[11px] uppercase tracking-wider font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-6">Staff Name &amp; Email</th>
                      <th className="py-3.5 px-6">Role / Authorization</th>
                      <th className="py-3.5 px-6">Department / Branch</th>
                      <th className="py-3.5 px-6">Status</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {subAdminsList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 text-sm">
                          Loading administrator records...
                        </td>
                      </tr>
                    ) : (
                      subAdminsList.map((admin) => (
                        <tr key={admin._id || admin.id || admin.email} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs ${
                                  admin.role === "superadmin" ? "bg-[#0B2545]" : "bg-[#D21F27]"
                                }`}
                              >
                                {admin.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900">{admin.name}</div>
                                <div className="text-xs text-slate-400">{admin.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                                admin.role === "superadmin"
                                  ? "bg-slate-900 text-white"
                                  : "bg-red-50 text-[#D21F27] border border-red-200"
                              }`}
                            >
                              <Shield className="w-3 h-3" />
                              <span>
                                {admin.role === "superadmin" ? "Super Admin" : "Sub-Admin"}
                              </span>
                            </span>
                          </td>
                          <td className="py-4 px-6 text-slate-600 text-xs">
                            {admin.companyName || "Transimex Operations"}
                          </td>
                          <td className="py-4 px-6">
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              Active Credentials
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <span className="text-xs text-slate-400">Unified Login Enabled</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ----------------- DISPATCH MONITOR TABLE ----------------- */}
          {(activeTab === "dispatch" || activeTab === "overview") && (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3
                    className="text-xl font-bold text-[#0B2545]"
                    style={{ fontFamily: "var(--font-playfair), 'Playfair Display', serif" }}
                  >
                    National Fleet &amp; Freight Dispatches
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Real-time monitoring across Canadian corridors and cross-border transit.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#F8FAFC] text-slate-500 text-[11px] uppercase tracking-wider font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-6">Shipment ID</th>
                      <th className="py-3.5 px-6">Client Shipper</th>
                      <th className="py-3.5 px-6">Route &amp; Lane</th>
                      <th className="py-3.5 px-6">Customs Status</th>
                      <th className="py-3.5 px-6">Dispatch Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    <tr className="hover:bg-slate-50/80">
                      <td className="py-4 px-6 font-mono font-semibold text-slate-900">
                        TRX-94821-CA
                      </td>
                      <td className="py-4 px-6 font-semibold text-slate-800">
                        Laurentian Global Logistics Ltd.
                      </td>
                      <td className="py-4 px-6 text-slate-600">Montreal, QC → Toronto, ON</td>
                      <td className="py-4 px-6">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Cleared (PAPS #7712)
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          In Transit (Hwy 401 W)
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/80">
                      <td className="py-4 px-6 font-mono font-semibold text-slate-900">
                        TRX-88210-US
                      </td>
                      <td className="py-4 px-6 font-semibold text-slate-800">
                        Trans-Canada Manufacturing Inc.
                      </td>
                      <td className="py-4 px-6 text-slate-600">Windsor, ON → Detroit, MI</td>
                      <td className="py-4 px-6">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Pre-Arrival Inspection
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                          At Ambassador Bridge
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/80">
                      <td className="py-4 px-6 font-mono font-semibold text-slate-900">
                        TRX-74019-QC
                      </td>
                      <td className="py-4 px-6 font-semibold text-slate-800">
                        Maritime Cargo Solutions
                      </td>
                      <td className="py-4 px-6 text-slate-600">Halifax, NS → Quebec City, QC</td>
                      <td className="py-4 px-6">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Cleared (Domestic)
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700">
                          Delivered to Hub
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ----------------- CREATE SUB-ADMIN MODAL ----------------- */}
      {isSubAdminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-red-50 text-[#D21F27] rounded-xl">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3
                    className="text-xl font-bold text-[#0B2545]"
                    style={{ fontFamily: "var(--font-playfair), 'Playfair Display', serif" }}
                  >
                    Create Sub-Admin Account
                  </h3>
                  <p className="text-xs text-slate-500">
                    Authorize a new administrator for Transimex operations.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSubAdminModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {modalSuccess && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{modalSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubAdmin} className="space-y-4 mt-5">
              {/* Full Name */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Sub-Admin Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Jenkins"
                  value={subAdminName}
                  onChange={(e) => setSubAdminName(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-slate-200 focus:border-[#D21F27] focus:bg-white focus:ring-2 focus:ring-[#D21F27]/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all"
                />
              </div>

              {/* Corporate Email */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Corporate Staff Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. s.jenkins@transimex.ca"
                  value={subAdminEmail}
                  onChange={(e) => setSubAdminEmail(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-slate-200 focus:border-[#D21F27] focus:bg-white focus:ring-2 focus:ring-[#D21F27]/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Initial Secure Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={subAdminPassword}
                  onChange={(e) => setSubAdminPassword(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-slate-200 focus:border-[#D21F27] focus:bg-white focus:ring-2 focus:ring-[#D21F27]/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all"
                />
              </div>

              {/* Department & Role Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Role Tier
                  </label>
                  <select
                    value={subAdminRole}
                    onChange={(e) => setSubAdminRole(e.target.value as any)}
                    className="w-full bg-[#f8fafc] border border-slate-200 focus:border-[#D21F27] focus:bg-white rounded-xl px-3 py-2.5 text-sm text-slate-900 outline-none"
                  >
                    <option value="subadmin">Sub-Admin</option>
                    <option value="admin">Operations Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Department
                  </label>
                  <select
                    value={subAdminDept}
                    onChange={(e) => setSubAdminDept(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-slate-200 focus:border-[#D21F27] focus:bg-white rounded-xl px-3 py-2.5 text-sm text-slate-900 outline-none"
                  >
                    <option value="Dispatch & Operations">Dispatch &amp; Operations</option>
                    <option value="Customs Compliance">Customs Compliance</option>
                    <option value="Fleet Tracking">Fleet Tracking</option>
                    <option value="Billing & Finance">Billing &amp; Finance</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSubAdminModalOpen(false)}
                  className="px-4 py-2.5 text-slate-600 hover:text-slate-900 font-semibold text-xs rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-5 py-2.5 bg-[#D21F27] hover:bg-[#b51a21] text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-60"
                >
                  {modalLoading ? "Creating Sub-Admin..." : "Create Account & Grant Access"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutGrid,
  Truck,
  FileText,
  FileSpreadsheet,
  Bell,
  Settings,
  Globe,
  User as UserIcon,
  Languages,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  LogOut,
  ChevronRight,
  X,
  ExternalLink,
  Shield,
  ArrowUpRight,
} from "lucide-react";
import TransimexLogo from "@/components/TransimexLogo";

interface UserProfile {
  name: string;
  email: string;
  companyName: string;
  role: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile>({
    name: "Acme Logistics Manager",
    email: "freight@acmecorp.com",
    companyName: "Acme Corp",
    role: "client",
  });
  const [activeNav, setActiveNav] = useState("dashboard");
  const [lang, setLang] = useState<"EN" | "FR">("EN");
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [trackNumber, setTrackNumber] = useState("");
  const [trackResult, setTrackResult] = useState<string | null>(null);

  // Fetch logged in user or fallback to localStorage
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        } else {
          const stored = localStorage.getItem("transimex_user");
          if (stored) {
            try {
              setUser(JSON.parse(stored));
            } catch {}
          }
        }
      })
      .catch(() => {
        const stored = localStorage.getItem("transimex_user");
        if (stored) {
          try {
            setUser(JSON.parse(stored));
          } catch {}
        }
      });
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    localStorage.removeItem("transimex_user");
    router.push("/login");
  };

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackNumber.trim()) return;
    setTrackResult(`Shipment ${trackNumber.toUpperCase()} is ON SCHEDULE: Departed Montreal Hub, En Route to Toronto Distribution Center.`);
  };

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-slate-800 antialiased font-sans">
      {/* ----------------- LEFT SIDEBAR ----------------- */}
      <aside className="w-64 bg-[#0E1E38] text-slate-300 flex flex-col justify-between flex-shrink-0 min-h-screen z-20">
        <div>
          {/* Brand Logo */}
          <div className="p-6 border-b border-slate-800/80">
            <TransimexLogo variant="dark" size="md" />
          </div>

          {/* Navigation Links */}
          <nav className="mt-6 space-y-1">
            {/* Dashboard */}
            <button
              onClick={() => setActiveNav("dashboard")}
              className={`w-full flex items-center gap-3.5 px-6 py-3.5 text-sm font-medium transition-all text-left ${
                activeNav === "dashboard"
                  ? "bg-[#182B4A] text-white border-l-4 border-[#D9232E] font-semibold"
                  : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            {/* My Shipments */}
            <button
              onClick={() => setActiveNav("shipments")}
              className={`w-full flex items-center gap-3.5 px-6 py-3.5 text-sm font-medium transition-all text-left ${
                activeNav === "shipments"
                  ? "bg-[#182B4A] text-white border-l-4 border-[#D9232E] font-semibold"
                  : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>My Shipments</span>
            </button>

            {/* My Quotes */}
            <button
              onClick={() => setActiveNav("quotes")}
              className={`w-full flex items-center gap-3.5 px-6 py-3.5 text-sm font-medium transition-all text-left ${
                activeNav === "quotes"
                  ? "bg-[#182B4A] text-white border-l-4 border-[#D9232E] font-semibold"
                  : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>My Quotes</span>
            </button>

            {/* Documents */}
            <button
              onClick={() => setActiveNav("documents")}
              className={`w-full flex items-center gap-3.5 px-6 py-3.5 text-sm font-medium transition-all text-left ${
                activeNav === "documents"
                  ? "bg-[#182B4A] text-white border-l-4 border-[#D9232E] font-semibold"
                  : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Documents</span>
            </button>

            {/* Notifications */}
            <button
              onClick={() => setActiveNav("notifications")}
              className={`w-full flex items-center justify-between px-6 py-3.5 text-sm font-medium transition-all text-left ${
                activeNav === "notifications"
                  ? "bg-[#182B4A] text-white border-l-4 border-[#D9232E] font-semibold"
                  : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3.5">
                <Bell className="w-4 h-4" />
                <span>Notifications</span>
              </div>
              <span className="w-5 h-5 rounded-full bg-[#D9232E] text-white text-[11px] font-bold flex items-center justify-center">
                3
              </span>
            </button>

            {/* Settings */}
            <button
              onClick={() => setActiveNav("settings")}
              className={`w-full flex items-center gap-3.5 px-6 py-3.5 text-sm font-medium transition-all text-left ${
                activeNav === "settings"
                  ? "bg-[#182B4A] text-white border-l-4 border-[#D9232E] font-semibold"
                  : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </nav>
        </div>

        {/* Bottom User Profile Section */}
        <div className="p-4 m-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-slate-700/80 flex items-center justify-center font-bold text-white text-sm flex-shrink-0 shadow-inner">
              {user.companyName ? user.companyName.charAt(0).toUpperCase() : "A"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-white truncate">
                {user.companyName || "Acme Corp"}
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {user.email || "freight@acmecorp.com"}
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
        {/* Top Navigation Bar */}
        <header className="h-16 px-8 flex items-center justify-end gap-5 bg-transparent">
          {/* Language Switcher */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <button
              onClick={() => setLang("EN")}
              className={`hover:text-slate-900 transition-colors ${
                lang === "EN" ? "text-slate-900 font-bold" : "text-slate-400"
              }`}
            >
              EN
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={() => setLang("FR")}
              className={`hover:text-slate-900 transition-colors ${
                lang === "FR" ? "text-slate-900 font-bold" : "text-slate-400"
              }`}
            >
              FR
            </button>
          </div>

          {/* Languages Icon */}
          <button className="text-slate-500 hover:text-slate-800 transition-colors">
            <Languages className="w-4 h-4" />
          </button>

          {/* User Profile Avatar Icon */}
          <button className="text-slate-500 hover:text-slate-800 transition-colors">
            <UserIcon className="w-5 h-5 rounded-full border border-slate-300 p-0.5" />
          </button>
        </header>

        {/* Page Inner Content */}
        <div className="px-8 pb-12 max-w-7xl w-full">
          {/* Welcome Header */}
          <div className="mb-8">
            <h1
              className="text-4xl font-bold text-[#0F1E36] tracking-tight leading-tight"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Welcome back, {user.companyName || "Acme Corp"}.
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Here is your logistics overview for today.
            </p>
          </div>

          {/* 4 Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {/* 1. ACTIVE SHIPMENTS */}
            <div className="bg-white rounded-xl p-5 shadow-xs border border-slate-200/90 border-l-4 border-l-[#D9232E] relative flex flex-col justify-between h-28">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                  ACTIVE SHIPMENTS
                </span>
                <div className="w-8 h-8 rounded-lg bg-red-50/80 flex items-center justify-center text-[#D9232E]">
                  <Truck className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-900 tracking-tight">
                12
              </div>
            </div>

            {/* 2. PENDING QUOTES */}
            <div className="bg-white rounded-xl p-5 shadow-xs border border-slate-200/90 relative flex flex-col justify-between h-28">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                  PENDING QUOTES
                </span>
                <div className="w-8 h-8 rounded-lg bg-indigo-50/80 flex items-center justify-center text-indigo-600">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900 tracking-tight">
                  4
                </span>
                <span className="text-xs font-semibold text-[#D9232E] flex items-center gap-0.5">
                  ↑ Action Req
                </span>
              </div>
            </div>

            {/* 3. DELIVERED TOTAL */}
            <div className="bg-white rounded-xl p-5 shadow-xs border border-slate-200/90 relative flex flex-col justify-between h-28">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                  DELIVERED TOTAL
                </span>
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-900 tracking-tight">
                124
              </div>
            </div>

            {/* 4. DOCUMENTS AVAILABLE */}
            <div className="bg-white rounded-xl p-5 shadow-xs border border-slate-200/90 relative flex flex-col justify-between h-28">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                  DOCUMENTS AVAILABLE
                </span>
                <div className="w-8 h-8 rounded-lg bg-blue-50/80 flex items-center justify-center text-blue-600">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-900 tracking-tight">
                8
              </div>
            </div>
          </div>

          {/* Main 2-Column Split: Recent Activity & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Recent Activity */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-6">
                <h2
                  className="text-2xl font-bold text-[#0F1E36]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Recent Activity
                </h2>
                <button className="text-xs font-bold text-[#D9232E] hover:underline cursor-pointer">
                  View All
                </button>
              </div>

              {/* Activity Timeline List */}
              <div className="space-y-4 relative before:absolute before:left-2 before:top-3 before:bottom-3 before:w-[2px] before:bg-slate-100">
                {/* Item 1 */}
                <div className="relative flex items-start gap-4 pl-6">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#182B4A] absolute left-[3px] top-4 ring-4 ring-white" />
                  <div className="flex-1 p-4 rounded-xl bg-slate-50 hover:bg-slate-100/80 transition-colors border border-slate-100">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-slate-900">
                        Quote #124 <span className="font-normal text-slate-600">Accepted</span>
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">2 hours ago</div>
                  </div>
                </div>

                {/* Item 2 */}
                <div className="relative flex items-start gap-4 pl-6">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#D9232E] absolute left-[3px] top-4 ring-4 ring-white" />
                  <div className="flex-1 p-4 rounded-xl bg-slate-50 hover:bg-slate-100/80 transition-colors border-l-4 border-l-[#D9232E] border-t border-r border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        Shipment TMX-00847 <span className="font-normal text-slate-600">is In Transit</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">5 hours ago</div>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-blue-100/80 text-blue-700 text-[11px] font-semibold tracking-wide uppercase">
                      IN TRANSIT
                    </span>
                  </div>
                </div>

                {/* Item 3 */}
                <div className="relative flex items-start gap-4 pl-6">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-400 absolute left-[3px] top-4 ring-4 ring-white" />
                  <div className="flex-1 p-4 rounded-xl bg-slate-50 hover:bg-slate-100/80 transition-colors border border-slate-100">
                    <div className="text-sm font-semibold text-slate-900">
                      New document uploaded for <span className="font-normal text-slate-600">Invoice #882</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Yesterday</div>
                  </div>
                </div>

                {/* Item 4 */}
                <div className="relative flex items-start gap-4 pl-6">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#D9232E] absolute left-[3px] top-4 ring-4 ring-white" />
                  <div className="flex-1 p-4 rounded-xl bg-slate-50 hover:bg-slate-100/80 transition-colors border-l-4 border-l-[#D9232E] border-t border-r border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        Quote #125 <span className="font-normal text-slate-600">Pending Review</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">Yesterday</div>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-amber-100/80 text-amber-800 text-[11px] font-semibold tracking-wide uppercase">
                      PENDING
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right 1 Col: Quick Actions & Live Network Map */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <h2
                  className="text-2xl font-bold text-[#0F1E36] mb-5"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Quick Actions
                </h2>

                {/* Buttons */}
                <div className="space-y-3 mb-6">
                  <button
                    onClick={() => setIsQuoteModalOpen(true)}
                    className="w-full py-3 px-4 rounded-xl bg-[#D9232E] hover:bg-[#BE1B26] text-white font-semibold text-sm shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Request New Quote</span>
                  </button>

                  <button
                    onClick={() => setIsTrackModalOpen(true)}
                    className="w-full py-3 px-4 rounded-xl border-2 border-[#D9232E] text-[#D9232E] hover:bg-red-50/60 font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Search className="w-4 h-4" />
                    <span>Track Shipment</span>
                  </button>
                </div>

                {/* Live Network Map */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                    LIVE NETWORK MAP
                  </div>
                  <div className="relative w-full h-40 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center group cursor-pointer">
                    {/* Simulated Radar / Map lines */}
                    <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent" />
                    
                    {/* Network Nodes and routes */}
                    <svg className="absolute inset-0 w-full h-full text-red-500/60 stroke-current fill-none">
                      <path d="M 40 90 Q 120 40 200 70 T 300 50" strokeWidth="2" strokeDasharray="4 4" className="animate-pulse" />
                      <circle cx="40" cy="90" r="4" fill="#D9232E" />
                      <circle cx="200" cy="70" r="3" fill="#38BDF8" />
                      <circle cx="300" cy="50" r="4" fill="#D9232E" />
                    </svg>

                    <div className="relative z-10 text-center p-3">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/10 backdrop-blur-md text-white text-[11px] font-medium border border-white/20">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        48 Active Highway Corridors
                      </div>
                      <div className="text-[10px] text-slate-400 mt-2">
                        Real-time GPS dispatch across Canada & USA
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Compliance */}
              <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
                <span>C-TPAT / PIP Certified</span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Encrypted
                </span>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="mt-12 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} Transimex Canada Logistics. Client Portal V.2.4
          </div>
        </div>
      </main>

      {/* ----------------- REQUEST QUOTE MODAL ----------------- */}
      {isQuoteModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-xl font-bold text-[#0F1E36]">Request Instant Freight Quote</h3>
              <button
                onClick={() => setIsQuoteModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                alert("Freight Quote Request submitted! Transimex Dispatch will send pricing within 15 minutes.");
                setIsQuoteModalOpen(false);
              }}
              className="space-y-4 mt-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Origin City / Postal</label>
                  <input required placeholder="Montreal, QC (H3C)" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Destination City / Postal</label>
                  <input required placeholder="Toronto, ON (M5V)" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Equipment Type</label>
                  <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                    <option>53' Dry Van</option>
                    <option>Refrigerated / Reefer</option>
                    <option>Flatbed / Stepdeck</option>
                    <option>Intermodal Rail</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Estimated Weight (lbs)</label>
                  <input type="number" required placeholder="38,000" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-[#D9232E] hover:bg-[#BE1B26] text-white font-semibold rounded-xl text-sm transition-colors mt-2"
              >
                Submit Quote Request
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- TRACK SHIPMENT MODAL ----------------- */}
      {isTrackModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-xl font-bold text-[#0F1E36]">Track Active Shipment</h3>
              <button
                onClick={() => {
                  setIsTrackModalOpen(false);
                  setTrackResult(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleTrackSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Enter BOL or Tracking Number</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    required
                    placeholder="e.g. TMX-00847"
                    value={trackNumber}
                    onChange={(e) => setTrackNumber(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-[#D9232E] hover:bg-[#BE1B26] text-white font-semibold rounded-xl text-sm transition-colors"
              >
                Lookup Telematics Status
              </button>
            </form>

            {trackResult && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs flex items-start gap-2 animate-in fade-in">
                <Truck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <span>{trackResult}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

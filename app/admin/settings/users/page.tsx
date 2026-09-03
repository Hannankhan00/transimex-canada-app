"use client";

import React, { useState, useEffect, useCallback } from "react";
import SettingsNavTabs from "@/components/admin/settings/SettingsNavTabs";
import { StaffUser, StaffRole } from "@/lib/mockData";
import {
  Users,
  Plus,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Send,
  X,
  Mail,
  UserCheck,
  Building2,
  Lock,
} from "lucide-react";

export default function AdminUsersSettingsPage() {
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [counts, setCounts] = useState({ total: 0, active: 0, pending: 0, revoked: 0 });
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Invite Modal State
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<StaffRole>("Dispatcher");
  const [inviteDept, setInviteDept] = useState("Logistics Operations");
  const [inviting, setInviting] = useState(false);

  const fetchStaff = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch("/api/admin/settings/users");
      const data = await res.json();
      if (res.ok && data.staff) {
        setStaff(data.staff);
        if (data.counts) setCounts(data.counts);
      }
    } catch (err) {
      console.error("Error loading staff:", err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleRoleChange = async (userId: string, newRole: StaffRole) => {
    try {
      const res = await fetch(`/api/admin/settings/users/${encodeURIComponent(userId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update role");

      setStaff((prev) =>
        prev.map((s) => (s.id === userId ? { ...s, role: newRole } : s))
      );
      setToastMsg(`Staff role updated to ${newRole}`);
      setTimeout(() => setToastMsg(null), 3000);
    } catch (err: any) {
      alert(err.message || "Error updating role");
    }
  };

  const handleToggleStatus = async (user: StaffUser) => {
    const newStatus = user.status === "Active" ? "Revoked" : "Active";
    try {
      const res = await fetch(`/api/admin/settings/users/${encodeURIComponent(user.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to toggle status");

      setStaff((prev) =>
        prev.map((s) => (s.id === user.id ? { ...s, status: newStatus } : s))
      );
      setToastMsg(`Account for ${user.name} is now ${newStatus.toUpperCase()}`);
      setTimeout(() => setToastMsg(null), 3000);
      fetchStaff();
    } catch (err: any) {
      alert(err.message || "Error updating access status");
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) return;

    try {
      setInviting(true);
      const res = await fetch("/api/admin/settings/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: inviteName.trim(),
          email: inviteEmail.trim(),
          role: inviteRole,
          department: inviteDept,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to invite staff member");

      setIsInviteOpen(false);
      setInviteName("");
      setInviteEmail("");
      setToastMsg(`Invitation email dispatched to ${inviteEmail}`);
      setTimeout(() => setToastMsg(null), 3500);
      fetchStaff();
    } catch (err: any) {
      alert(err.message || "Error inviting staff user");
    } finally {
      setInviting(false);
    }
  };

  const filteredStaff = staff.filter((s) => {
    if (roleFilter !== "all" && s.role.toLowerCase() !== roleFilter.toLowerCase()) {
      return false;
    }
    if (statusFilter !== "all" && s.status.toLowerCase() !== statusFilter.toLowerCase()) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      return (
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q) ||
        s.role.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#d21f27]">
              Internal Identity &amp; Role-Based Governance
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-mono font-bold">
              SYSTEM SECURITY
            </span>
          </div>
          <h1
            className="text-3xl sm:text-4xl font-bold text-[#0B2545] tracking-tight leading-tight mt-1"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Admin User Access Management
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl">
            Configure internal staff accounts, assign privilege tiers (Super Admin, Dispatcher, Customs Agent), and revoke portal access immediately.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchStaff}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs transition cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setIsInviteOpen(true)}
            className="px-4 py-2 bg-[#0B2545] hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-[#d21f27]" />
            <span>Invite Staff Member</span>
          </button>
        </div>
      </div>

      {/* 2. SUB-NAVIGATION TABS */}
      <SettingsNavTabs />

      {toastMsg && (
        <div className="p-3.5 bg-[#0B2545] text-white rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 3. SUMMARY METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Internal Staff
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#0B2545]">{counts.total}</span>
            <span className="text-xs font-semibold text-slate-500">Personnel</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Transimex operations team</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
              Active Access Grants
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
              AUTHENTICATED
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-800">{counts.active}</span>
            <span className="text-xs font-semibold text-emerald-700">Live Profiles</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Single sign-on authorized</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
            Pending Onboarding
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-blue-800">{counts.pending}</span>
            <span className="text-xs font-semibold text-blue-700">Invites Sent</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Awaiting registration completion</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Revoked / Deactivated
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-700">{counts.revoked}</span>
            <span className="text-xs font-semibold text-red-600">Locked Out</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Immediate session termination</p>
        </div>
      </div>

      {/* 4. STAFF DIRECTORY TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Table Filters */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setRoleFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                roleFilter === "all"
                  ? "bg-[#0B2545] text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              All Roles ({staff.length})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("super admin")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                roleFilter === "super admin"
                  ? "bg-[#0B2545] text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              Super Admin
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("dispatcher")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                roleFilter === "dispatcher"
                  ? "bg-[#0B2545] text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              Dispatcher
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("customs agent")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                roleFilter === "customs agent"
                  ? "bg-[#0B2545] text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              Customs Agent
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search staff name, email, department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white border border-slate-200 focus:border-[#0B2545] rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 outline-none w-full sm:w-64 transition"
            />
          </div>
        </div>

        {/* Directory Table (Preserved on Desktop) */}
        <div className="hidden md:block overflow-x-auto min-h-[300px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4">Staff Member</th>
                <th className="py-3.5 px-4">Department</th>
                <th className="py-3.5 px-4">Privilege Role</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Last Activity</th>
                <th className="py-3.5 px-4 text-right">Access Controls</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredStaff.map((user) => {
                const isActive = user.status === "Active";

                return (
                  <tr key={user.id} className="hover:bg-slate-50/80 transition">
                    {/* Name & Email */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#0B2545] text-white font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block">{user.name}</span>
                          <span className="text-[11px] text-slate-500 font-mono">{user.email}</span>
                        </div>
                      </div>
                    </td>

                    {/* Department */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                      {user.department}
                    </td>

                    {/* Assigned Role */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <select
                        value={user.role}
                        disabled={!isActive}
                        onChange={(e) => handleRoleChange(user.id, e.target.value as StaffRole)}
                        className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 outline-none cursor-pointer disabled:opacity-50"
                      >
                        <option value="Super Admin">Super Admin</option>
                        <option value="Dispatcher">Dispatcher</option>
                        <option value="Customs Agent">Customs Agent</option>
                        <option value="Support Specialist">Support Specialist</option>
                        <option value="Auditor">Auditor / Viewer</option>
                      </select>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                          isActive
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : user.status === "Pending"
                            ? "bg-blue-50 text-blue-800 border border-blue-200"
                            : "bg-red-50 text-red-800 border border-red-200"
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>

                    {/* Last Login */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 text-[11px] font-mono">
                      {user.lastLogin}
                    </td>

                    {/* Access Action */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-right">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(user)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                          isActive
                            ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                            : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                        }`}
                      >
                        {isActive ? "Revoke Access" : "Restore Access"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List for Staff Users */}
        <div className="block md:hidden divide-y divide-slate-100">
          {filteredStaff.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No staff members match filter criteria.
            </div>
          ) : (
            filteredStaff.map((user) => {
              const isActive = user.status === "Active";

              return (
                <div key={user.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#0B2545] text-white font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 text-xs block">{user.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{user.email}</span>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        isActive
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : user.status === "Pending"
                          ? "bg-blue-50 text-blue-800 border border-blue-200"
                          : "bg-red-50 text-red-800 border border-red-200"
                      }`}
                    >
                      {user.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-500 text-[11px]">{user.department}</span>
                    <select
                      value={user.role}
                      disabled={!isActive}
                      onChange={(e) => handleRoleChange(user.id, e.target.value as StaffRole)}
                      className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 outline-none"
                    >
                      <option value="Super Admin">Super Admin</option>
                      <option value="Dispatcher">Dispatcher</option>
                      <option value="Customs Agent">Customs Agent</option>
                      <option value="Support Specialist">Support Specialist</option>
                      <option value="Auditor">Auditor / Viewer</option>
                    </select>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-mono">Last active: {user.lastLogin}</span>

                    <button
                      type="button"
                      onClick={() => handleToggleStatus(user)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        isActive
                          ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                          : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                      }`}
                    >
                      {isActive ? "Revoke Access" : "Restore Access"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 5. INVITE STAFF MODAL */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#0B2545] text-white flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-[#d21f27]" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Invite Staff Member</h3>
                  <p className="text-[11px] text-slate-500">
                    Sends a secure administrative onboarding link to their corporate email.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsInviteOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-3.5">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Full Legal Name</label>
                <input
                  type="text"
                  placeholder="e.g. Catherine Bélanger"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:bg-white focus:border-[#0B2545]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Corporate Email Address</label>
                <input
                  type="email"
                  placeholder="cbelanger@transimex.ca"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:bg-white focus:border-[#0B2545]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Privilege Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as StaffRole)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold outline-none"
                  >
                    <option value="Dispatcher">Dispatcher</option>
                    <option value="Customs Agent">Customs Agent</option>
                    <option value="Support Specialist">Support Specialist</option>
                    <option value="Super Admin">Super Admin</option>
                    <option value="Auditor">Auditor / Viewer</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Department</label>
                  <input
                    type="text"
                    value={inviteDept}
                    onChange={(e) => setInviteDept(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  disabled={inviting}
                  className="px-3 py-1.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="px-4 py-1.5 bg-[#0B2545] hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3 h-3 text-[#d21f27]" />
                  <span>{inviting ? "Dispatching..." : "Send Invitation"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

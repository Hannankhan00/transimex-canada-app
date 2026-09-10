"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  PERMISSION_MODULES,
  ROLE_PRESETS,
  PermissionModule,
  RoleType,
  getRolePreset,
} from "@/lib/rbac";
import PermissionGuard from "@/components/admin/PermissionGuard";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Plus,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Edit2,
  Trash2,
  X,
  UserCheck,
  UserX,
  KeyRound,
  FileText,
  Truck,
  Users,
  Briefcase,
  Mail,
  Settings,
  Sliders,
  Check,
} from "lucide-react";

interface StaffItem {
  id: string;
  name: string;
  email: string;
  role: string;
  jobTitle: string;
  department: string;
  permissions: PermissionModule[];
  status: "active" | "pending" | "revoked";
  lastLogin: string;
  createdAt: string;
}

const MODULE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  quotes: FileText,
  shipments: Truck,
  clients: Users,
  carriers: Briefcase,
  messages: Mail,
  staff: Shield,
  settings: Settings,
};

export default function StaffManagementPage() {
  const { language } = useLanguage();

  const [staff, setStaff] = useState<StaffItem[]>([]);
  const [counts, setCounts] = useState({ total: 0, active: 0, limited: 0, revoked: 0 });
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filters
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Create Staff Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [createRole, setCreateRole] = useState<RoleType>("dispatcher");
  const [createDept, setCreateDept] = useState("Logistics Operations");
  const [createPermissions, setCreatePermissions] = useState<PermissionModule[]>(
    ROLE_PRESETS.find((r) => r.id === "dispatcher")?.defaultPermissions || []
  );
  const [creating, setCreating] = useState(false);

  // Edit Permissions Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffItem | null>(null);
  const [editRole, setEditRole] = useState<string>("dispatcher");
  const [editDept, setEditDept] = useState("");
  const [editPermissions, setEditPermissions] = useState<PermissionModule[]>([]);
  const [editPassword, setEditPassword] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete Confirmation Modal
  const [staffToDelete, setStaffToDelete] = useState<StaffItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const notify = (text: string, type: "success" | "error" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const fetchStaff = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch("/api/admin/staff");
      const data = await res.json();
      if (res.ok && data.staff) {
        setStaff(data.staff);
        if (data.counts) setCounts(data.counts);
        if (data.currentUserId) setCurrentUserId(data.currentUserId);
        setIsSuperAdmin(!!data.isSuperAdmin);
      } else if (data.error) {
        notify(data.error, "error");
      }
    } catch (err: any) {
      console.error("Error loading staff accounts:", err);
      notify("Failed to load staff accounts", "error");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  // Generate secure temporary password
  const handleGeneratePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
    let pwd = "";
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCreatePassword(pwd);
    setShowPassword(true);
  };

  // When role preset changes in Create Modal
  const handleCreateRoleChange = (newRole: RoleType) => {
    setCreateRole(newRole);
    const preset = ROLE_PRESETS.find((r) => r.id === newRole);
    if (preset) {
      setCreatePermissions([...preset.defaultPermissions]);
    }
  };

  // Toggle individual permission in Create Modal
  const handleToggleCreatePermission = (mod: PermissionModule) => {
    setCreatePermissions((prev) => {
      const exists = prev.includes(mod);
      const next = exists ? prev.filter((p) => p !== mod) : [...prev, mod];
      // Switch role dropdown to custom if it no longer matches the preset
      setCreateRole("custom");
      return next;
    });
  };

  // Create Staff Account Form Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim() || !createEmail.trim() || !createPassword.trim()) {
      notify("Please fill in all required fields", "error");
      return;
    }

    try {
      setCreating(true);
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName.trim(),
          email: createEmail.trim(),
          password: createPassword.trim(),
          role: createRole,
          department: createDept.trim() || "Logistics Operations",
          permissions: createPermissions,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create staff account");

      notify(`Staff account for ${createName} created successfully.`);
      setIsCreateOpen(false);
      setCreateName("");
      setCreateEmail("");
      setCreatePassword("");
      fetchStaff();
    } catch (err: any) {
      notify(err.message || "Error creating staff account", "error");
    } finally {
      setCreating(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (item: StaffItem) => {
    setEditingStaff(item);
    setEditRole(item.role);
    setEditDept(item.department);
    setEditPermissions([...item.permissions]);
    setEditPassword("");
    setIsEditOpen(true);
  };

  // When role preset changes in Edit Modal
  const handleEditRoleChange = (newRole: string) => {
    setEditRole(newRole);
    const preset = getRolePreset(newRole);
    if (preset && newRole !== "custom") {
      setEditPermissions([...preset.defaultPermissions]);
    }
  };

  // Toggle individual permission in Edit Modal
  const handleToggleEditPermission = (mod: PermissionModule) => {
    setEditPermissions((prev) => {
      const exists = prev.includes(mod);
      const next = exists ? prev.filter((p) => p !== mod) : [...prev, mod];
      setEditRole("custom");
      return next;
    });
  };

  // Save Staff Edits
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    try {
      setSavingEdit(true);
      const body: any = {
        role: editRole,
        department: editDept,
        permissions: editPermissions,
      };
      if (editPassword.trim()) {
        body.newPassword = editPassword.trim();
      }

      const res = await fetch(`/api/admin/staff/${encodeURIComponent(editingStaff.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update staff account");

      notify(`Updated permissions for ${editingStaff.name}`);
      setIsEditOpen(false);
      setEditingStaff(null);
      fetchStaff();
    } catch (err: any) {
      notify(err.message || "Error updating staff member", "error");
    } finally {
      setSavingEdit(false);
    }
  };

  // Toggle Status (Active vs Revoked)
  const handleToggleStatus = async (item: StaffItem) => {
    const nextStatus = item.status === "active" ? "revoked" : "active";
    try {
      const res = await fetch(`/api/admin/staff/${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update account status");

      notify(
        `Account for ${item.name} is now ${nextStatus === "active" ? "ACTIVE" : "REVOKED"}`
      );
      fetchStaff();
    } catch (err: any) {
      notify(err.message || "Error toggling account status", "error");
    }
  };

  // Delete Staff Account
  const handleDeleteConfirm = async () => {
    if (!staffToDelete) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/admin/staff/${encodeURIComponent(staffToDelete.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete staff account");

      notify(`Staff account for ${staffToDelete.name} deleted.`);
      setStaffToDelete(null);
      fetchStaff();
    } catch (err: any) {
      notify(err.message || "Error deleting account", "error");
    } finally {
      setDeleting(false);
    }
  };

  // Filtered staff list
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
        s.jobTitle.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <PermissionGuard module="staff">
      <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#d21f27]">
              Internal Identity &amp; Access Governance
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-mono font-bold">
              ENTERPRISE RBAC
            </span>
          </div>
          <h1
            className="text-2xl sm:text-4xl font-bold text-[#0B2545] tracking-tight leading-tight mt-1"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {language === "fr"
              ? "Gestion du Personnel & Contrôle d'Accès"
              : "Staff & Role-Based Access Control"}
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl">
            {language === "fr"
              ? "Créez les comptes des membres du personnel, définissez leurs mots de passe et accordez-leur des accès restreints aux modules de la plateforme."
              : "Create accounts for your staff members, set initial credentials, and grant limited module-level permissions across Transimex operations."}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchStaff}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs transition cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? "animate-spin" : ""}`}
            />
            <span>{language === "fr" ? "Actualiser" : "Refresh"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCreateRole("dispatcher");
              setCreatePermissions(
                ROLE_PRESETS.find((r) => r.id === "dispatcher")?.defaultPermissions || []
              );
              setIsCreateOpen(true);
            }}
            className="px-4 py-2 bg-[#0B2545] hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-2"
          >
            <Plus className="w-4 h-4 text-[#d21f27]" />
            <span>{language === "fr" ? "Créer Compte Personnel" : "Create Staff Account"}</span>
          </button>
        </div>
      </div>

      {/* TOAST MESSAGE */}
      {toastMsg && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150 ${
            toastMsg.type === "success"
              ? "bg-[#0B2545] text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toastMsg.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-white flex-shrink-0" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* 2. STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Staff Directory
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#0B2545]">{counts.total}</span>
            <span className="text-xs font-semibold text-slate-500">Personnel</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Transimex operations personnel</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
              Active Authorized
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
              LIVE
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-800">{counts.active}</span>
            <span className="text-xs font-semibold text-emerald-700">Authenticated</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Can access authorized modules</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
            Limited-Access Staff
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-blue-800">{counts.limited}</span>
            <span className="text-xs font-semibold text-blue-700">Restricted Tiers</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Dispatchers, Customs, Support</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Deactivated / Revoked
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-700">{counts.revoked}</span>
            <span className="text-xs font-semibold text-red-600">Locked Out</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Sessions immediately blocked</p>
        </div>
      </div>

      {/* 3. STAFF DIRECTORY & PERMISSION CONTROLS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Table Filters & Search */}
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
              All Personnel ({staff.length})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("superadmin")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                roleFilter === "superadmin"
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
              Dispatchers
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("customs_agent")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                roleFilter === "customs_agent"
                  ? "bg-[#0B2545] text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              Customs
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("support")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                roleFilter === "support"
                  ? "bg-[#0B2545] text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              Support
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

        {/* Desktop Staff Table */}
        <div className="hidden md:block overflow-x-auto min-h-[300px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4">Staff Member</th>
                <th className="py-3.5 px-4">Role &amp; Department</th>
                <th className="py-3.5 px-4">Granted Module Access (RBAC)</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Last Activity</th>
                <th className="py-3.5 px-4 text-right">Access Controls</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No staff accounts match your criteria.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((user) => {
                  const isActive = user.status === "active";
                  const preset = getRolePreset(user.role);
                  const isSelf = user.id === currentUserId;

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/80 transition">
                      {/* Name & Email */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-[#0B2545] text-white font-bold flex items-center justify-center text-xs flex-shrink-0 shadow-xs">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900">{user.name}</span>
                              {isSelf && (
                                <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[9px] font-bold">
                                  YOU
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {user.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role & Department */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div>
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${preset.badgeClass}`}
                          >
                            {preset.titleEn}
                          </span>
                          <span className="text-[11px] text-slate-500 block mt-0.5">
                            {user.department}
                          </span>
                        </div>
                      </td>

                      {/* Permissions */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-sm">
                          {user.role === "superadmin" ? (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[10px] font-bold border border-slate-200">
                              Full Master Access (All Modules)
                            </span>
                          ) : (
                            user.permissions.map((mod) => {
                              const ModIcon = MODULE_ICONS[mod] || Shield;
                              return (
                                <span
                                  key={mod}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-semibold border border-blue-200/60"
                                >
                                  <ModIcon className="w-2.5 h-2.5" />
                                  <span className="capitalize">{mod}</span>
                                </span>
                              );
                            })
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                            isActive
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : "bg-red-50 text-red-800 border border-red-200"
                          }`}
                        >
                          {isActive ? "ACTIVE" : "REVOKED"}
                        </span>
                      </td>

                      {/* Last Login */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 text-[11px] font-mono">
                        {user.lastLogin}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit Permissions */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(user)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
                            title="Edit Role & Permissions"
                          >
                            <Sliders className="w-3.5 h-3.5 text-slate-600" />
                          </button>

                          {/* Toggle Status */}
                          {!isSelf && (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(user)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                                isActive
                                  ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                              }`}
                            >
                              {isActive ? "Revoke" : "Restore"}
                            </button>
                          )}

                          {/* Delete Account (Super Admin only, not self) */}
                          {isSuperAdmin && !isSelf && (
                            <button
                              type="button"
                              onClick={() => setStaffToDelete(user)}
                              className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition cursor-pointer"
                              title="Delete Account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Staff Cards */}
        <div className="block md:hidden divide-y divide-slate-100">
          {filteredStaff.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No staff accounts match your criteria.
            </div>
          ) : (
            filteredStaff.map((user) => {
              const isActive = user.status === "active";
              const preset = getRolePreset(user.role);
              const isSelf = user.id === currentUserId;

              return (
                <div key={user.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-[#0B2545] text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
                        {user.name.charAt(0).toUpperCase()}
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
                          : "bg-red-50 text-red-800 border border-red-200"
                      }`}
                    >
                      {isActive ? "ACTIVE" : "REVOKED"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${preset.badgeClass}`}>
                      {preset.titleEn}
                    </span>
                    <span className="text-slate-500 text-[11px]">{user.department}</span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {user.permissions.map((mod) => (
                      <span
                        key={mod}
                        className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-semibold"
                      >
                        {mod}
                      </span>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(user)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
                    >
                      Configure Permissions
                    </button>

                    {!isSelf && (
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(user)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                          isActive
                            ? "border-red-200 bg-red-50 text-red-700"
                            : "border-emerald-200 bg-emerald-50 text-emerald-800"
                        }`}
                      >
                        {isActive ? "Revoke Access" : "Restore Access"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 4. CREATE STAFF ACCOUNT MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#0B2545] text-white flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-[#d21f27]" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Create Internal Staff Account</h3>
                  <p className="text-[11px] text-slate-500">
                    Provision direct portal credentials with limited module permissions.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Full Legal Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Marc Dubois"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:bg-white focus:border-[#0B2545]"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Corporate Email Address *</label>
                  <input
                    type="email"
                    placeholder="mdubois@transimex.ca"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:bg-white focus:border-[#0B2545]"
                  />
                </div>
              </div>

              {/* Password & Generator */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 block">Initial Account Password *</label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[11px] text-[#d21f27] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Generate Strong Password</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 6 characters"
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-10 py-2 text-xs text-slate-900 outline-none focus:bg-white focus:border-[#0B2545] font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  The staff member can log in immediately at /login using this email and password.
                </p>
              </div>

              {/* Role Preset & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Privilege Role Preset *</label>
                  <select
                    value={createRole}
                    onChange={(e) => handleCreateRoleChange(e.target.value as RoleType)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold outline-none cursor-pointer"
                  >
                    <option value="dispatcher">Freight Dispatcher</option>
                    <option value="customs_agent">Customs Specialist</option>
                    <option value="support">Support Specialist</option>
                    <option value="admin">Operations Manager</option>
                    <option value="superadmin">Super Admin (Full Master Access)</option>
                    <option value="custom">Custom Configuration</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Department</label>
                  <input
                    type="text"
                    value={createDept}
                    onChange={(e) => setCreateDept(e.target.value)}
                    placeholder="e.g. Freight Operations"
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-800 outline-none"
                  />
                </div>
              </div>

              {/* GRANULAR PERMISSIONS MATRIX */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-800 text-xs">
                    Limited Module Permissions ({createPermissions.length} granted)
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Check modules this staff user is authorized to see &amp; use
                  </span>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {PERMISSION_MODULES.map((mod) => {
                    const isChecked = createPermissions.includes(mod.id);
                    const ModIcon = MODULE_ICONS[mod.id] || Shield;

                    return (
                      <label
                        key={mod.id}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition cursor-pointer ${
                          isChecked
                            ? "bg-blue-50/50 border-blue-200 text-slate-900"
                            : "bg-slate-50/40 border-slate-200/80 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleCreatePermission(mod.id)}
                          className="mt-0.5 rounded border-slate-300 text-[#0B2545] focus:ring-[#0B2545] cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <ModIcon className="w-3.5 h-3.5 text-[#d21f27]" />
                            <span className="font-bold text-xs">{mod.labelEn}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                            {mod.descriptionEn}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={creating}
                  className="px-3 py-1.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-[#0B2545] hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <UserCheck className="w-3.5 h-3.5 text-[#d21f27]" />
                  <span>{creating ? "Creating Account..." : "Create Staff Account"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. EDIT STAFF & PERMISSIONS MODAL */}
      {isEditOpen && editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#0B2545] text-white flex items-center justify-center flex-shrink-0">
                  <Sliders className="w-4 h-4 text-[#d21f27]" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Configure Access: {editingStaff.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">{editingStaff.email}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* Role & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Privilege Role Preset</label>
                  <select
                    value={editRole}
                    onChange={(e) => handleEditRoleChange(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold outline-none cursor-pointer"
                  >
                    <option value="dispatcher">Freight Dispatcher</option>
                    <option value="customs_agent">Customs Specialist</option>
                    <option value="support">Support Specialist</option>
                    <option value="admin">Operations Manager</option>
                    <option value="superadmin">Super Admin (Full Master Access)</option>
                    <option value="custom">Custom Configuration</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Department</label>
                  <input
                    type="text"
                    value={editDept}
                    onChange={(e) => setEditDept(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-800 outline-none"
                  />
                </div>
              </div>

              {/* Optional Password Reset */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Reset Password (Leave blank to keep existing)
                </label>
                <input
                  type="password"
                  placeholder="Enter new password (optional)"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  minLength={6}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:bg-white focus:border-[#0B2545]"
                />
              </div>

              {/* Granular Permission Checkboxes */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-800 text-xs">
                    Module Access Permissions ({editPermissions.length} active)
                  </span>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {PERMISSION_MODULES.map((mod) => {
                    const isChecked = editPermissions.includes(mod.id);
                    const ModIcon = MODULE_ICONS[mod.id] || Shield;

                    return (
                      <label
                        key={mod.id}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition cursor-pointer ${
                          isChecked
                            ? "bg-blue-50/50 border-blue-200 text-slate-900"
                            : "bg-slate-50/40 border-slate-200/80 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleEditPermission(mod.id)}
                          className="mt-0.5 rounded border-slate-300 text-[#0B2545] focus:ring-[#0B2545] cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <ModIcon className="w-3.5 h-3.5 text-[#d21f27]" />
                            <span className="font-bold text-xs">{mod.labelEn}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                            {mod.descriptionEn}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  disabled={savingEdit}
                  className="px-3 py-1.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 bg-[#0B2545] hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{savingEdit ? "Saving..." : "Save Access Permissions"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. DELETE CONFIRMATION MODAL */}
      {staffToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150 text-xs">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>

            <div className="text-center">
              <h3 className="font-bold text-slate-900 text-sm">Delete Staff Account?</h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Are you sure you want to permanently delete the account for{" "}
                <span className="font-bold text-slate-800">{staffToDelete.name}</span> (
                {staffToDelete.email})? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStaffToDelete(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </PermissionGuard>
  );
}

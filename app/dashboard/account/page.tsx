"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  profileUpdateSchema,
  ProfileUpdateFormData,
  passwordChangeSchema,
  PasswordChangeFormData,
} from "@/lib/validations/profile";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { api } from "@/lib/api";
import { EmailPreferences } from "@/lib/mockData";

const DEFAULT_PREFERENCES: EmailPreferences = {
  emailShipmentUpdates: true,
  emailCustomsHolds: true,
  emailNewDocuments: true,
  emailRateAlerts: false,
  smsUrgentAlerts: true,
};
import {
  Settings,
  Building2,
  User,
  Mail,
  Phone,
  Shield,
  Lock,
  CheckCircle2,
  Globe2,
  Bell,
  Check,
  Briefcase,
  Layers,
  KeyRound,
  FileCheck,
  ArrowUpRight,
  Monitor,
  Smartphone,
  Tablet,
  LogOut,
  MapPin,
} from "lucide-react";

interface ActiveSession {
  id: string;
  device: string;
  browser: string;
  os: string;
  ip: string;
  createdAt: string;
  lastActive: string;
  isCurrent: boolean;
}

export default function AccountSettingsPage() {
  const router = useRouter();
  const { t, language, setLanguage } = useLanguage();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loggingOutAll, setLoggingOutAll] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<EmailPreferences>(DEFAULT_PREFERENCES);
  const [currentUser, setCurrentUser] = useState<any>({
    name: "",
    email: "",
    companyName: "",
    phone: "",
    industry: "",
    city: "",
    province: "",
    jobTitle: "",
    department: "",
    clientCode: "",
    role: "",
  });

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    reset: resetProfile,
    formState: { errors: profileErrors, isSubmitting: isSubmittingProfile },
  } = useForm<ProfileUpdateFormData>({
    resolver: zodResolver(profileUpdateSchema) as any,
    defaultValues: {
      name: "",
      phone: "",
      jobTitle: "",
      department: "",
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPassword,
    formState: { errors: passwordErrors, isSubmitting: isSubmittingPassword },
  } = useForm<PasswordChangeFormData>({
    resolver: zodResolver(passwordChangeSchema) as any,
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    api.auth.me().then((res) => {
      if (res.user) {
        const userObj = {
          name: res.user.name || "",
          email: res.user.email || "",
          companyName: res.user.companyName || "",
          phone: (res.user as any).phone || "",
          industry: (res.user as any).industry || "",
          city: (res.user as any).city || "",
          province: (res.user as any).province || "",
          jobTitle: (res.user as any).jobTitle || "",
          department: (res.user as any).department || "",
          clientCode: `TMX-${(res.user.userId || "CORP").slice(-4).toUpperCase()}`,
          role: (res.user as any).role || "client",
        };
        setCurrentUser(userObj);
        resetProfile({
          name: userObj.name,
          phone: userObj.phone,
          jobTitle: userObj.jobTitle,
          department: userObj.department,
        });
      }
    });

    fetch("/api/account/preferences")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setPreferences(data.preferences);
      })
      .catch(() => {});

    fetch("/api/account/sessions")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setSessions(data.sessions);
      })
      .catch(() => {});
  }, [resetProfile]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleLogoutAllDevices = async () => {
    setLoggingOutAll(true);
    try {
      const res = await fetch("/api/account/sessions/logout-all", { method: "POST" });
      if (!res.ok) throw new Error("Failed to log out all devices");
      router.push("/login");
    } catch (err: any) {
      showToast(err.message || "Failed to log out all devices");
      setLoggingOutAll(false);
    }
  };

  const handleLogoutDevice = async (sessionId: string) => {
    setRevokingId(sessionId);
    try {
      const res = await fetch(`/api/account/sessions/${sessionId}`, { method: "DELETE" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to log out device");

      if (result.isCurrentDevice) {
        router.push("/login");
        return;
      }

      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      showToast(language === "fr" ? "Appareil déconnecté" : "Device logged out");
    } catch (err: any) {
      showToast(err.message || "Failed to log out device");
    } finally {
      setRevokingId(null);
    }
  };

  const getDeviceIcon = (device: string) => {
    if (device === "Mobile") return Smartphone;
    if (device === "Tablet") return Tablet;
    return Monitor;
  };

  const handleProfileSubmit = async (data: ProfileUpdateFormData) => {
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to update profile");

      setCurrentUser((prev: any) => ({ ...prev, ...data }));
      showToast(
        language === "fr"
          ? "Profil corporatif mis à jour avec succès."
          : "Corporate profile information successfully updated."
      );
    } catch (err: any) {
      showToast(err.message || "Failed to update profile");
    }
  };

  const handlePasswordSubmit = async (data: PasswordChangeFormData) => {
    try {
      const res = await fetch("/api/account/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to update password");

      resetPassword();
      showToast(
        language === "fr"
          ? "Mot de passe sécurisé mis à jour."
          : "Security password updated successfully."
      );
    } catch (err: any) {
      showToast(err.message || "Failed to update password");
    }
  };

  const handleTogglePreference = async (key: keyof EmailPreferences) => {
    const updated = {
      ...preferences,
      [key]: !preferences[key],
    };
    setPreferences(updated);
    try {
      const res = await fetch("/api/account/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: updated[key] }),
      });
      if (!res.ok) throw new Error("Failed to update preferences");
      showToast(
        language === "fr"
          ? "Préférences de notification enregistrées."
          : "Notification preferences updated."
      );
    } catch {
      setPreferences(preferences);
      showToast("Failed to update notification preferences");
    }
  };

  const initialsSource = currentUser.name?.trim() || currentUser.email || "";
  const initials = initialsSource
    ? initialsSource
        .trim()
        .split(/\s+/)
        .map((part: string) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0B2545] text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold border border-white/10 animate-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#d21f27]">
          {language === "fr" ? "Paramètres & Personnalisation" : "Account Hub & Preferences"}
        </span>
        <h1
          className="text-2xl sm:text-3xl font-bold text-[#0B2545] tracking-tight leading-tight mt-1"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          {t.nav.account}
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm mt-1">
          {language === "fr"
            ? "Gérez les coordonnées de votre compte, vos préférences d'alerte par courriel et la langue du portail."
            : "Manage your administrator profile, automated email alert subscriptions, and portal language preferences."}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Main Section: Forms (8 cols on desktop) */}
        <div className="lg:col-span-8 space-y-6">
        {/* Language Preference Section */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-xs uppercase tracking-wider">
              <Globe2 className="w-4 h-4 text-[#d21f27]" />
              <span>{language === "fr" ? "Langue du Portail" : "Portal Language Preference"}</span>
            </div>
            <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
              Instant Bilingue
            </span>
          </div>
  
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-800">
                {language === "fr"
                  ? "Sélectionnez votre langue d'affichage pour l'ensemble du portail logistique."
                  : "Choose your primary display language across all manifests, notifications, and quote forms."}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Current active locale: <strong className="text-[#0B2545]">{language === "fr" ? "Français (FR)" : "English (EN)"}</strong>
              </p>
            </div>
  
            {/* Language Toggle Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                  language === "en"
                    ? "bg-[#0B2545] text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
              >
                <span>English (EN)</span>
                {language === "en" && <Check className="w-3.5 h-3.5 text-[#d21f27]" />}
              </button>
              <button
                type="button"
                onClick={() => setLanguage("fr")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                  language === "fr"
                    ? "bg-[#0B2545] text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
              >
                <span>Français (FR)</span>
                {language === "fr" && <Check className="w-3.5 h-3.5 text-[#d21f27]" />}
              </button>
            </div>
          </div>
        </div>
  
        {/* Profile Management Form */}
        <form onSubmit={handleSubmitProfile(handleProfileSubmit)} className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-6">
          {/* Section 1: Administrator Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-100 pb-2">
              <User className="w-4 h-4 text-[#d21f27]" />
              <span>1. {language === "fr" ? "Coordonnées de l'Administrateur" : "Primary Account Administrator"}</span>
            </div>
  
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {language === "fr" ? "Nom Complet" : "Full Name"} *
                </label>
                <input
                  {...registerProfile("name")}
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border ${
                    profileErrors.name ? "border-red-500 bg-red-50/30" : "border-slate-200"
                  } focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition font-medium text-slate-900`}
                />
                {profileErrors.name && (
                  <p className="text-[11px] text-red-600 mt-1 font-semibold">{profileErrors.name.message}</p>
                )}
              </div>
  
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {language === "fr" ? "Courriel Corporatif (Identifiant)" : "Corporate Email Address"}
                </label>
                <input
                  type="email"
                  disabled
                  value={currentUser.email}
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 text-slate-500 rounded-xl text-xs outline-none cursor-not-allowed font-medium"
                />
                <span className="text-[10px] text-slate-400">Primary single sign-on corporate identifier</span>
              </div>
  
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {language === "fr" ? "Téléphone Direct" : "Direct Phone Number"} *
                </label>
                <input
                  {...registerProfile("phone")}
                  placeholder="+1 (514) 555-0199"
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border ${
                    profileErrors.phone ? "border-red-500 bg-red-50/30" : "border-slate-200"
                  } focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition font-medium text-slate-900`}
                />
                {profileErrors.phone && (
                  <p className="text-[11px] text-red-600 mt-1 font-semibold">{profileErrors.phone.message}</p>
                )}
              </div>
  
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {language === "fr" ? "Titre du Poste" : "Job Title / Function"}
                </label>
                <input
                  {...registerProfile("jobTitle")}
                  placeholder="Senior Logistics Director"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition font-medium text-slate-900"
                />
              </div>
            </div>
          </div>
  
          {/* Section 2: Immutable Company Details */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-xs uppercase tracking-wider">
                <Building2 className="w-4 h-4 text-[#d21f27]" />
                <span>2. {language === "fr" ? "Entité Commerciale (Vérifiée)" : "Verified Corporate Commercial Entity"}</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Immutable Legal Info</span>
            </div>
  
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Company Name</span>
                <span className="font-bold text-slate-900 mt-0.5 block">{currentUser.companyName}</span>
              </div>
  
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Industry Sector</span>
                <span className="font-bold text-slate-900 mt-0.5 block">{currentUser.industry}</span>
              </div>
  
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Client ID Code</span>
                <span className="font-mono font-bold text-[#0B2545] mt-0.5 block">{currentUser.clientCode}</span>
              </div>
            </div>
          </div>
  
          <div className="pt-2 flex items-center justify-end">
            <button
              type="submit"
              disabled={isSubmittingProfile}
              className="px-6 py-2.5 bg-[#0B2545] hover:bg-[#123661] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition cursor-pointer flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{language === "fr" ? "Enregistrer les modifications" : "Save Profile Details"}</span>
            </button>
          </div>
        </form>
  
        {/* Notification Preferences Subscriptions */}
        <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-100 pb-3">
            <Bell className="w-4 h-4 text-[#d21f27]" />
            <span>{language === "fr" ? "Abonnements aux Alertes Automatiques" : "Automated Dispatch Alert Subscriptions"}</span>
          </div>
  
          <div className="divide-y divide-slate-100 text-xs">
            {/* Item 1 */}
            <div className="py-3 flex items-center justify-between gap-4">
              <div>
                <div className="font-bold text-slate-900">
                  {language === "fr" ? "Alertes de transit et télématique GPS" : "Shipment GPS Telematics & Milestone Alerts"}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {language === "fr"
                    ? "Recevoir un courriel lorsqu'un camion part ou approche d'un terminal."
                    : "Instant notifications on carrier departures, corridor milestones, and ETA changes."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleTogglePreference("emailShipmentUpdates")}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
                  preferences.emailShipmentUpdates ? "bg-[#d21f27]" : "bg-slate-200"
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    preferences.emailShipmentUpdates ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
  
            {/* Item 2 */}
            <div className="py-3 flex items-center justify-between gap-4">
              <div>
                <div className="font-bold text-slate-900">
                  {language === "fr" ? "Avis de retenue et dédouanement ASFC / CBSA" : "CBSA Customs & PARS Clearance Holds"}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {language === "fr"
                    ? "Notification prioritaire en cas d'inspection douanière ou de mainlevée accordée."
                    : "Critical alerts when customs broker requires clearance documents or cargo release is granted."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleTogglePreference("emailCustomsHolds")}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
                  preferences.emailCustomsHolds ? "bg-[#d21f27]" : "bg-slate-200"
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    preferences.emailCustomsHolds ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
  
            {/* Item 3 */}
            <div className="py-3 flex items-center justify-between gap-4">
              <div>
                <div className="font-bold text-slate-900">
                  {language === "fr" ? "Nouveaux documents et connaissements (BOL / POD)" : "New Document & BOL / POD Uploads"}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {language === "fr"
                    ? "Notification dès qu'un connaissement officiel ou reçu signé est disponible."
                    : "Email alert with one-click download link when official shipping paperwork is uploaded."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleTogglePreference("emailNewDocuments")}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
                  preferences.emailNewDocuments ? "bg-[#d21f27]" : "bg-slate-200"
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    preferences.emailNewDocuments ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
  
            {/* Item 4 */}
            <div className="py-3 flex items-center justify-between gap-4">
              <div>
                <div className="font-bold text-slate-900">
                  {language === "fr" ? "Mises à jour des tarifs et soumissions" : "Tariff & Freight Quote Rate Adjustments"}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {language === "fr"
                    ? "Alertes lorsque de nouveaux tarifs garantis sont disponibles pour vos corridors."
                    : "Notifications regarding approved freight estimates and seasonal corridor adjustments."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleTogglePreference("emailRateAlerts")}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
                  preferences.emailRateAlerts ? "bg-[#d21f27]" : "bg-slate-200"
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    preferences.emailRateAlerts ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
  
        {/* Security & Password Form */}
        <form onSubmit={handleSubmitPassword(handlePasswordSubmit)} className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-100 pb-3">
            <KeyRound className="w-4 h-4 text-[#d21f27]" />
            <span>{language === "fr" ? "Sécurité & Mot de Passe" : "Security & Password Management"}</span>
          </div>
  
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Current Password
              </label>
              <input
                type="password"
                {...registerPassword("currentPassword")}
                placeholder="••••••••"
                className={`w-full px-3.5 py-2.5 bg-slate-50 border ${
                  passwordErrors.currentPassword ? "border-red-500 bg-red-50/30" : "border-slate-200"
                } focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none`}
              />
              {passwordErrors.currentPassword && (
                <p className="text-[11px] text-red-600 mt-1 font-semibold">{passwordErrors.currentPassword.message}</p>
              )}
            </div>
  
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                New Password
              </label>
              <input
                type="password"
                {...registerPassword("newPassword")}
                placeholder="••••••••"
                className={`w-full px-3.5 py-2.5 bg-slate-50 border ${
                  passwordErrors.newPassword ? "border-red-500 bg-red-50/30" : "border-slate-200"
                } focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none`}
              />
              {passwordErrors.newPassword && (
                <p className="text-[11px] text-red-600 mt-1 font-semibold">{passwordErrors.newPassword.message}</p>
              )}
            </div>
  
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                {...registerPassword("confirmPassword")}
                placeholder="••••••••"
                className={`w-full px-3.5 py-2.5 bg-slate-50 border ${
                  passwordErrors.confirmPassword ? "border-red-500 bg-red-50/30" : "border-slate-200"
                } focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none`}
              />
              {passwordErrors.confirmPassword && (
                <p className="text-[11px] text-red-600 mt-1 font-semibold">{passwordErrors.confirmPassword.message}</p>
              )}
            </div>
          </div>
  
          <div className="pt-2 flex items-center justify-end">
            <button
              type="submit"
              disabled={isSubmittingPassword}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              {language === "fr" ? "Mettre à jour le mot de passe" : "Update Password"}
            </button>
          </div>
        </form>

        {/* Active Sessions Manager */}
        <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-xs uppercase tracking-wider">
              <Monitor className="w-4 h-4 text-[#d21f27]" />
              <span>{language === "fr" ? "Sessions Actives" : "Active Sessions"}</span>
            </div>
            {sessions.length > 0 && (
              <button
                type="button"
                onClick={handleLogoutAllDevices}
                disabled={loggingOutAll}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-[11px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>
                  {loggingOutAll
                    ? language === "fr"
                      ? "Déconnexion..."
                      : "Logging Out..."
                    : language === "fr"
                    ? "Déconnecter Tous les Appareils"
                    : "Log Out All Devices"}
                </span>
              </button>
            )}
          </div>

          <div className="space-y-2">
            {sessions.length === 0 ? (
              <p className="text-xs text-slate-400">
                {language === "fr" ? "Chargement des sessions..." : "Loading sessions..."}
              </p>
            ) : (
              sessions.map((session) => {
                const DeviceIcon = getDeviceIcon(session.device);
                return (
                  <div
                    key={session.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-xs ${
                      session.isCurrent
                        ? "bg-emerald-50/60 border-emerald-200"
                        : "bg-slate-50 border-slate-200/80"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 text-[#0B2545]">
                      <DeviceIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900">
                          {session.browser} — {session.os}
                        </span>
                        {session.isCurrent && (
                          <span className="px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider border border-emerald-200">
                            {language === "fr" ? "Cet Appareil" : "This Device"}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5 flex-wrap">
                        <span>
                          {language === "fr" ? "Actif" : "Active"} {session.lastActive}
                        </span>
                        {session.ip && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {session.ip}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleLogoutDevice(session.id)}
                      disabled={revokingId === session.id}
                      className="px-2.5 py-1.5 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-600 hover:text-red-700 text-[11px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 flex-shrink-0"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>
                        {revokingId === session.id
                          ? language === "fr"
                            ? "..."
                            : "..."
                          : language === "fr"
                          ? "Déconnecter"
                          : "Log Out"}
                      </span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
        </div>

        {/* Right Section: Profile Snapshot & Help (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Profile Snapshot Card */}
          <div className="bg-[#0B2545] rounded-2xl p-5 text-white shadow-md space-y-4 relative overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-base font-bold flex-shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-sm truncate">
                  {currentUser.name || (language === "fr" ? "Nom non renseigné" : "Client User")}
                </div>
                <div className="text-[11px] text-slate-300 truncate">
                  {currentUser.jobTitle || (language === "fr" ? "Titre non renseigné" : "Job title not on file")}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-2.5 py-1 w-fit">
              <Shield className="w-3 h-3" />
              <span>{language === "fr" ? "Compte Vérifié" : "Verified Account"}</span>
            </div>

            <div className="pt-3 border-t border-white/10 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-400">{language === "fr" ? "Entreprise" : "Company"}</span>
                <span className="font-semibold text-slate-100 truncate max-w-[140px]">
                  {currentUser.companyName || "—"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-400">{language === "fr" ? "Rôle du Portail" : "Portal Role"}</span>
                <span className="font-semibold text-slate-100 capitalize">{currentUser.role || "—"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-400">{language === "fr" ? "Code Client" : "Client ID"}</span>
                <span className="font-mono font-bold text-[#ff8f94]">{currentUser.clientCode || "—"}</span>
              </div>
            </div>
          </div>

          {/* Need Help Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
            <span className="text-xs font-bold text-[#0B2545] uppercase tracking-wider block border-b border-slate-100 pb-2">
              {language === "fr" ? "Besoin d'Assistance?" : "Need Help?"}
            </span>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {language === "fr"
                ? "Pour corriger le nom de votre entreprise ou d'autres informations légales immuables, contactez le répartiteur Transimex."
                : "To correct your company name or other immutable legal information, contact Transimex dispatch directly."}
            </p>
            <Link
              href="/dashboard/support"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#d21f27] hover:text-[#b51a21] transition"
            >
              <span>{language === "fr" ? "Ouvrir un billet de support" : "Open a Support Ticket"}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { api } from "@/lib/api";
import {
  Settings,
  Building2,
  User,
  Mail,
  Phone,
  Shield,
  Lock,
  CheckCircle2,
} from "lucide-react";

export default function AccountSettingsPage() {
  const { t, language } = useLanguage();
  const [saved, setSaved] = useState(false);
  const [formData, setFormData] = useState({
    name: "Marc Tremblay",
    email: "dispatch@laurentianglobal.ca",
    companyName: "Laurentian Global Logistics Ltd.",
    phone: "+1 (514) 555-0199",
    industry: "Manufacturing",
    city: "Montreal",
    province: "QC",
  });

  useEffect(() => {
    api.auth.me().then((res) => {
      if (res.user) {
        setFormData((prev) => ({
          ...prev,
          name: res.user?.name || prev.name,
          email: res.user?.email || prev.email,
          companyName: res.user?.companyName || prev.companyName,
          phone: res.user?.phone || prev.phone,
          industry: res.user?.industry || prev.industry,
          city: res.user?.city || prev.city,
          province: res.user?.province || prev.province,
        }));
      }
    });
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-200">
      <div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#d21f27]">
          {language === "fr" ? "Profil Corporatif" : "Enterprise Profile"}
        </span>
        <h1
          className="text-2xl sm:text-3xl font-bold text-[#0B2545] tracking-tight leading-tight mt-1"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          {t.nav.account}
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm mt-1">
          {language === "fr"
            ? "Configurez les informations légales de votre entreprise et contacts de facturation."
            : "Update commercial dispatch contacts, business information, and notification preferences."}
        </p>
      </div>

      {saved && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{language === "fr" ? "Paramètres enregistrés avec succès." : "Account settings successfully updated."}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
        {/* Section 1: Administrator Information */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
            1. Primary Account Administrator
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Corporate Email
              </label>
              <input
                type="email"
                disabled
                value={formData.email}
                className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 text-slate-500 rounded-xl text-xs outline-none cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Company Details */}
        <div className="space-y-4 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
            2. Commercial Entity
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Company Name
              </label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                City / Head Office
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="submit"
            className="px-6 py-2.5 bg-[#0B2545] hover:bg-[#123661] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition cursor-pointer"
          >
            {language === "fr" ? "Enregistrer les modifications" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

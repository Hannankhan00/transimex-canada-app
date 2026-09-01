"use client";

import React, { useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  MapPin,
  Building2,
  Plus,
  Edit2,
  Trash2,
  Phone,
  User,
} from "lucide-react";

export default function AddressesPage() {
  const { t, language } = useLanguage();

  const addresses = [
    {
      id: 1,
      label: "Main Distribution Center (Montreal)",
      company: "Laurentian Global Logistics Ltd.",
      contact: "Marc Tremblay",
      phone: "+1 (514) 555-0199",
      address: "4850 Rue Saint-Patrick, Suite 200",
      city: "Montreal",
      province: "QC",
      postal: "H4E 4N4",
      isDefault: true,
    },
    {
      id: 2,
      label: "Toronto Cross-Dock Facility",
      company: "Laurentian Ontario Operations",
      contact: "Sarah Jenkins",
      phone: "+1 (416) 555-0144",
      address: "1200 Britannia Road East",
      city: "Mississauga",
      province: "ON",
      postal: "L4W 4K5",
      isDefault: false,
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#d21f27]">
            {language === "fr" ? "Lieux d'Enlèvement & Livraison" : "Pickup & Delivery Locations"}
          </span>
          <h1
            className="text-2xl sm:text-3xl font-bold text-[#0B2545] tracking-tight leading-tight mt-1"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {t.nav.addresses}
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            {language === "fr"
              ? "Gérez vos entrepôts, quais de chargement et contacts de réception."
              : "Manage frequent shipping facilities, cross-dock warehouses, and receiving docks."}
          </p>
        </div>

        <button
          type="button"
          onClick={() => alert("Add new address dialog")}
          className="px-4 py-2.5 bg-[#d21f27] hover:bg-[#b51a21] text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>{language === "fr" ? "+ Nouvelle Adresse" : "+ Add New Address"}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {addresses.map((addr) => (
          <div
            key={addr.id}
            className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#0B2545]">{addr.label}</span>
                {addr.isDefault && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                    Default
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="p-1.5 text-slate-400 hover:text-[#0B2545] hover:bg-slate-100 rounded-lg transition"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="text-xs text-slate-700 space-y-1">
              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>{addr.company}</span>
              </div>
              <div className="flex items-start gap-1.5 text-slate-600">
                <MapPin className="w-3.5 h-3.5 text-[#d21f27] flex-shrink-0 mt-0.5" />
                <span>
                  {addr.address}, {addr.city}, {addr.province} {addr.postal}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-500 pt-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>{addr.contact} &bull; {addr.phone}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

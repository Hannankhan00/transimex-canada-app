"use client";

import React, { useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  Trash2,
  Check,
} from "lucide-react";

export default function NotificationsPage() {
  const { t, language } = useLanguage();

  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: "Shipment TMX-00847 Departed Montreal Hub",
      desc: "Trailer Unit #402 is en route to Toronto. Expected arrival 04:15 PM.",
      time: "45 mins ago",
      type: "transit",
      unread: true,
    },
    {
      id: 2,
      title: "Quote QT-2026-089 Pending Confirmation",
      desc: "Reefer load to Detroit ($4,850.00 CAD) expires in 4 days.",
      time: "2 hours ago",
      type: "alert",
      unread: true,
    },
    {
      id: 3,
      title: "CBSA Customs Cleared for Entry #8849-01",
      desc: "Customs electronic release granted for Dorval - Calgary container.",
      time: "Yesterday",
      type: "success",
      unread: true,
    },
    {
      id: 4,
      title: "Proof of Delivery Uploaded for TMX-00810",
      desc: "Signed electronic receipt available in your Documents tab.",
      time: "Aug 30, 2026",
      type: "info",
      unread: false,
    },
  ]);

  const markAllRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, unread: false })));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#d21f27]">
            {language === "fr" ? "Alertes Opérationnelles" : "Operational Alerts"}
          </span>
          <h1
            className="text-2xl sm:text-3xl font-bold text-[#0B2545] tracking-tight leading-tight mt-1"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {t.nav.notifications}
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            {language === "fr"
              ? "Toutes les alertes d'expédition, dédouanement et confirmations de soumissions."
              : "Live notifications regarding active freight manifests, customs clearance, and quote confirmations."}
          </p>
        </div>

        <button
          type="button"
          onClick={markAllRead}
          className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-xs transition cursor-pointer flex items-center gap-1.5"
        >
          <Check className="w-3.5 h-3.5 text-emerald-600" />
          <span>{language === "fr" ? "Tout marquer comme lu" : "Mark All as Read"}</span>
        </button>
      </div>

      <div className="space-y-3">
        {notifications.map((notif) => (
          <div
            key={notif.id}
            className={`p-4 sm:p-5 rounded-2xl border transition flex items-start justify-between gap-4 ${
              notif.unread
                ? "bg-white border-slate-300 shadow-xs border-l-4 border-l-[#d21f27]"
                : "bg-slate-50/70 border-slate-200/80"
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  notif.type === "transit"
                    ? "bg-blue-100 text-blue-800"
                    : notif.type === "alert"
                    ? "bg-red-100 text-[#d21f27]"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {notif.type === "alert" ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : notif.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Bell className="w-4 h-4" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">{notif.title}</span>
                  {notif.unread && (
                    <span className="w-2 h-2 rounded-full bg-[#d21f27]" />
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{notif.desc}</p>
                <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{notif.time}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

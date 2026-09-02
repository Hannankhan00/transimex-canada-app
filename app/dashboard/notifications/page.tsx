"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  PortalNotification,
  NotificationCategory,
  getStoredNotifications,
  saveStoredNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/mockData";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  Trash2,
  Check,
  Truck,
  ShieldCheck,
  FileText,
  FileSpreadsheet,
  ArrowRight,
  Filter,
  CheckCheck,
  Inbox,
  ExternalLink,
} from "lucide-react";

export default function NotificationsPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [notifications, setNotifications] = useState<PortalNotification[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    setNotifications(getStoredNotifications());

    const handleUpdate = (e: any) => {
      if (e.detail) {
        setNotifications(e.detail);
      }
    };
    window.addEventListener("transimex_notifications_updated", handleUpdate);
    return () => window.removeEventListener("transimex_notifications_updated", handleUpdate);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleMarkAllRead = () => {
    const updated = markAllNotificationsRead();
    setNotifications(updated);
    showToast(language === "fr" ? "Toutes les alertes sont marquées comme lues" : "All notifications marked as read");
  };

  const handleNotificationClick = (notif: PortalNotification) => {
    if (notif.unread) {
      markNotificationRead(notif.id);
    }
    if (notif.link) {
      router.push(notif.link);
    }
  };

  const handleDeleteNotification = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = notifications.filter((n) => n.id !== id);
    setNotifications(updated);
    saveStoredNotifications(updated);
    showToast(language === "fr" ? "Notification supprimée" : "Notification removed");
  };

  const filteredNotifs = notifications.filter((n) => {
    if (filter === "unread") return n.unread;
    if (filter === "customs") return n.category === "customs";
    if (filter === "transit") return n.category === "transit";
    if (filter === "documents") return n.category === "document";
    return true;
  });

  const unreadCount = notifications.filter((n) => n.unread).length;

  const getCategoryIcon = (category: NotificationCategory) => {
    switch (category) {
      case "customs":
        return <ShieldCheck className="w-4 h-4 text-amber-600" />;
      case "transit":
        return <Truck className="w-4 h-4 text-blue-600" />;
      case "document":
        return <FileText className="w-4 h-4 text-emerald-600" />;
      case "quote":
        return <FileSpreadsheet className="w-4 h-4 text-indigo-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-600" />;
    }
  };

  const getCategoryBadgeClass = (category: NotificationCategory) => {
    switch (category) {
      case "customs":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "transit":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "document":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "quote":
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-4xl">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0B2545] text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold border border-white/10 animate-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#d21f27]">
              {language === "fr" ? "Flux d'Alertes Opérationnelles" : "Operations Feed & Alerts"}
            </span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[#d21f27] text-white text-[10px] font-bold">
                {unreadCount} {language === "fr" ? "non lues" : "unread"}
              </span>
            )}
          </div>
          <h1
            className="text-2xl sm:text-3xl font-bold text-[#0B2545] tracking-tight leading-tight mt-1"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {t.nav.notifications}
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            {language === "fr"
              ? "Historique centralisé des alertes télématiques, mainlevées douanières et documents générés."
              : "Real-time dispatch alerts, customs clearance notices, and verified shipping documentation updates."}
          </p>
        </div>

        {/* Action Button: Mark All as Read */}
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 active:scale-[0.98] border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-xs hover:shadow-md transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap self-start sm:self-auto"
          >
            <CheckCheck className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
            <span>{language === "fr" ? "Tout marquer comme lu" : "Mark All as Read"}</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs flex items-center gap-1.5 overflow-x-auto">
        {[
          { id: "all", label: language === "fr" ? "Toutes les alertes" : "All Alerts", count: notifications.length },
          { id: "unread", label: language === "fr" ? "Non lues" : "Unread", count: unreadCount },
          { id: "customs", label: language === "fr" ? "Douanes ASFC" : "Customs & Holds", count: notifications.filter(n => n.category === "customs").length },
          { id: "transit", label: language === "fr" ? "Télématique & GPS" : "In-Transit & GPS", count: notifications.filter(n => n.category === "transit").length },
          { id: "documents", label: language === "fr" ? "Documents & POD" : "Documents & POD", count: notifications.filter(n => n.category === "document").length },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              filter === tab.id
                ? "bg-[#0B2545] text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                filter === tab.id
                  ? "bg-white/20 text-white"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Alert Feed List */}
      <div className="space-y-3">
        {filteredNotifs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
            <Inbox className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">
              {language === "fr" ? "Aucune alerte dans cette catégorie" : "No Notifications in this View"}
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {language === "fr"
                ? "Toutes vos cargaisons sont à jour et aucun avertissement n'est en attente."
                : "Your shipments are operating normally with no pending exceptions or unread alerts."}
            </p>
          </div>
        ) : (
          filteredNotifs.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`p-4 sm:p-5 rounded-2xl border transition flex items-start justify-between gap-4 cursor-pointer group hover:shadow-md ${
                notif.unread
                  ? "bg-white border-slate-300 shadow-xs border-l-4 border-l-[#d21f27]"
                  : "bg-slate-50/70 border-slate-200/80 hover:bg-white"
              }`}
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 border ${
                    notif.category === "customs"
                      ? "bg-amber-50 border-amber-200"
                      : notif.category === "transit"
                      ? "bg-blue-50 border-blue-200"
                      : notif.category === "document"
                      ? "bg-emerald-50 border-emerald-200"
                      : "bg-indigo-50 border-indigo-200"
                  }`}
                >
                  {getCategoryIcon(notif.category)}
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-[#0B2545] group-hover:text-[#d21f27] transition">
                      {language === "fr" ? notif.titleFr : notif.title}
                    </span>
                    <span
                      className={`px-2 py-0.2 rounded-md text-[9px] font-bold uppercase tracking-wider border ${getCategoryBadgeClass(
                        notif.category
                      )}`}
                    >
                      {notif.category}
                    </span>
                    {notif.unread && (
                      <span className="w-2 h-2 rounded-full bg-[#d21f27] animate-pulse" />
                    )}
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {language === "fr" ? notif.descFr : notif.desc}
                  </p>

                  <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{notif.time}</span>
                    </span>
                    <span className="text-slate-300">&bull;</span>
                    <span className="text-[#0B2545] font-semibold flex items-center gap-1 group-hover:underline">
                      <span>{language === "fr" ? "Voir les détails" : "View Context"}</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>

              {/* Delete / Dismiss Icon */}
              <button
                type="button"
                onClick={(e) => handleDeleteNotification(e, notif.id)}
                className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100 flex-shrink-0"
                title="Dismiss Alert"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

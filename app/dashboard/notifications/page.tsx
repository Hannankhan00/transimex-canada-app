"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { PortalNotification, NotificationCategory } from "@/lib/mockData";
import {
  Bell,
  CheckCircle2,
  Clock,
  Trash2,
  Truck,
  ShieldCheck,
  FileText,
  FileSpreadsheet,
  ArrowRight,
  CheckCheck,
  Inbox,
  Search,
} from "lucide-react";

export default function NotificationsPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [notifications, setNotifications] = useState<PortalNotification[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [shipmentQuery, setShipmentQuery] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadNotifications = () => {
    fetch("/api/notifications")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setNotifications(data.notifications);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    await fetch("/api/notifications", { method: "PATCH" }).catch(() => {});
    showToast(language === "fr" ? "Toutes les alertes sont marquées comme lues" : "All notifications marked as read");
  };

  const handleNotificationClick = (notif: PortalNotification) => {
    if (notif.unread) {
      setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, unread: false } : n)));
      fetch(`/api/notifications/${notif.id}`, { method: "PATCH" }).catch(() => {});
    }
    if (notif.link) {
      router.push(notif.link);
    }
  };

  const handleDeleteNotification = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    fetch(`/api/notifications/${id}`, { method: "DELETE" }).catch(() => {});
    showToast(language === "fr" ? "Notification supprimée" : "Notification removed");
  };

  const filteredNotifs = notifications.filter((n) => {
    if (filter === "unread" && !n.unread) return false;
    if (filter === "customs" && n.category !== "customs") return false;
    if (filter === "transit" && n.category !== "transit") return false;
    if (filter === "documents" && n.category !== "document") return false;

    if (shipmentQuery.trim() && !n.shipmentId.toLowerCase().includes(shipmentQuery.trim().toLowerCase())) {
      return false;
    }

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

  const getCategoryLabel = (category: NotificationCategory) => {
    switch (category) {
      case "customs":
        return language === "fr" ? "Douanes" : "Customs";
      case "transit":
        return language === "fr" ? "Transit" : "Transit";
      case "document":
        return language === "fr" ? "Document" : "Document";
      case "quote":
        return language === "fr" ? "Soumission" : "Quote";
      default:
        return language === "fr" ? "Système" : "System";
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
    <div className="space-y-6 animate-in fade-in duration-200">
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
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B2545] tracking-tight leading-tight">
              {t.nav.notifications}
            </h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[#d21f27] text-white text-[10px] font-bold">
                {unreadCount} {language === "fr" ? "non lues" : "unread"}
              </span>
            )}
          </div>
          <p className="text-slate-500 text-sm mt-1">
            {language === "fr"
              ? "Alertes de répartition, avis de dédouanement et mises à jour de documents."
              : "Dispatch alerts, customs clearance notices, and document updates."}
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

      {/* Filter Tabs & Shipment Search */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center gap-2.5">
        <div className="relative w-full lg:w-64 flex-shrink-0">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={shipmentQuery}
            onChange={(e) => setShipmentQuery(e.target.value)}
            placeholder={
              language === "fr" ? "Filtrer par ID d'expédition..." : "Filter by Shipment ID..."
            }
            className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition font-medium text-slate-900"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto">
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
                      {getCategoryLabel(notif.category)}
                    </span>
                    {notif.unread && (
                      <span className="w-2 h-2 rounded-full bg-[#d21f27] animate-pulse" />
                    )}
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {language === "fr" ? notif.descFr : notif.desc}
                  </p>

                  {notif.shipmentId && (
                    <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-[#0B2545]">
                      <Truck className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      <span>{notif.shipmentId}</span>
                      {notif.route && <span className="text-slate-400 font-sans font-normal">— {notif.route}</span>}
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1" title={notif.dateTime}>
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
                className="p-1.5 text-slate-400 sm:text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition opacity-100 sm:opacity-0 sm:group-hover:opacity-100 flex-shrink-0"
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

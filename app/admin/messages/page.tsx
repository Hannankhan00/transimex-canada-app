"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { ContactInquiry } from "@/lib/inquiryTypes";
import InquiryMasterDetail from "@/components/admin/messages/InquiryMasterDetail";
import PermissionGuard from "@/components/admin/PermissionGuard";
import { RefreshCw } from "lucide-react";

export default function AdminMessagesPage() {
  const { language } = useLanguage();
  const [inquiries, setInquiries] = useState<ContactInquiry[]>([]);
  const [counts, setCounts] = useState({
    all: 0,
    unread: 0,
    read: 0,
    replied: 0,
    avgResponseMinutes: null as number | null,
  });
  const [refreshing, setRefreshing] = useState(false);

  const fetchInquiries = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch("/api/admin/messages");
      const data = await res.json();
      if (res.ok && data.inquiries) {
        setInquiries(data.inquiries);
        if (data.counts) {
          setCounts(data.counts);
        }
      }
    } catch (err) {
      console.error("Error fetching inquiries:", err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  const handleReplySubmitted = (inquiryId: string, replyText: string) => {
    setInquiries((prev) =>
      prev.map((inq) =>
        inq.id === inquiryId
          ? {
              ...inq,
              unread: false,
              replied: true,
              reply: {
                text: replyText,
                repliedAt: new Date().toISOString(),
                repliedBy: "Transimex Operations Dispatch",
              },
            }
          : inq
      )
    );
    setCounts((prev) => ({
      ...prev,
      unread: Math.max(0, prev.unread - 1),
      replied: prev.replied + 1,
    }));
  };

  const formatResponseTime = (minutes: number | null) => {
    if (minutes === null) return "—";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remMinutes = minutes % 60;
    return remMinutes > 0 ? `${hours}h ${remMinutes}m` : `${hours}h`;
  };

  return (
    <PermissionGuard module="messages">
      <div className="space-y-8 animate-in fade-in duration-200">
        {/* 1. HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#d21f27]">
              {language === "fr" ? "Passerelle de Communications Client" : "Customer Communications Gateway"}
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0B2545] tracking-tight leading-tight mt-1">
              {language === "fr" ? "Boîte de Réception des Demandes" : "Contact Inquiry Inbox"}
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl">
              {language === "fr"
                ? "Triez les questions des clients, les pistes de soumission de fret et les demandes de partenariat de transporteurs soumises via le site public."
                : "Triage customer questions, freight quote leads, and carrier partnership inquiries submitted through the public website."}
            </p>
          </div>

          {/* Action Button */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={fetchInquiries}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs transition cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? "animate-spin" : ""}`} />
              <span>{language === "fr" ? "Actualiser la Boîte de Réception" : "Refresh Inbox"}</span>
            </button>
          </div>
        </div>

        {/* 2. SUMMARY METRIC CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              {language === "fr" ? "Total des Demandes Reçues" : "Total Inquiries Received"}
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#0B2545]">{counts.all}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {language === "fr" ? "Demandes de contact du site web" : "Website contact requests"}
            </p>
          </div>

          <div
            className={`bg-white rounded-2xl p-5 shadow-2xs ${
              counts.unread > 0 ? "border-2 border-red-200" : "border border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  counts.unread > 0 ? "text-red-700" : "text-slate-500"
                }`}
              >
                {language === "fr" ? "En Attente de Première Réponse" : "Awaiting First Response"}
              </span>
              {counts.unread > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold">
                  {language === "fr" ? "ACTION REQUISE" : "ACTION NEEDED"}
                </span>
              )}
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className={`text-3xl font-bold ${counts.unread > 0 ? "text-[#d21f27]" : "text-[#0B2545]"}`}>
                {counts.unread}
              </span>
              <span className={`text-xs font-semibold ${counts.unread > 0 ? "text-red-700" : "text-slate-500"}`}>
                {language === "fr" ? "Pistes Non Lues" : "Unread Leads"}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {language === "fr" ? "Nécessite une révision et une réponse du répartiteur" : "Requires dispatcher review & reply"}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              {language === "fr" ? "Réponses du Personnel Livrées" : "Staff Responses Delivered"}
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-emerald-700">{counts.replied}</span>
              <span className="text-xs font-semibold text-emerald-700">{language === "fr" ? "Résolues" : "Resolved"}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {language === "fr" ? "Répondu par courriel" : "Replied via email"}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              {language === "fr" ? "Temps de Réponse Moyen" : "Average Response Time"}
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#0B2545]">{formatResponseTime(counts.avgResponseMinutes)}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {counts.avgResponseMinutes === null
                ? language === "fr"
                  ? "Aucune réponse consignée pour le moment"
                  : "No replies logged yet"
                : language === "fr"
                ? "Calculé à partir des réponses réelles du personnel"
                : "Calculated from actual staff reply timestamps"}
            </p>
          </div>
        </div>

        {/* 3. TWO-PANE INBOX */}
        <InquiryMasterDetail
          inquiries={inquiries}
          onReplySubmitted={handleReplySubmitted}
        />
      </div>
    </PermissionGuard>
  );
}

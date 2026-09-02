"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ContactInquiry } from "@/lib/mockData";
import InquiryMasterDetail from "@/components/admin/messages/InquiryMasterDetail";
import {
  Inbox,
  Mail,
  CheckCircle2,
  Clock,
  RefreshCw,
  Send,
  MessageSquare,
} from "lucide-react";

export default function AdminMessagesPage() {
  const [inquiries, setInquiries] = useState<ContactInquiry[]>([]);
  const [counts, setCounts] = useState({ all: 0, unread: 0, read: 0, replied: 0 });
  const [loading, setLoading] = useState(true);
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
      setLoading(false);
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
                repliedAt: "Just now",
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

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#d21f27]">
              Customer Communications Gateway
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-mono font-bold">
              PUBLIC LEADS
            </span>
          </div>
          <h1
            className="text-3xl sm:text-4xl font-bold text-[#0B2545] tracking-tight leading-tight mt-1"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Contact Inquiry Inbox
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl">
            Triage customer questions, freight quote leads, and carrier partnership inquiries submitted through the public website.
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
            <span>Refresh Inbox</span>
          </button>
        </div>
      </div>

      {/* 2. SUMMARY METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Inquiries Received
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#0B2545]">{counts.all}</span>
            <span className="text-xs font-semibold text-slate-500">Public Forms</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Website contact requests</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border-2 border-red-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider">
              Awaiting First Response
            </span>
            <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold">
              ACTION NEEDED
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#d21f27]">{counts.unread}</span>
            <span className="text-xs font-semibold text-red-700">Unread Leads</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Requires dispatcher review &amp; reply</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Staff Responses Delivered
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-700">{counts.replied}</span>
            <span className="text-xs font-semibold text-emerald-700">Resolved</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Replied via Resend email gateway</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Average Response Time
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#0B2545]">24m</span>
            <span className="text-xs font-semibold text-emerald-600">SLA Met</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Standard business dispatch response</p>
        </div>
      </div>

      {/* 3. TWO-PANE INBOX */}
      <InquiryMasterDetail
        inquiries={inquiries}
        onReplySubmitted={handleReplySubmitted}
      />
    </div>
  );
}

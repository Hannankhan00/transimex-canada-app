"use client";

import React, { useState } from "react";
import { ContactInquiry, InquiryCategory } from "@/lib/mockData";
import {
  Mail,
  Search,
  CheckCircle2,
  Send,
  Phone,
  Building2,
  Clock,
  Reply,
  AlertCircle,
  Filter,
  UserCheck,
} from "lucide-react";

interface InquiryMasterDetailProps {
  inquiries: ContactInquiry[];
  onReplySubmitted: (inquiryId: string, replyText: string) => void;
}

export default function InquiryMasterDetail({
  inquiries,
  onReplySubmitted,
}: InquiryMasterDetailProps) {
  const [selectedId, setSelectedId] = useState<string>(
    inquiries.length > 0 ? inquiries[0].id : ""
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "unread" | "replied">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replySuccess, setReplySuccess] = useState(false);

  const selectedInquiry =
    inquiries.find((inq) => inq.id === selectedId) || inquiries[0];

  const filteredInquiries = inquiries.filter((inq) => {
    if (statusFilter === "unread" && !inq.unread) return false;
    if (statusFilter === "replied" && !inq.replied) return false;
    if (categoryFilter !== "all" && inq.category !== categoryFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      return (
        inq.name.toLowerCase().includes(q) ||
        inq.email.toLowerCase().includes(q) ||
        inq.company.toLowerCase().includes(q) ||
        inq.subject.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedInquiry) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/admin/messages/${encodeURIComponent(selectedInquiry.id)}/reply`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          replyText,
          responderName: "Transimex Operations Dispatch",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to dispatch reply");

      onReplySubmitted(selectedInquiry.id, replyText);
      setReplySuccess(true);
      setReplyText("");
      setTimeout(() => setReplySuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || "Error submitting reply");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col lg:flex-row min-h-[620px]">
      {/* ==================================================================== */}
      {/* LEFT PANE: INBOX MASTER LIST */}
      {/* ==================================================================== */}
      <div className="w-full lg:w-96 border-r border-slate-200 flex flex-col bg-slate-50/50">
        {/* Search & Filter bar */}
        <div className="p-3.5 border-b border-slate-200 bg-white space-y-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search leads, sender, topic..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 outline-none focus:border-[#0B2545]"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                statusFilter === "all"
                  ? "bg-[#0B2545] text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              All ({inquiries.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("unread")}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                statusFilter === "unread"
                  ? "bg-[#d21f27] text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Unread ({inquiries.filter((i) => i.unread).length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("replied")}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                statusFilter === "replied"
                  ? "bg-emerald-700 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Replied
            </button>
          </div>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredInquiries.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No inquiries found matching criteria.
            </div>
          ) : (
            filteredInquiries.map((inq) => {
              const isSelected = selectedInquiry?.id === inq.id;

              return (
                <div
                  key={inq.id}
                  onClick={() => setSelectedId(inq.id)}
                  className={`p-3.5 cursor-pointer transition text-xs relative ${
                    isSelected
                      ? "bg-white border-l-4 border-[#d21f27] shadow-xs"
                      : "hover:bg-white/80"
                  } ${inq.unread ? "bg-red-50/30 font-semibold" : ""}`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-bold text-slate-900 truncate max-w-[170px]">
                      {inq.name}
                    </span>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap font-mono">
                      {inq.date}
                    </span>
                  </div>

                  <p className="font-bold text-[#0B2545] text-xs truncate mb-1" title={inq.subject}>
                    {inq.subject}
                  </p>

                  <p className="text-slate-500 text-[11px] line-clamp-2 leading-relaxed">
                    {inq.message}
                  </p>

                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-700 text-[10px] font-medium">
                      {inq.category}
                    </span>
                    {inq.replied && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-bold flex items-center gap-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>Replied</span>
                      </span>
                    )}
                    {inq.unread && (
                      <span className="w-2 h-2 rounded-full bg-[#d21f27] ml-auto animate-pulse" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* RIGHT PANE: FULL MESSAGE DETAILS & REPLY COMPOSER */}
      {/* ==================================================================== */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedInquiry ? (
          <div className="flex-1 flex flex-col">
            {/* Message Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50/40 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h2 className="font-bold text-lg text-[#0B2545] leading-snug">
                  {selectedInquiry.subject}
                </h2>
                <div className="flex items-center gap-1.5">
                  <span className="px-2.5 py-1 rounded-full bg-slate-100 font-bold text-slate-700 text-xs border border-slate-200">
                    {selectedInquiry.category}
                  </span>
                  {selectedInquiry.replied ? (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 font-bold text-xs border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Response Logged</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 font-bold text-xs border border-amber-200">
                      Awaiting Response
                    </span>
                  )}
                </div>
              </div>

              {/* Sender Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600 pt-1">
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span className="font-bold text-slate-900">{selectedInquiry.company || "Independent Shipper"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <a href={`mailto:${selectedInquiry.email}`} className="text-[#0B2545] hover:underline font-mono">
                    {selectedInquiry.email}
                  </a>
                </div>
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span className="font-mono">{selectedInquiry.phone || "No phone provided"}</span>
                </div>
              </div>
            </div>

            {/* Message Body */}
            <div className="p-6 flex-1 space-y-4 overflow-y-auto text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 leading-relaxed text-slate-800 whitespace-pre-wrap text-[13px]">
                {selectedInquiry.message}
              </div>

              {/* Previous Staff Reply (if already replied) */}
              {selectedInquiry.reply && (
                <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800 border-b border-emerald-200/80 pb-1.5">
                    <span className="flex items-center gap-1">
                      <Reply className="w-3.5 h-3.5" />
                      <span>Transimex Response by {selectedInquiry.reply.repliedBy}</span>
                    </span>
                    <span className="text-emerald-700 font-mono">{selectedInquiry.reply.repliedAt}</span>
                  </div>
                  <p className="text-slate-800 leading-relaxed whitespace-pre-wrap text-[12px]">
                    {selectedInquiry.reply.text}
                  </p>
                </div>
              )}
            </div>

            {/* Reply Composer at bottom */}
            <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50/50">
              {replySuccess && (
                <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Email reply successfully dispatched to {selectedInquiry.email}.</span>
                </div>
              )}

              <form onSubmit={handleSendReply} className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Reply className="w-3.5 h-3.5 text-[#d21f27]" />
                    <span>Direct Email Reply to {selectedInquiry.name}</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Delivered via Resend / SMTP Gateway
                  </span>
                </div>

                <textarea
                  rows={4}
                  placeholder={`Write official reply to ${selectedInquiry.email}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-[#0B2545] rounded-xl p-3 text-xs text-slate-800 outline-none leading-relaxed transition"
                />

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="submit"
                    disabled={submitting || !replyText.trim()}
                    className="px-4 py-2 bg-[#0B2545] hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5 text-[#d21f27]" />
                    <span>{submitting ? "Dispatching..." : "Send Institutional Reply"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400 text-xs m-auto">
            Select a message from the left inbox pane to review.
          </div>
        )}
      </div>
    </div>
  );
}

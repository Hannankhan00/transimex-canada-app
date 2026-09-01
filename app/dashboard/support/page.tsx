"use client";

import React, { useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  HelpCircle,
  MessageSquare,
  Plus,
  Phone,
  Mail,
  Clock,
  CheckCircle2,
  X,
} from "lucide-react";

export default function SupportPage() {
  const { t, language } = useLanguage();
  const [showModal, setShowModal] = useState(false);

  const tickets = [
    {
      id: "TKT-1049",
      subject: "Temperature logging request for Reefer shipment TMX-00842",
      status: "In Progress",
      priority: "High",
      updated: "2 hours ago",
      agent: "David Tremblay (Transimex Dispatch)",
    },
    {
      id: "TKT-1033",
      subject: "Customs declaration copy for Entry #8849-01",
      status: "Resolved",
      priority: "Medium",
      updated: "Yesterday",
      agent: "Elena Roy (Customs Brokerage)",
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#d21f27]">
            {language === "fr" ? "Assistance Logistique" : "24/7 Operations Support"}
          </span>
          <h1
            className="text-2xl sm:text-3xl font-bold text-[#0B2545] tracking-tight leading-tight mt-1"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {t.nav.support}
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            {language === "fr"
              ? "Communiquez directement avec nos répartiteurs et spécialistes en douane."
              : "Direct emergency dispatch hotline, customs brokerage help desk, and ticket tracking."}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-[#d21f27] hover:bg-[#b51a21] text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>{language === "fr" ? "+ Nouveau Billet" : "+ Open New Ticket"}</span>
        </button>
      </div>

      {/* Emergency Hotline Banner */}
      <div className="bg-[#0B2545] rounded-2xl p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
        <div className="space-y-1 relative z-10">
          <div className="text-xs font-bold uppercase tracking-wider text-[#d21f27]">
            Priority Dispatch Hotline
          </div>
          <div className="text-xl font-bold font-mono">+1 (800) 555-TXMX &bull; ext. 1</div>
          <p className="text-xs text-slate-300">
            24/7 live Canadian &amp; Cross-Border dispatch center in Montreal.
          </p>
        </div>
        <div className="flex items-center gap-3 relative z-10">
          <a
            href="tel:18005558969"
            className="px-4 py-2 bg-white hover:bg-slate-100 text-[#0B2545] text-xs font-bold rounded-xl transition shadow-xs text-center"
          >
            Call Dispatch Now
          </a>
        </div>
      </div>

      {/* Ticket List */}
      <div className="space-y-3">
        {tickets.map((ticket) => (
          <div
            key={ticket.id}
            className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold font-mono text-[#0B2545]">{ticket.id}</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    ticket.status === "In Progress"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {ticket.status}
                </span>
                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                  {ticket.priority} Priority
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-900">{ticket.subject}</p>
              <p className="text-[11px] text-slate-400">
                Assigned: {ticket.agent} &bull; Updated: {ticket.updated}
              </p>
            </div>

            <button
              type="button"
              onClick={() => alert(`Opening conversation for ${ticket.id}`)}
              className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition cursor-pointer"
            >
              View Thread
            </button>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-xl font-bold text-[#0B2545]">Open Support Ticket</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                alert("Ticket submitted! A Transimex representative will reply shortly.");
                setShowModal(false);
              }}
              className="space-y-4 mt-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Subject / Shipment ID
                </label>
                <input required placeholder="e.g. ETA inquiry for TMX-00847" className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-[#0B2545]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Message Details
                </label>
                <textarea required rows={4} placeholder="Describe the issue or assistance required..." className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-[#0B2545]" />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-[#d21f27] hover:bg-[#b51a21] text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-md transition cursor-pointer mt-2"
              >
                Submit Ticket
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  supportTicketSchema,
  SupportTicketFormData,
  ticketCategoriesEnum,
  ticketPrioritiesEnum,
} from "@/lib/validations/support";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { SupportTicket } from "@/lib/mockData";
import { api } from "@/lib/api";
import {
  HelpCircle,
  MessageSquare,
  Plus,
  Phone,
  Mail,
  Clock,
  CheckCircle2,
  X,
  AlertCircle,
  Truck,
  ShieldCheck,
  Send,
  User,
  ArrowUpRight,
  Filter,
  Check,
  LifeBuoy,
  FileText,
} from "lucide-react";

interface ActiveShipmentOption {
  id: string;
  label: string;
}

export default function SupportPage() {
  const { t, language } = useLanguage();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [activeShipments, setActiveShipments] = useState<ActiveShipmentOption[]>([]);
  const [activeTab, setActiveTab] = useState<"form" | "history">("form");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [submittingReply, setSubmittingReply] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SupportTicketFormData>({
    resolver: zodResolver(supportTicketSchema) as any,
    defaultValues: {
      subject: "",
      category: "Shipment Telematics & Tracking",
      linkedShipmentId: "",
      priority: "Medium",
      message: "",
    },
  });

  useEffect(() => {
    fetch("/api/support")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setTickets(data.tickets);
      })
      .catch(() => {});

    fetch("/api/shipments")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setActiveShipments(
            data.shipments.map((s: any) => ({
              id: s.id,
              label: `${s.id} - ${s.origin} → ${s.destination} [${s.statusLabel}]`,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const onSubmit = async (data: SupportTicketFormData) => {
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to submit ticket");

      setTickets((prev) => [result.ticket, ...prev]);
      reset();
      showToast(
        language === "fr"
          ? `Billet ${result.ticket.id} ouvert. Un répartiteur a été notifié.`
          : `Support ticket ${result.ticket.id} opened. Dedicated dispatch agent assigned.`
      );
      setActiveTab("history");
    } catch (err: any) {
      showToast(err.message || "Failed to submit support ticket");
    }
  };

  const handleSendReply = async () => {
    if (!selectedTicket || !replyMessage.trim()) return;
    setSubmittingReply(true);
    try {
      const res = await fetch(`/api/support/${selectedTicket.id}/reply`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyMessage.trim() }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to send reply");

      const refreshed = await fetch("/api/support").then((r) => r.json());
      if (refreshed.success) {
        setTickets(refreshed.tickets);
        const updatedTicket = refreshed.tickets.find((t: SupportTicket) => t.id === selectedTicket.id);
        if (updatedTicket) setSelectedTicket(updatedTicket);
      }
      setReplyMessage("");
      showToast(language === "fr" ? "Message envoyé au répartiteur" : "Response sent to Transimex dispatch");
    } catch (err: any) {
      showToast(err.message || "Failed to send reply");
    } finally {
      setSubmittingReply(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-5xl">
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
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#d21f27]">
            {language === "fr" ? "Centre d'Assistance & Billetterie" : "24/7 Operations Help Desk"}
          </span>
          <h1
            className="text-2xl sm:text-3xl font-bold text-[#0B2545] tracking-tight leading-tight mt-1"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {t.nav.support}
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            {language === "fr"
              ? "Ouvrez des billets d'assistance opérationnelle liés à vos expéditions ou contactez la ligne d'urgence 24/7."
              : "Open prioritized support tickets directly linked to active manifests or reach emergency dispatch."}
          </p>
        </div>

        {/* 24/7 Hotline Badge */}
        <div className="flex items-center gap-2.5 px-4 py-2 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Priority Hotline</div>
            <div className="text-xs font-mono font-bold text-[#0B2545]">+1 (800) 555-TXMX &bull; ext. 1</div>
          </div>
        </div>
      </div>

      {/* Main Container Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Main Section: Form & Tickets (8 cols on desktop) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Sub Navigation Bar */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab("form")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                activeTab === "form"
                  ? "bg-[#0B2545] text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>{language === "fr" ? "Ouvrir un Nouveau Billet" : "Open New Ticket"}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                activeTab === "history"
                  ? "bg-[#0B2545] text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>
                {language === "fr" ? "Historique des Billets" : "Ticket History"} ({tickets.length})
              </span>
            </button>
          </div>

          {activeTab === "form" ? (
            /* Support Form Card */
            <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#d21f27]">
                  {language === "fr" ? "Nouvelle Requête" : "Direct Client Dispatch Ticket"}
                </span>
                <h3
                  className="text-lg font-bold text-[#0B2545]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {language === "fr" ? "Soumettre un Billet de Support" : "Submit Support Request"}
                </h3>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs">
                {/* Subject */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {language === "fr" ? "Objet de la Demande" : "Ticket Subject / Summary"} *
                  </label>
                  <input
                    {...register("subject")}
                    placeholder="e.g. Need urgent temperature telematics log for Reefer load TMX-00842"
                    className={`w-full px-3.5 py-2.5 bg-slate-50 border ${
                      errors.subject ? "border-red-500 bg-red-50/30" : "border-slate-200"
                    } focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition font-medium text-slate-900`}
                  />
                  {errors.subject && (
                    <p className="text-[11px] text-red-600 mt-1 font-semibold">{errors.subject.message}</p>
                  )}
                </div>

                {/* Category & Priority */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      {language === "fr" ? "Catégorie d'Assistance" : "Inquiry Category"} *
                    </label>
                    <select
                      {...register("category")}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0B2545] rounded-xl text-xs font-semibold text-slate-800 outline-none transition cursor-pointer"
                    >
                      {ticketCategoriesEnum.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      {language === "fr" ? "Niveau de Priorité" : "Priority Urgency"} *
                    </label>
                    <select
                      {...register("priority")}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0B2545] rounded-xl text-xs font-semibold text-slate-800 outline-none transition cursor-pointer"
                    >
                      {ticketPrioritiesEnum.map((pri) => (
                        <option key={pri} value={pri}>
                          {pri}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Contextual Linking Dropdown */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      {language === "fr" ? "Lier à une Expédition Active (Optionnel)" : "Link to Active Shipment (Contextual)"}
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">Auto-attaches telematics manifest</span>
                  </div>
                  <select
                    {...register("linkedShipmentId")}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0B2545] rounded-xl text-xs font-medium text-slate-800 outline-none transition cursor-pointer font-mono"
                  >
                    <option value="">-- No specific shipment (General Account Inquiry) --</option>
                    {activeShipments.map((ship) => (
                      <option key={ship.id} value={ship.id}>
                        {ship.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Message Body */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {language === "fr" ? "Détails du Message" : "Message Description & Context"} *
                  </label>
                  <textarea
                    {...register("message")}
                    rows={4}
                    placeholder="Provide specific details regarding your inquiry, required documentation, or operational question..."
                    className={`w-full px-3.5 py-2.5 bg-slate-50 border ${
                      errors.message ? "border-red-500 bg-red-50/30" : "border-slate-200"
                    } focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition font-medium text-slate-900 resize-none`}
                  />
                  {errors.message && (
                    <p className="text-[11px] text-red-600 mt-1 font-semibold">{errors.message.message}</p>
                  )}
                </div>

                {/* Submit Action */}
                <div className="flex items-center justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-3 bg-[#d21f27] hover:bg-[#b51a21] active:scale-[0.98] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {isSubmitting
                        ? language === "fr"
                          ? "Transmission en cours..."
                          : "Transmitting Ticket..."
                        : language === "fr"
                        ? "Envoyer le Billet au Répartiteur"
                        : "Submit Support Ticket"}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Ticket History Table */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-[#0B2545] uppercase tracking-wider">
                  {language === "fr" ? "Historique des Billets" : "Submitted Support Tickets"}
                </span>
                <span className="text-xs text-slate-500 font-semibold">{tickets.length} total</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">Ticket ID</th>
                      <th className="py-3 px-4">Subject & Category</th>
                      <th className="py-3 px-4">Linked Load</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {tickets.map((tkt) => (
                      <tr key={tkt.id} className="hover:bg-slate-50/80 transition">
                        {/* ID */}
                        <td className="py-3.5 px-4 font-mono font-bold text-[#0B2545] whitespace-nowrap">
                          {tkt.id}
                        </td>

                        {/* Subject */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 line-clamp-1">{tkt.subject}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{tkt.category} &bull; {tkt.createdAt}</div>
                        </td>

                        {/* Linked Shipment */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {tkt.linkedShipmentId ? (
                            <Link
                              href={`/dashboard/shipments?id=${tkt.linkedShipmentId}`}
                              className="inline-flex items-center gap-1 font-mono font-bold text-[#0B2545] hover:text-[#d21f27] transition"
                            >
                              <span>{tkt.linkedShipmentId}</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </Link>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">General</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              tkt.status === "Open"
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : tkt.status === "In Progress"
                                ? "bg-blue-100 text-blue-800 border border-blue-200"
                                : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            }`}
                          >
                            {language === "fr" ? tkt.statusFr : tkt.status}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setSelectedTicket(tkt)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-[#0B2545] hover:text-white text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
                          >
                            {language === "fr" ? "Voir le fil" : "View Thread"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Section: Contact Channels & FAQs (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Dispatch Hotline Card */}
          <div className="bg-[#0B2545] rounded-2xl p-5 text-white shadow-md space-y-3 relative overflow-hidden">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#ff8f94]">
                Emergency Logistics Line
              </span>
              <h4
                className="text-lg font-bold"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                24/7 Dispatch Control
              </h4>
              <p className="text-[11px] text-slate-300 leading-snug">
                For time-critical border delays, temperature alerts, or urgent diversion requests.
              </p>
            </div>

            <div className="p-3 bg-white/10 rounded-xl border border-white/15 space-y-1 text-xs">
              <div className="flex items-center gap-2 text-slate-200">
                <Phone className="w-3.5 h-3.5 text-[#ff8f94]" />
                <span className="font-mono font-bold">+1 (800) 555-TXMX</span>
              </div>
              <div className="flex items-center gap-2 text-slate-200">
                <Mail className="w-3.5 h-3.5 text-[#ff8f94]" />
                <span className="font-mono text-[11px]">dispatch@transimex.ca</span>
              </div>
            </div>
          </div>

          {/* Quick Help Topics */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
            <span className="text-xs font-bold text-[#0B2545] uppercase tracking-wider block border-b border-slate-100 pb-2">
              Common Support Topics
            </span>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-xl hover:bg-slate-100 transition cursor-pointer">
                <div className="font-bold text-slate-900">Customs Clearance PARS Delays</div>
                <p className="text-[11px] text-slate-500 mt-0.5">How CBSA electronic release works for bonded cargo.</p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl hover:bg-slate-100 transition cursor-pointer">
                <div className="font-bold text-slate-900">Container Demurrage Inquiries</div>
                <p className="text-[11px] text-slate-500 mt-0.5">Free time rules at Canadian and African seaports.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ticket Conversation Thread Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-[#0B2545]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 my-8 flex flex-col max-h-[85vh]">
            {/* Thread Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 flex-shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-[#0B2545] bg-slate-100 px-2 py-0.5 rounded">
                    {selectedTicket.id}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      selectedTicket.status === "Open"
                        ? "bg-amber-100 text-amber-800"
                        : selectedTicket.status === "In Progress"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {selectedTicket.status}
                  </span>
                  <span className="text-[10px] text-red-700 font-bold bg-red-50 px-2 py-0.5 rounded-full">
                    {selectedTicket.priority} Priority
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#0B2545] mt-1.5">{selectedTicket.subject}</h3>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Assigned Agent: <span className="font-semibold text-slate-700">{selectedTicket.assignedAgent}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conversation Messages */}
            <div className="py-4 space-y-3 overflow-y-auto flex-1 text-xs">
              {(selectedTicket.responses || []).map((resp) => (
                <div
                  key={resp.id}
                  className={`p-3.5 rounded-2xl ${
                    resp.role === "agent"
                      ? "bg-blue-50/80 border border-blue-100 mr-8"
                      : "bg-slate-100/90 border border-slate-200 ml-8"
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-[11px] mb-1">
                    <span className={resp.role === "agent" ? "text-blue-900" : "text-[#0B2545]"}>
                      {resp.sender}
                    </span>
                    <span className="text-slate-400 font-normal">{resp.time}</span>
                  </div>
                  <p className="text-slate-700 leading-relaxed">{resp.message}</p>
                </div>
              ))}
            </div>

            {/* Reply Input Box */}
            <div className="pt-3 border-t border-slate-100 flex-shrink-0 space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type follow-up response to dispatch..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendReply();
                    }
                  }}
                  className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none"
                />
                <button
                  type="button"
                  onClick={handleSendReply}
                  disabled={submittingReply || !replyMessage.trim()}
                  className="px-4 py-2.5 bg-[#0B2545] hover:bg-[#123661] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

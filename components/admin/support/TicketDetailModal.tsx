"use client";

import React, { useState } from "react";
import Link from "next/link";
import { SupportTicketItem } from "@/lib/mockData";
import {
  X,
  Send,
  MessageSquare,
  Lock,
  Building2,
  Mail,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  User,
} from "lucide-react";

interface TicketDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: SupportTicketItem | null;
  onTicketUpdated: (updatedTicket: SupportTicketItem) => void;
}

export default function TicketDetailModal({
  isOpen,
  onClose,
  ticket,
  onTicketUpdated,
}: TicketDetailModalProps) {
  if (!isOpen || !ticket) return null;

  const [replyMessage, setReplyMessage] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [status, setStatus] = useState(ticket.status);
  const [priority, setPriority] = useState(ticket.priority);
  const [internalNotes, setInternalNotes] = useState(ticket.internalNotes || "");
  const [submitting, setSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() && status === ticket.status && priority === ticket.priority) {
      return;
    }

    try {
      setSubmitting(true);
      const ticketRef = ticket.ticketId || ticket.id;
      const res = await fetch(`/api/admin/support/${encodeURIComponent(ticketRef)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          priority,
          message: replyMessage.trim() || undefined,
          isInternal,
          internalNotes,
          responderName: "Jean-Philippe Tremblay (Operations Lead)",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update ticket");

      onTicketUpdated(data.ticket);
      setReplyMessage("");
      setSuccessToast(
        isInternal
          ? "Private staff note saved."
          : "Client response delivered and email dispatched."
      );
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err: any) {
      alert(err.message || "Failed to update ticket");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0B2545] text-white flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-4 h-4 text-[#d21f27]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#0B2545]">{ticket.ticketId}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    ticket.priority === "Urgent"
                      ? "bg-red-50 text-red-700 border border-red-200"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {ticket.priority} Priority
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-sm mt-0.5">{ticket.subject}</h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {successToast && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Client Context Panel */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Shipper Entity</span>
              <p className="font-bold text-slate-900">
                {ticket.client?.name || "Client Lead"} &bull; {ticket.client?.companyName || "Enterprise Shipper"}
              </p>
              <p className="text-[11px] text-slate-500">{ticket.client?.email || "No email on record"}</p>
            </div>

            {(ticket.shipmentId || ticket.linkedShipmentId) && (
              <div className="border-l border-slate-200 pl-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Linked Manifest</span>
                <p className="font-mono font-bold text-[#0B2545]">{ticket.shipmentId || ticket.linkedShipmentId}</p>
                <Link
                  href={`/admin/shipments/${encodeURIComponent((ticket.shipmentId || ticket.linkedShipmentId) as string)}/customs`}
                  target="_blank"
                  className="text-[11px] text-[#d21f27] hover:underline flex items-center gap-1 font-bold"
                >
                  <span>Open Customs Center</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>

          {/* Quick status & priority switchers */}
          <div className="flex items-center gap-2">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Status</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 outline-none"
              >
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Priority</span>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 outline-none"
              >
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>
        </div>

        {/* Threaded Conversation */}
        <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-slate-50/50 rounded-xl border border-slate-200 text-xs min-h-[220px]">
          {(ticket.messages || []).map((msg) => {
            const isAdmin = msg.sender === "admin";
            const isNote = msg.isInternal;

            return (
              <div
                key={msg.id}
                className={`p-3.5 rounded-xl text-xs space-y-1 ${
                  isNote
                    ? "bg-amber-50 border border-amber-200 text-amber-900"
                    : isAdmin
                    ? "bg-white border border-slate-200 ml-6 text-slate-800 shadow-2xs"
                    : "bg-blue-50/70 border border-blue-200 mr-6 text-slate-800"
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className={isNote ? "text-amber-800 flex items-center gap-1" : isAdmin ? "text-[#0B2545]" : "text-blue-800"}>
                    {isNote && <Lock className="w-3 h-3" />}
                    {msg.senderName} {isNote ? "(Internal Staff Audit Note)" : ""}
                  </span>
                  <span className="text-slate-400 font-mono">{msg.timestamp}</span>
                </div>
                <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>
              </div>
            );
          })}
        </div>

        {/* Response Form */}
        <form onSubmit={handleSubmitResponse} className="space-y-3 pt-2 text-xs">
          <div className="flex items-center justify-between">
            {/* Toggle internal note vs public client response */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsInternal(false)}
                className={`px-3 py-1 rounded-lg font-bold text-xs cursor-pointer ${
                  !isInternal ? "bg-[#0B2545] text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                Public Client Response
              </button>
              <button
                type="button"
                onClick={() => setIsInternal(true)}
                className={`px-3 py-1 rounded-lg font-bold text-xs cursor-pointer flex items-center gap-1 ${
                  isInternal ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                <Lock className="w-3 h-3" />
                <span>Internal Staff Note</span>
              </button>
            </div>

            <span className="text-[10px] text-slate-400">
              {isInternal ? "Hidden from shipper" : "Dispatches transactional email to client"}
            </span>
          </div>

          <textarea
            rows={3}
            placeholder={
              isInternal
                ? "Record internal dispatch scratchpad note (not visible to client)..."
                : `Compose response to ${ticket.client?.name || "Client"}...`
            }
            value={replyMessage}
            onChange={(e) => setReplyMessage(e.target.value)}
            className={`w-full border rounded-xl p-3 text-xs outline-none leading-relaxed transition ${
              isInternal
                ? "bg-amber-50/50 border-amber-200 focus:border-amber-500"
                : "bg-slate-50 border-slate-200 focus:border-[#0B2545] focus:bg-white"
            }`}
          />

          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
            <div className="text-[11px] text-slate-500">
              Assigned Lead: <strong>Jean-Philippe Tremblay</strong>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition cursor-pointer"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`px-4 py-1.5 rounded-xl font-bold text-white transition cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50 ${
                  isInternal ? "bg-amber-700 hover:bg-amber-800" : "bg-[#d21f27] hover:bg-[#b51a21]"
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? "Saving..." : isInternal ? "Save Internal Note" : "Send Client Reply"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

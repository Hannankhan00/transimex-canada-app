"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { SupportTicketItem } from "@/lib/supportTypes";
import TicketDetailModal from "@/components/admin/support/TicketDetailModal";
import PermissionGuard from "@/components/admin/PermissionGuard";
import { Search, RefreshCw, AlertTriangle } from "lucide-react";

export default function AdminSupportPage() {
  const { language } = useLanguage();
  const [tickets, setTickets] = useState<SupportTicketItem[]>([]);
  const [counts, setCounts] = useState({
    all: 0,
    open: 0,
    in_progress: 0,
    resolved: 0,
    urgent: 0,
  });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTickets = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch("/api/admin/support");
      const data = await res.json();
      if (res.ok && data.tickets) {
        setTickets(data.tickets);
        if (data.counts) {
          setCounts(data.counts);
        }
      }
    } catch (err) {
      console.error("Error loading tickets:", err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleTicketClick = (ticket: SupportTicketItem) => {
    setSelectedTicket(ticket);
    setIsModalOpen(true);
  };

  const handleTicketUpdated = (updated: SupportTicketItem) => {
    setTickets((prev) =>
      prev.map((t) => (t.ticketId === updated.ticketId ? updated : t))
    );
    setSelectedTicket(updated);
    fetchTickets();
  };

  const filteredTickets = tickets.filter((t) => {
    if (statusFilter !== "all" && t.status.toLowerCase() !== statusFilter.toLowerCase()) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const ticketRef = (t.ticketId || t.id).toLowerCase();
      const company = (t.client?.companyName || "").toLowerCase();
      const clientName = (t.client?.name || "").toLowerCase();
      const shipment = (t.shipmentId || t.linkedShipmentId || "").toLowerCase();

      return (
        ticketRef.includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        clientName.includes(q) ||
        company.includes(q) ||
        shipment.includes(q)
      );
    }
    return true;
  });

  return (
    <PermissionGuard module="support">
      <div className="space-y-8 animate-in fade-in duration-200">
        {/* 1. HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#d21f27]">
              {language === "fr" ? "Service Client et Résolution des Problèmes" : "Client Services & Issue Resolution"}
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0B2545] tracking-tight leading-tight mt-1">
              {language === "fr" ? "Bureau des Billets de Support" : "Support Ticket Desk"}
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl">
              {language === "fr"
                ? "Résolvez les demandes, les requêtes de documentation douanière et les questions de suivi d'expédition soumises par les clients corporatifs authentifiés."
                : "Resolve inquiries, customs documentation requests, and shipment tracking questions submitted by authenticated corporate clients."}
            </p>
          </div>

          {/* Action Button */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={fetchTickets}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs transition cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? "animate-spin" : ""}`} />
              <span>{language === "fr" ? "Actualiser le Tableau" : "Refresh Board"}</span>
            </button>
          </div>
        </div>

        {/* 2. SUMMARY METRIC CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              {language === "fr" ? "Total des Billets Consignés" : "Total Tickets Logged"}
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#0B2545]">{counts.all}</span>
              <span className="text-xs font-semibold text-slate-500">{language === "fr" ? "Depuis Toujours" : "All Time"}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {language === "fr" ? "Demandes de clients authentifiés" : "Authenticated client requests"}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                {language === "fr" ? "En Attente de Réponse" : "Awaiting Dispatch Reply"}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                {language === "fr" ? "OUVERT" : "OPEN"}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-blue-900">{counts.open}</span>
              <span className="text-xs font-semibold text-blue-700">{language === "fr" ? "Nouvelle File" : "New Queue"}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {language === "fr" ? "Triage immédiat du répartiteur" : "Immediate dispatcher triage"}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              {language === "fr" ? "En Investigation du Personnel" : "In Staff Investigation"}
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-amber-700">{counts.in_progress}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {language === "fr" ? "Fil de communication actif" : "Active communication thread"}
            </p>
          </div>

          <div
            className={`bg-white rounded-2xl p-5 shadow-2xs ${
              counts.urgent > 0 ? "border-2 border-red-200" : "border border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  counts.urgent > 0 ? "text-red-700" : "text-slate-500"
                }`}
              >
                {language === "fr" ? "Priorité Urgente" : "Urgent Priority"}
              </span>
              {counts.urgent > 0 && <AlertTriangle className="w-4 h-4 text-red-600" />}
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className={`text-3xl font-bold ${counts.urgent > 0 ? "text-[#d21f27]" : "text-[#0B2545]"}`}>
                {counts.urgent}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {language === "fr" ? "Nécessite une attention immédiate" : "Requires immediate attention"}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              {language === "fr" ? "Résolu avec Succès" : "Successfully Resolved"}
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-emerald-700">{counts.resolved}</span>
              <span className="text-xs font-semibold text-emerald-700">{language === "fr" ? "Fermé" : "Closed"}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {language === "fr" ? "Demandes clients satisfaites" : "Satisfied client inquiries"}
            </p>
          </div>
        </div>

        {/* 3. TICKET BOARD DATA TABLE */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          {/* Table Filters */}
          <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  statusFilter === "all"
                    ? "bg-[#0B2545] text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {language === "fr" ? "Tous les Billets" : "All Tickets"} ({tickets.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("open")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  statusFilter === "open"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-white text-blue-700 border border-blue-200 hover:bg-blue-50"
                }`}
              >
                {language === "fr" ? "Ouvert" : "Open"} ({counts.open})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("in progress")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  statusFilter === "in progress"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-white text-amber-700 border border-amber-200 hover:bg-amber-50"
                }`}
              >
                {language === "fr" ? "En Cours" : "In Progress"} ({counts.in_progress})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("resolved")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  statusFilter === "resolved"
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50"
                }`}
              >
                {language === "fr" ? "Résolu" : "Resolved"} ({counts.resolved})
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder={language === "fr" ? "Rechercher réf. billet, client, sujet..." : "Search ticket ref, client, subject..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-white border border-slate-200 focus:border-[#0B2545] rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 outline-none w-full sm:w-64 transition"
              />
            </div>
          </div>

          {/* Tickets Table (Preserved on Desktop) */}
          <div className="hidden md:block overflow-x-auto min-h-[300px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4">{language === "fr" ? "Réf. Billet" : "Ticket Ref"}</th>
                  <th className="py-3.5 px-4">{language === "fr" ? "Entreprise Cliente" : "Client Enterprise"}</th>
                  <th className="py-3.5 px-4">{language === "fr" ? "Sujet de la Demande" : "Inquiry Subject"}</th>
                  <th className="py-3.5 px-4">{language === "fr" ? "Expédition Liée" : "Linked Shipment"}</th>
                  <th className="py-3.5 px-4">{language === "fr" ? "Priorité" : "Priority"}</th>
                  <th className="py-3.5 px-4">{language === "fr" ? "Statut" : "Status"}</th>
                  <th className="py-3.5 px-4">{language === "fr" ? "Mis à Jour" : "Updated"}</th>
                  <th className="py-3.5 px-4 text-right">{language === "fr" ? "Action" : "Action"}</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                      {language === "fr" ? "Aucun billet de support ne correspond à vos critères de filtre." : "No support tickets match your filter criteria."}
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      onClick={() => handleTicketClick(ticket)}
                      className="hover:bg-slate-50/80 transition cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-[#0B2545] whitespace-nowrap">
                        {ticket.ticketId || ticket.id}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-bold text-slate-900 block">
                          {ticket.client?.companyName || (language === "fr" ? "Compte Client" : "Client Account")}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {ticket.client?.name || (language === "fr" ? "Contact Opérations" : "Operations Contact")}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-800 max-w-xs truncate">
                        {ticket.subject}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700 whitespace-nowrap">
                        {ticket.shipmentId || ticket.linkedShipmentId || "—"}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            ticket.priority === "Urgent"
                              ? "bg-red-100 text-red-800"
                              : ticket.priority === "High"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {ticket.priority}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                            ticket.status === "Open"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : ticket.status === "In Progress"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {ticket.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 text-[11px]">
                        {ticket.updatedAt}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTicketClick(ticket);
                          }}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-[#0B2545] hover:text-white text-[#0B2545] font-bold text-[11px] transition cursor-pointer"
                        >
                          {language === "fr" ? "Voir le Fil" : "View Thread"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List for Support Tickets */}
          <div className="block md:hidden divide-y divide-slate-100">
            {filteredTickets.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                {language === "fr" ? "Aucun billet ne correspond à vos critères de filtre." : "No tickets match your filter criteria."}
              </div>
            ) : (
              filteredTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => handleTicketClick(ticket)}
                  className="p-4 space-y-2.5 cursor-pointer hover:bg-slate-50 transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-[#0B2545] text-xs">
                      {ticket.ticketId || ticket.id}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          ticket.priority === "Urgent"
                            ? "bg-red-100 text-red-800"
                            : ticket.priority === "High"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {ticket.priority}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          ticket.status === "Open"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : ticket.status === "In Progress"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        {ticket.status}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 text-xs leading-snug">{ticket.subject}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {ticket.client?.companyName || (language === "fr" ? "Compte Client" : "Client Account")} &bull; {ticket.client?.name}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                    <span>
                      {language === "fr" ? "Expédition :" : "Shipment:"}{" "}
                      <strong className="text-slate-700 font-mono">{ticket.shipmentId || ticket.linkedShipmentId || "—"}</strong>
                    </span>
                    <span>{ticket.updatedAt}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Ticket Detail Modal */}
        <TicketDetailModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          ticket={selectedTicket}
          onTicketUpdated={handleTicketUpdated}
        />
      </div>
    </PermissionGuard>
  );
}

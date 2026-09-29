"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  Search,
  X,
  Loader2,
  LayoutDashboard,
  FileText,
  Truck,
  Users,
  Briefcase,
  Receipt,
  LifeBuoy,
  Mail,
  BarChart3,
  Newspaper,
  BookOpen,
  Shield,
  Settings,
  ArrowRight,
  CornerDownLeft,
  Sparkles,
  Command,
  PackageCheck,
  Send,
  UserPlus,
} from "lucide-react";

export interface SearchItem {
  id: string;
  type: "page" | "action" | "shipment" | "quote" | "client" | "carrier";
  title: string;
  subtitle: string;
  detail?: string;
  status?: string;
  href: string;
  searchableText: string;
  icon?: React.ComponentType<{ className?: string }>;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function HighlightText({ text, words }: { text: string; words: string[] }) {
  if (!text || words.length === 0) return <>{text}</>;
  const validWords = words.filter(Boolean);
  if (validWords.length === 0) return <>{text}</>;

  const regex = new RegExp(`(${validWords.map(escapeRegex).join("|")})`, "gi");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        validWords.some((w) => w.toLowerCase() === part.toLowerCase()) ? (
          <mark key={i} className="bg-amber-100 text-amber-900 font-bold px-0.5 rounded-xs">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

export default function AdminSearchBar() {
  const router = useRouter();
  const { language } = useLanguage();

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const [dbResults, setDbResults] = useState<{
    shipments: SearchItem[];
    quotes: SearchItem[];
    clients: SearchItem[];
    carriers: SearchItem[];
  }>({
    shipments: [],
    quotes: [],
    clients: [],
    carriers: [],
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // 1. Static Admin Pages / Modules
  const adminPages: SearchItem[] = useMemo(
    () => [
      {
        id: "page-dashboard",
        type: "page",
        title: language === "fr" ? "Aperçu Opérations" : "Dashboard Overview",
        subtitle: "/admin",
        detail: language === "fr" ? "Indicateurs en direct, fret actif & alertes douanières" : "Live metrics, active freight & customs alerts",
        href: "/admin",
        icon: LayoutDashboard,
        searchableText: "dashboard vue d'ensemble aperçu opérations metrics alertes douane overview /admin home accueil",
      },
      {
        id: "page-quotes",
        type: "page",
        title: language === "fr" ? "Gestion des Soumissions" : "Quotes Management",
        subtitle: "/admin/quotes",
        detail: language === "fr" ? "Demandes de tarifs, révision & approbation" : "Rate requests, pricing review & dispatching",
        href: "/admin/quotes",
        icon: FileText,
        searchableText: "quotes soumissions devis tarifs pricing rate review quote request approbation /admin/quotes",
      },
      {
        id: "page-invoices",
        type: "page",
        title: language === "fr" ? "Factures & Paiements" : "Invoices & Payments",
        subtitle: "/admin/invoices",
        detail: language === "fr" ? "Comptabilité, facturation CAD/USD & statuts de règlement" : "Billing, CAD/USD invoicing & payment settlements",
        href: "/admin/invoices",
        icon: Receipt,
        searchableText: "invoices factures paiements billing payments cad usd taxes accounting comptabilité /admin/invoices",
      },
      {
        id: "page-shipments",
        type: "page",
        title: language === "fr" ? "Fret & Expéditions" : "Freight & Shipments",
        subtitle: "/admin/shipments",
        detail: language === "fr" ? "Suivi en direct, PARS douaniers CBSA & statuts de route" : "Live tracking, CBSA PARS customs & transit updates",
        href: "/admin/shipments",
        icon: Truck,
        searchableText: "shipments fret expéditions tracking suivi transit customs douane cbsa pars driver chauffeur /admin/shipments",
      },
      {
        id: "page-carriers",
        type: "page",
        title: language === "fr" ? "Réseau Transporteurs" : "Carrier Network",
        subtitle: "/admin/carriers",
        detail: language === "fr" ? "Flotte partenariats, conformité d'assurance & chauffeurs" : "Fleet fleet partners, insurance compliance & drivers",
        href: "/admin/carriers",
        icon: Briefcase,
        searchableText: "carriers transporteurs partners flotte fleet insurance conformité assurance scac dot /admin/carriers",
      },
      {
        id: "page-clients",
        type: "page",
        title: language === "fr" ? "Comptes Clients" : "Clients & Accounts",
        subtitle: "/admin/clients",
        detail: language === "fr" ? "Profils d'entreprises, historique et coordonnées" : "Enterprise profiles, shipment records & contacts",
        href: "/admin/clients",
        icon: Users,
        searchableText: "clients comptes accounts entreprises enterprise directory contacts email users /admin/clients",
      },
      {
        id: "page-support",
        type: "page",
        title: language === "fr" ? "Billets de Support" : "Support Tickets",
        subtitle: "/admin/support",
        detail: language === "fr" ? "Demandes d'assistance, réclamations & service client" : "Assistance requests, claims & customer service",
        href: "/admin/support",
        icon: LifeBuoy,
        searchableText: "support tickets billets réclamations claims service client help assistance /admin/support",
      },
      {
        id: "page-messages",
        type: "page",
        title: language === "fr" ? "Messages & Formulaires" : "Inquiries & Leads",
        subtitle: "/admin/messages",
        detail: language === "fr" ? "Messages entrants du site web & prospects commerciaux" : "Incoming website inquiries & commercial leads",
        href: "/admin/messages",
        icon: Mail,
        searchableText: "messages inquiries formulaires leads prospects contact web demandes /admin/messages",
      },
      {
        id: "page-analytics",
        type: "page",
        title: language === "fr" ? "Analytique & Rapports" : "Analytics & Reports",
        subtitle: "/admin/analytics",
        detail: language === "fr" ? "Performance opérationnelle, revenus & volumes mensuels" : "Operational KPIs, revenue breakdown & monthly volume",
        href: "/admin/analytics",
        icon: BarChart3,
        searchableText: "analytics rapports reports performance stats revenus kpi kpis volume graphiques /admin/analytics",
      },
      {
        id: "page-blog",
        type: "page",
        title: language === "fr" ? "Blogue & Contenu" : "Blog & Content",
        subtitle: "/admin/blog",
        detail: language === "fr" ? "Articles logistiques, actualités & publications" : "Freight articles, industry news & publication editor",
        href: "/admin/blog",
        icon: Newspaper,
        searchableText: "blog articles blogue news publications contenu actualités /admin/blog",
      },
      {
        id: "page-resources",
        type: "page",
        title: language === "fr" ? "Ressources & FAQ" : "Resources & FAQ",
        subtitle: "/admin/resources",
        detail: language === "fr" ? "Guides douaniers, documents téléchargeables & FAQ" : "Customs guides, regulatory docs & customer FAQ",
        href: "/admin/resources",
        icon: BookOpen,
        searchableText: "resources ressources faq guides douane documents pdf /admin/resources",
      },
      {
        id: "page-staff",
        type: "page",
        title: language === "fr" ? "Personnel & Accès (RBAC)" : "Staff & Access (RBAC)",
        subtitle: "/admin/staff",
        detail: language === "fr" ? "Gestion des permissions, rôles & sécurité d'équipe" : "Role-based permissions, dispatch team & audit access",
        href: "/admin/staff",
        icon: Shield,
        searchableText: "staff personnel rbac permissions rôles security sécurité dispatchers agents team /admin/staff",
      },
      {
        id: "page-settings",
        type: "page",
        title: language === "fr" ? "Paramètres Système" : "System Settings",
        subtitle: "/admin/settings",
        detail: language === "fr" ? "Configuration plateforme, devises, API & préférences" : "Platform configurations, currency rates, APIs & config",
        href: "/admin/settings",
        icon: Settings,
        searchableText: "settings paramètres config configuration devises api system système /admin/settings",
      },
    ],
    [language]
  );

  // 2. Quick Staff Actions
  const quickActions: SearchItem[] = useMemo(
    () => [
      {
        id: "action-new-quote",
        type: "action",
        title: language === "fr" ? "Créer une Soumission Directe" : "Create Direct Quote",
        subtitle: "/admin/quotes",
        detail: language === "fr" ? "Émettre un tarif immédiat pour un client" : "Generate an immediate rate proposal for a client",
        href: "/admin/quotes",
        icon: PackageCheck,
        searchableText: "create new quote créer nouvelle soumission devis rate tarif action",
      },
      {
        id: "action-track-shipment",
        type: "action",
        title: language === "fr" ? "Expéditions & Statut PARS" : "Track / Dispatch Shipment",
        subtitle: "/admin/shipments",
        detail: language === "fr" ? "Assigner un transporteur ou vérifier les douanes" : "Assign carrier vendor or check customs status",
        href: "/admin/shipments",
        icon: Send,
        searchableText: "track dispatch shipment assign carrier assigner transporteur expédier pars action",
      },
      {
        id: "action-onboard-carrier",
        type: "action",
        title: language === "fr" ? "Intégrer un Transporteur" : "Onboard Carrier Partner",
        subtitle: "/admin/carriers",
        detail: language === "fr" ? "Ajouter un nouveau transporteur routier ou maritime" : "Add road or ocean carrier with insurance verification",
        href: "/admin/carriers",
        icon: Briefcase,
        searchableText: "onboard carrier partner intégrer transporteur ajouter flotte insurance fleet action",
      },
      {
        id: "action-add-client",
        type: "action",
        title: language === "fr" ? "Ajouter un Compte Client" : "Add Client Account",
        subtitle: "/admin/clients",
        detail: language === "fr" ? "Créer un profil d'entreprise et inviter un contact" : "Create company profile and invite billing contact",
        href: "/admin/clients",
        icon: UserPlus,
        searchableText: "add client account ajouter compte client nouveau profile entreprise action",
      },
    ],
    [language]
  );

  // Split query into distinct lowercase words for progressive filtering
  const searchWords = useMemo(() => {
    return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  }, [query]);

  // Lazy-load DB items on focus or when query changes
  const loadSearchData = useCallback(async (searchQuery = "") => {
    try {
      setLoading(true);
      const url = searchQuery.trim()
        ? `/api/admin/search?q=${encodeURIComponent(searchQuery.trim())}`
        : `/api/admin/search`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.success && data.results) {
        setDbResults((prev) => {
          // If searching with a specific query, merge without duplicating IDs
          const merge = (existing: SearchItem[], incoming: SearchItem[]) => {
            const map = new Map<string, SearchItem>();
            incoming.forEach((item) => map.set(item.id, item));
            existing.forEach((item) => {
              if (!map.has(item.id)) map.set(item.id, item);
            });
            return Array.from(map.values());
          };

          return {
            shipments: merge(prev.shipments, data.results.shipments || []),
            quotes: merge(prev.quotes, data.results.quotes || []),
            clients: merge(prev.clients, data.results.clients || []),
            carriers: merge(prev.carriers, data.results.carriers || []),
          };
        });
        setDataLoaded(true);
      }
    } catch (err) {
      console.error("Failed to load search data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced live fetch when user types new words
  useEffect(() => {
    if (!isOpen) return;
    if (query.trim().length >= 2) {
      const timer = setTimeout(() => {
        loadSearchData(query);
      }, 180);
      return () => clearTimeout(timer);
    }
  }, [query, isOpen, loadSearchData]);

  // Initial fetch when opened
  const handleFocus = () => {
    setIsOpen(true);
    if (!dataLoaded) {
      loadSearchData();
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Global hotkey Ctrl+K / Cmd+K
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Progressive multi-word filtering helper
  // Evaluates whether EVERY search word is contained in the searchable text
  const matchFilter = useCallback(
    (item: SearchItem) => {
      if (searchWords.length === 0) return true;
      const text = item.searchableText.toLowerCase();
      return searchWords.every((word) => text.includes(word));
    },
    [searchWords]
  );

  // Filtered categorized results
  const filteredPages = useMemo(() => adminPages.filter(matchFilter), [adminPages, matchFilter]);
  const filteredActions = useMemo(() => quickActions.filter(matchFilter), [quickActions, matchFilter]);
  const filteredShipments = useMemo(() => dbResults.shipments.filter(matchFilter), [dbResults.shipments, matchFilter]);
  const filteredQuotes = useMemo(() => dbResults.quotes.filter(matchFilter), [dbResults.quotes, matchFilter]);
  const filteredClients = useMemo(() => dbResults.clients.filter(matchFilter), [dbResults.clients, matchFilter]);
  const filteredCarriers = useMemo(() => dbResults.carriers.filter(matchFilter), [dbResults.carriers, matchFilter]);

  // Flattened list for keyboard navigation
  const flatResults = useMemo(() => {
    const list: SearchItem[] = [];

    if (activeCategory === "all" || activeCategory === "pages") {
      list.push(...filteredPages);
      if (searchWords.length > 0 || activeCategory === "pages") {
        list.push(...filteredActions);
      }
    }

    if (activeCategory === "all" || activeCategory === "shipments") {
      list.push(...filteredShipments);
    }

    if (activeCategory === "all" || activeCategory === "quotes") {
      list.push(...filteredQuotes);
    }

    if (activeCategory === "all" || activeCategory === "clients") {
      list.push(...filteredClients);
    }

    if (activeCategory === "all" || activeCategory === "carriers") {
      list.push(...filteredCarriers);
    }

    return list;
  }, [
    activeCategory,
    filteredPages,
    filteredActions,
    filteredShipments,
    filteredQuotes,
    filteredClients,
    filteredCarriers,
    searchWords.length,
  ]);

  const totalResultsCount =
    filteredPages.length +
    filteredActions.length +
    filteredShipments.length +
    filteredQuotes.length +
    filteredClients.length +
    filteredCarriers.length;

  // Handle keyboard navigation within the results
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (flatResults.length === 0 ? 0 : (prev + 1) % flatResults.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (flatResults.length === 0 ? 0 : (prev - 1 + flatResults.length) % flatResults.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flatResults[selectedIndex]) {
        handleSelect(flatResults[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleSelect = (item: SearchItem) => {
    setIsOpen(false);
    router.push(item.href);
  };

  // Remove a specific word from progressive query
  const handleRemoveWord = (wordToRemove: string) => {
    const remainingWords = searchWords.filter((w) => w !== wordToRemove.toLowerCase());
    setQuery(remainingWords.join(" "));
    inputRef.current?.focus();
  };

  const handleClear = () => {
    setQuery("");
    setSelectedIndex(0);
    inputRef.current?.focus();
  };

  const getStatusBadge = (status?: string, type?: string) => {
    if (!status) return null;
    const lower = status.toLowerCase();

    let colorClass = "bg-slate-100 text-slate-700 border-slate-200";
    if (lower.includes("transit") || lower.includes("route")) {
      colorClass = "bg-blue-50 text-blue-700 border-blue-200";
    } else if (lower.includes("customs") || lower.includes("held") || lower.includes("hold") || lower.includes("review")) {
      colorClass = "bg-amber-50 text-amber-800 border-amber-200";
    } else if (lower.includes("delivered") || lower.includes("accepted") || lower.includes("active")) {
      colorClass = "bg-emerald-50 text-emerald-800 border-emerald-200";
    } else if (lower.includes("quoted")) {
      colorClass = "bg-teal-50 text-teal-800 border-teal-200";
    } else if (lower.includes("rejected") || lower.includes("cancelled") || lower.includes("deactivated")) {
      colorClass = "bg-rose-50 text-rose-700 border-rose-200";
    }

    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wide shrink-0 ${colorClass}`}>
        {status}
      </span>
    );
  };

  const getTypePill = (type: SearchItem["type"]) => {
    switch (type) {
      case "page":
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-slate-100 text-slate-600 border border-slate-200">PAGE</span>;
      case "action":
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-red-50 text-[#d21f27] border border-red-200">ACTION</span>;
      case "shipment":
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">SHIPMENT</span>;
      case "quote":
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">QUOTE</span>;
      case "client":
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200">CLIENT</span>;
      case "carrier":
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200">CARRIER</span>;
      default:
        return null;
    }
  };

  return (
    <div className="relative flex-1 max-w-lg lg:max-w-xl" ref={containerRef}>
      {/* Search Input Box */}
      <div
        className={`relative flex items-center bg-slate-50/90 hover:bg-slate-100/90 focus-within:bg-white border rounded-xl sm:rounded-2xl transition-all duration-200 shadow-2xs ${
          isOpen
            ? "border-[#0B2545]/40 ring-2 ring-[#0B2545]/10 shadow-md bg-white"
            : "border-slate-200"
        }`}
      >
        <div className="pl-3 sm:pl-3.5 pr-2 flex items-center pointer-events-none text-slate-400">
          <Search className={`w-4 h-4 transition-colors ${isOpen ? "text-[#d21f27]" : "text-slate-400"}`} />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(0);
          }}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={
            language === "fr"
              ? "Rechercher expéditions, soumissions, clients, modules... (Ctrl+K)"
              : "Search shipments, quotes, clients, modules... (Ctrl+K)"
          }
          className="w-full py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 bg-transparent border-none outline-none focus:ring-0"
          aria-label="Progressive search"
        />

        {/* Right Controls: Loader / Clear Button / Shortcut Badge */}
        <div className="pr-2.5 flex items-center gap-1.5 shrink-0">
          {loading && (
            <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />
          )}

          {query ? (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-200/60 transition cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 bg-white border border-slate-200/80 rounded-md shadow-2xs text-[10px] font-mono text-slate-400 font-bold select-none">
              <Command className="w-2.5 h-2.5" />
              <span>K</span>
            </div>
          )}
        </div>
      </div>

      {/* Floating Progressive Dropdown Results */}
      {isOpen && (
        <div
          className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150"
          style={{ maxHeight: "calc(100vh - 90px)" }}
        >
          {/* Progressive Feedback & Word Chips Header */}
          <div className="px-4 py-2.5 bg-slate-50/90 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            {searchWords.length > 0 ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#d21f27]" />
                  {language === "fr" ? "Mots filtrés:" : "Filtering words:"}
                </span>
                {searchWords.map((word) => (
                  <span
                    key={word}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-800 font-bold text-[11px] shadow-2xs group"
                  >
                    <span>&quot;{word}&quot;</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveWord(word)}
                      className="text-slate-400 hover:text-[#d21f27] transition"
                      title={`Remove "${word}" filter`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <LayoutDashboard className="w-3 h-3 text-slate-400" />
                <span>{language === "fr" ? "Navigation Rapide & Récents" : "Quick Navigation & Recents"}</span>
              </div>
            )}

            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 ml-auto">
              <span className="font-bold text-slate-900">{totalResultsCount}</span>
              <span>{language === "fr" ? "résultats" : "results found"}</span>
            </div>
          </div>

          {/* Category Filter Pills (When search query has words) */}
          {searchWords.length > 0 && totalResultsCount > 0 && (
            <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1 overflow-x-auto sleek-scrollbar text-[11px]">
              {[
                { id: "all", label: language === "fr" ? "Tous" : "All", count: totalResultsCount },
                { id: "shipments", label: language === "fr" ? "Fret" : "Shipments", count: filteredShipments.length },
                { id: "quotes", label: language === "fr" ? "Soumissions" : "Quotes", count: filteredQuotes.length },
                { id: "clients", label: language === "fr" ? "Clients" : "Clients", count: filteredClients.length },
                { id: "carriers", label: language === "fr" ? "Transporteurs" : "Carriers", count: filteredCarriers.length },
                { id: "pages", label: language === "fr" ? "Pages" : "Pages", count: filteredPages.length + filteredActions.length },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveCategory(tab.id);
                    setSelectedIndex(0);
                  }}
                  className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    activeCategory === tab.id
                      ? "bg-[#0B2545] text-white shadow-2xs"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[9px] px-1 rounded-full ${
                      activeCategory === tab.id ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Results List View */}
          <div
            ref={listRef}
            className="max-h-[380px] overflow-y-auto p-2 space-y-1 sleek-scrollbar divide-y divide-slate-100/60"
          >
            {totalResultsCount === 0 ? (
              <div className="p-8 text-center">
                <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-2.5">
                  <Search className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-900">
                  {language === "fr"
                    ? `Aucun résultat ne contient tous ces mots : "${query}"`
                    : `No items matched all filter words: "${query}"`}
                </p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                  {language === "fr"
                    ? "Essayez de retirer un mot ou recherchez par n° de suivi (TMX), ville (Montréal), ou nom de client."
                    : "Try removing a word or search by tracking number (TMX), city (Montreal), client name, or module."}
                </p>
              </div>
            ) : (
              flatResults.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                const IconComponent = item.icon || (item.type === "shipment" ? Truck : item.type === "quote" ? FileText : item.type === "client" ? Users : item.type === "carrier" ? Briefcase : LayoutDashboard);

                return (
                  <div
                    key={`${item.type}-${item.id}`}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`group px-3 py-2.5 rounded-xl cursor-pointer transition flex items-center gap-3 select-none ${
                      isSelected
                        ? "bg-slate-100/90 border-l-3 border-[#d21f27] pl-3.5"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    {/* Item Icon Box */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition ${
                        isSelected
                          ? "bg-white text-[#d21f27] border-red-200 shadow-2xs"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-xs text-slate-900 truncate">
                          <HighlightText text={item.title} words={searchWords} />
                        </span>
                        {getTypePill(item.type)}
                        {getStatusBadge(item.status, item.type)}
                      </div>

                      <p className="text-[11px] text-slate-500 truncate">
                        <HighlightText text={item.subtitle} words={searchWords} />
                        {item.detail && (
                          <span className="text-slate-400 font-normal">
                            {" • "}
                            <HighlightText text={item.detail} words={searchWords} />
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Arrow / Enter hint */}
                    <div className="shrink-0 text-slate-400 group-hover:text-slate-700 transition flex items-center">
                      {isSelected ? (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-2xs">
                          <span>Enter</span>
                          <CornerDownLeft className="w-2.5 h-2.5" />
                        </div>
                      ) : (
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Keyboard Navigation Shortcuts */}
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="bg-white border border-slate-200 px-1 py-0.2 rounded font-mono text-[9px] shadow-2xs text-slate-600">↑</kbd>
                <kbd className="bg-white border border-slate-200 px-1 py-0.2 rounded font-mono text-[9px] shadow-2xs text-slate-600">↓</kbd>
                {language === "fr" ? "Naviguer" : "Navigate"}
              </span>
              <span className="flex items-center gap-1">
                <kbd className="bg-white border border-slate-200 px-1.5 py-0.2 rounded font-mono text-[9px] shadow-2xs text-slate-600">↵</kbd>
                {language === "fr" ? "Ouvrir" : "Select"}
              </span>
              <span className="flex items-center gap-1">
                <kbd className="bg-white border border-slate-200 px-1 py-0.2 rounded font-mono text-[9px] shadow-2xs text-slate-600">Esc</kbd>
                {language === "fr" ? "Fermer" : "Close"}
              </span>
            </div>
            <div className="hidden sm:block text-slate-400 font-mono text-[10px]">
              Transimex Admin Hub
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

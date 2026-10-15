"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import PermissionGuard from "@/components/admin/PermissionGuard";
import B2bTermsForm from "@/components/admin/express/B2bTermsForm";
import {
  ExpressAdminTabs,
  StatusBadge,
  TypeBadge,
  adminInput,
  formatDate,
  useTr,
} from "@/components/admin/express/expressAdminShared";
import { formatCad } from "@/lib/shipping/core/money";
import { COUNTRIES } from "@/lib/data/countries";
import { optionLabel } from "@/lib/express/shippingProfile";
import type { AdminAccountDTO } from "@/lib/express/accountDto";

interface HistoryRow {
  id: string;
  oldPct: number | null;
  newPct: number;
  changedByName: string;
  createdAt: string;
}

/** Switches an approved business into a partner (resells to its own customers) and sets its default markup. */
function PartnerCard({
  initial,
  busy,
  onSave,
}: {
  initial: { enabled: boolean; defaultMarkupPct: number };
  busy: boolean;
  onSave: (value: { enabled: boolean; defaultMarkupPct: number }) => void;
}) {
  const { tr } = useTr();
  const [enabled, setEnabled] = useState(initial.enabled);
  const [markup, setMarkup] = useState(String(initial.defaultMarkupPct));
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const pct = Number(markup);
    if (markup.trim() === "" || !Number.isFinite(pct) || pct < 0 || pct > 99.99 || Math.round(pct * 100) / 100 !== pct) {
      return setError(tr("Enter a markup between 0 and 99.99 (two decimals at most).", "Entrez une majoration entre 0 et 99,99 (deux décimales au plus)."));
    }
    setError(null);
    onSave({ enabled, defaultMarkupPct: pct });
  };

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
      <h2 className="font-bold text-[#0B2545] text-sm">{tr("Partner", "Partenaire")}</h2>
      <p className="text-xs text-slate-600">
        {tr(
          "A partner resells Express to its own customers: it books for them, adds a markup on your price and can give a customer a login. The partner always pays Transimex its own discounted price.",
          "Un partenaire revend Express à ses propres clients : il réserve pour eux, ajoute une majoration à votre prix et peut donner un accès à un client. Le partenaire paie toujours à Transimex son propre prix rabaissé."
        )}
      </p>
      <form onSubmit={submit} className="space-y-3" noValidate>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="accent-[#0B2545]" />
          {tr("This business is a partner", "Cette entreprise est un partenaire")}
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-bold text-slate-700">{tr("Default markup on its customers (%)", "Majoration par défaut sur ses clients (%)")}</span>
          <input className={adminInput} value={markup} onChange={(e) => setMarkup(e.target.value)} inputMode="decimal" disabled={!enabled} />
          <span className="block text-[11px] text-slate-500">
            {tr("The partner can still set a different markup per customer.", "Le partenaire peut tout de même fixer une autre majoration par client.")}
          </span>
        </label>
        {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
        <button type="submit" disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0B2545] hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-bold cursor-pointer">
          {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {tr("Save partner settings", "Enregistrer les paramètres partenaire")}
        </button>
      </form>
    </section>
  );
}

export default function AdminExpressAccountPage() {
  const { id } = useParams<{ id: string }>();
  const { language, tr } = useTr();
  const [account, setAccount] = useState<AdminAccountDTO | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const [reason, setReason] = useState("");
  const [reasonAction, setReasonAction] = useState<"reject" | "suspend" | null>(null);

  const flash = useCallback((text: string, error = false) => {
    setToast({ text, error });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await fetch(`/api/admin/express/accounts/${id}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load account");
      setAccount(data.account);
      setHistory(data.discountHistory);
    } catch (err: any) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (payload: Record<string, unknown>, success: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/express/accounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = Array.isArray(data.fields) ? data.fields.map((f: { message: string }) => f.message).join(", ") : "";
        throw new Error([data.error, detail].filter(Boolean).join(": ") || "Action failed");
      }
      setAccount(data.account);
      setReason("");
      setReasonAction(null);
      flash(success);
      // Reload for the refreshed discount history.
      const refreshed = await fetch(`/api/admin/express/accounts/${id}`).then((r) => r.json()).catch(() => null);
      if (refreshed?.success) setHistory(refreshed.discountHistory);
    } catch (err: any) {
      flash(err.message, true);
    } finally {
      setBusy(false);
    }
  };

  const countryName = (code: string) => {
    const c = COUNTRIES.find((x) => x.code === code);
    return c ? (language === "fr" ? c.nameFr : c.name) : code;
  };

  const body = () => {
    if (loading) return <div className="py-16 text-center text-xs text-slate-400">{tr("Loading...", "Chargement...")}</div>;
    if (loadError || !account) {
      return (
        <div className="py-16 text-center text-xs text-red-600 font-semibold">
          {loadError || tr("Not found", "Introuvable")}{" "}
          <button type="button" onClick={load} className="underline cursor-pointer">
            {tr("Retry", "Réessayer")}
          </button>
        </div>
      );
    }

    const isB2b = account.type === "b2b";
    const canApprove = isB2b && (account.status === "pending" || account.status === "rejected");
    const canReject = isB2b && account.status === "pending";
    const canEdit = isB2b && (account.status === "active" || account.status === "suspended");
    const canSuspend = account.status === "active";
    const canReactivate = account.status === "suspended";
    const terms = {
      discountPct: account.discountPct,
      billingModes: account.billingModes as ("pay_at_booking" | "invoice")[],
      creditLimitCents: account.creditLimitCents,
      paymentTermsDays: account.paymentTermsDays,
    };

    // What the business told us about its shipping, with the points that matter for the decision.
    const businessProfile = () => {
      const sp = account.shippingProfile;
      if (!sp) {
        return (
          <div className="px-5 py-4 text-sm text-slate-500">
            <p className="mb-1 font-bold text-[#0B2545]">{tr("About their shipping", "À propos de leurs envois")}</p>
            {tr("Not provided. This application was made before these questions existed.", "Non fourni. Cette demande a été faite avant l'ajout de ces questions.")}
          </div>
        );
      }
      const L = language;
      const restricted = sp.restrictedGoods.filter((r) => r !== "none");
      const notes: { tone: "info" | "warn"; text: string }[] = [];
      if (sp.shipsFor !== "own") {
        notes.push({ tone: "info", text: tr("Ships for other people: it may need partner features (customers and markup) later.", "Expédie pour d'autres personnes : il pourrait avoir besoin des fonctions partenaire (clients et majoration) plus tard.") });
      }
      if (restricted.length > 0) {
        notes.push({ tone: "warn", text: tr(`Ships restricted goods (${restricted.map((r) => optionLabel("restrictedGoods", r, "en").toLowerCase()).join(", ")}). Check what DHL accepts before approving.`, `Expédie des marchandises restreintes (${restricted.map((r) => optionLabel("restrictedGoods", r, "fr").toLowerCase()).join(", ")}). Vérifiez ce que DHL accepte avant d'approuver.`) });
      }
      if (sp.paymentPreference === "weekly_invoice") {
        notes.push({ tone: "info", text: tr("Asked for a weekly invoice: if you approve it, set a credit limit and payment terms.", "A demandé une facture hebdomadaire : si vous l'approuvez, fixez une limite de crédit et des conditions de paiement.") });
      }
      if (!sp.businessNumber) {
        notes.push({ tone: "warn", text: tr("No business registration number was given.", "Aucun numéro d'enregistrement d'entreprise n'a été fourni.") });
      }
      const site = sp.website ? (/^https?:\/\//i.test(sp.website) ? sp.website : `https://${sp.website}`) : "";
      const rows: [string, React.ReactNode][] = [
        [tr("Ships", "Expédie"), sp.categories.map((c) => optionLabel("categories", c, L)).join(", ")],
        [tr("Typical items", "Articles habituels"), sp.goodsDescription],
        [tr("Ships for", "Expédie pour"), optionLabel("shipsFor", sp.shipsFor, L)],
        ...(sp.clientCount ? ([[tr("Number of clients", "Nombre de clients"), optionLabel("clientCount", sp.clientCount, L)]] as [string, React.ReactNode][]) : []),
        ...(sp.clientsDescription ? ([[tr("Their clients", "Leurs clients"), sp.clientsDescription]] as [string, React.ReactNode][]) : []),
        [tr("Destinations", "Destinations"), sp.destinations],
        [tr("Typical parcel", "Colis habituel"), optionLabel("typicalWeight", sp.typicalWeight, L)],
        [tr("Typical value", "Valeur habituelle"), optionLabel("typicalValue", sp.typicalValue, L)],
        [tr("Restricted goods", "Marchandises restreintes"), sp.restrictedGoods.map((r) => optionLabel("restrictedGoods", r, L)).join(", ")],
        [tr("Would like to pay", "Souhaite payer"), optionLabel("paymentPreference", sp.paymentPreference, L)],
        ...(sp.currentCarriers ? ([[tr("Carriers today", "Transporteurs actuels"), sp.currentCarriers]] as [string, React.ReactNode][]) : []),
        ...(sp.businessNumber ? ([[tr("Business number", "Numéro d'entreprise"), sp.businessNumber]] as [string, React.ReactNode][]) : []),
        ...(site ? ([[tr("Website", "Site Web"), <a key="w" href={site} target="_blank" rel="noopener noreferrer" className="text-[#0B2545] underline break-all">{sp.website}</a>]] as [string, React.ReactNode][]) : []),
      ];
      return (
        <div>
          <div className="px-5 pt-4 pb-2">
            <h3 className="font-bold text-[#0B2545] text-sm">{tr("About their shipping", "À propos de leurs envois")}</h3>
          </div>
          {notes.length > 0 && (
            <ul className="mx-5 mb-2 space-y-1.5" aria-label={tr("Review notes", "Notes d'examen")}>
              {notes.map((n) => (
                <li key={n.text} className={`rounded-lg border px-3 py-2 text-xs ${n.tone === "warn" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-blue-200 bg-blue-50 text-blue-900"}`}>
                  {n.text}
                </li>
              ))}
            </ul>
          )}
          <dl className="divide-y divide-slate-100">
            {rows.map(([label, value]) => (
              <div key={label} className="px-5 py-2.5 grid sm:grid-cols-3 gap-1 text-sm">
                <dt className="text-slate-500">{label}</dt>
                <dd className="sm:col-span-2 font-semibold text-slate-800 break-words">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      );
    };

    const info: [string, React.ReactNode][] = [
      [tr("Contact", "Contact"), account.contactName],
      [tr("Email", "Courriel"), account.user.email],
      [tr("Phone", "Téléphone"), account.phone],
      [tr("Country", "Pays"), countryName(account.country)],
      [tr("Client language", "Langue du client"), account.language === "fr" ? "Français" : "English"],
      ...(account.company
        ? ([
            [tr("Company", "Entreprise"), account.company.name],
            [tr("Address", "Adresse"), account.company.address],
            [tr("Business type", "Type d'entreprise"), account.company.businessType],
            [tr("Expected monthly volume", "Volume mensuel prévu"), account.company.expectedMonthlyVolume],
          ] as [string, React.ReactNode][])
        : []),
      [tr("Terms accepted", "Conditions acceptées"), `${account.termsVersion} · ${formatDate(account.termsAcceptedAt, language)}`],
      [tr("Applied", "Demande reçue"), formatDate(account.createdAt, language)],
      ...(account.reviewedAt ? ([[tr("Last reviewed", "Dernier examen"), formatDate(account.reviewedAt, language)]] as [string, React.ReactNode][]) : []),
    ];

    return (
      <div className="grid lg:grid-cols-5 gap-5">
        <section className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
          <div className="px-5 py-4 flex flex-wrap items-center gap-2">
            <h2 className="font-bold text-[#0B2545]">{account.company?.name || account.contactName}</h2>
            <TypeBadge type={account.type} />
            <StatusBadge status={account.status} />
          </div>
          {info.map(([label, value]) => (
            <div key={label} className="px-5 py-2.5 grid sm:grid-cols-3 gap-1 text-sm">
              <dt className="text-slate-500">{label}</dt>
              <dd className="sm:col-span-2 font-semibold text-slate-800 break-words">{value}</dd>
            </div>
          ))}
          {isB2b && businessProfile()}
          {account.rejectionReason && account.status === "rejected" && (
            <div className="px-5 py-3 text-sm bg-red-50 text-red-800">
              <b>{tr("Rejection reason", "Motif du rejet")}:</b> {account.rejectionReason}
            </div>
          )}
          {account.suspensionReason && account.status === "suspended" && (
            <div className="px-5 py-3 text-sm bg-slate-50 text-slate-700">
              <b>{tr("Suspension reason", "Motif de la suspension")}:</b> {account.suspensionReason}
            </div>
          )}
        </section>

        <div className="lg:col-span-2 space-y-5">
          {isB2b ? (
            <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <h2 className="font-bold text-[#0B2545] text-sm">
                {canApprove ? tr("Approve with terms", "Approuver avec conditions") : tr("Commercial terms", "Conditions commerciales")}
              </h2>
              {canApprove || canEdit ? (
                <B2bTermsForm
                  key={`${account.status}-${account.reviewedAt}`}
                  initial={terms}
                  paymentPreference={account.shippingProfile?.paymentPreference}
                  busy={busy}
                  submitLabel={canApprove ? tr("Approve account", "Approuver le compte") : tr("Save changes", "Enregistrer")}
                  onSubmit={(t) =>
                    act({ action: canApprove ? "approve" : "update", terms: t }, canApprove ? tr("Account approved", "Compte approuvé") : tr("Terms updated", "Conditions mises à jour"))
                  }
                />
              ) : (
                <p className="text-xs text-slate-500">{tr("Terms can be edited once the account is active.", "Les conditions peuvent être modifiées lorsque le compte est actif.")}</p>
              )}
              {account.discountPct != null && (
                <p className="text-[11px] text-slate-500">
                  {tr("Current", "Actuel")}: {account.discountPct}% ·{" "}
                  {account.billingModes.map((m) => (m === "invoice" ? tr("Weekly invoice", "Facture hebdomadaire") : tr("Pay at booking", "Paiement à la réservation"))).join(" + ")}
                  {account.creditLimitCents != null && ` · ${formatCad(account.creditLimitCents, language)} / ${account.paymentTermsDays} ${tr("days", "jours")}`}
                </p>
              )}
            </section>
          ) : (
            <section className="bg-white rounded-2xl border border-slate-200 p-5 text-xs text-slate-600">
              {tr(
                "B2C accounts use the single B2C discount from the Settings tab.",
                "Les comptes B2C utilisent le rabais B2C unique de l'onglet Paramètres."
              )}
            </section>
          )}

          {isB2b && canEdit && (
            <PartnerCard
              key={`${account.partnerSettings.enabled}-${account.partnerSettings.defaultMarkupPct}`}
              initial={account.partnerSettings}
              busy={busy}
              onSave={(value) => act({ action: "partner", partner: value }, tr("Partner settings saved", "Paramètres partenaire enregistrés"))}
            />
          )}

          {(canReject || canSuspend || canReactivate) && (
            <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <h2 className="font-bold text-[#0B2545] text-sm">{tr("Account status", "Statut du compte")}</h2>

              {reasonAction ? (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    {reasonAction === "reject"
                      ? tr("Reason for rejection (the client will see this)", "Motif du rejet (le client le verra)")
                      : tr("Reason for suspension (the client will see this)", "Motif de la suspension (le client le verra)")}
                  </label>
                  <textarea className={adminInput} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy || reason.trim().length < 3}
                      onClick={() =>
                        act(
                          { action: reasonAction, reason },
                          reasonAction === "reject" ? tr("Application rejected", "Demande rejetée") : tr("Account suspended", "Compte suspendu")
                        )
                      }
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D21F27] hover:bg-[#b91a21] disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
                    >
                      {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {reasonAction === "reject" ? tr("Confirm rejection", "Confirmer le rejet") : tr("Confirm suspension", "Confirmer la suspension")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setReasonAction(null);
                        setReason("");
                      }}
                      className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer"
                    >
                      {tr("Cancel", "Annuler")}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {canReject && (
                    <button type="button" onClick={() => setReasonAction("reject")} className="px-4 py-2 rounded-lg border border-red-300 text-red-700 text-xs font-bold hover:bg-red-50 cursor-pointer">
                      {tr("Reject application", "Rejeter la demande")}
                    </button>
                  )}
                  {canSuspend && (
                    <button type="button" onClick={() => setReasonAction("suspend")} className="px-4 py-2 rounded-lg border border-red-300 text-red-700 text-xs font-bold hover:bg-red-50 cursor-pointer">
                      {tr("Suspend account", "Suspendre le compte")}
                    </button>
                  )}
                  {canReactivate && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => act({ action: "reactivate" }, tr("Account reactivated", "Compte réactivé"))}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold cursor-pointer"
                    >
                      {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {tr("Reactivate account", "Réactiver le compte")}
                    </button>
                  )}
                </div>
              )}
            </section>
          )}

          {isB2b && (
            <section className="bg-white rounded-2xl border border-slate-200 p-5">
              <h2 className="font-bold text-[#0B2545] text-sm mb-2">{tr("Discount history", "Historique des rabais")}</h2>
              {history.length === 0 ? (
                <p className="text-xs text-slate-500">{tr("No changes yet.", "Aucun changement pour le moment.")}</p>
              ) : (
                <ul className="divide-y divide-slate-100 text-xs">
                  {history.map((h) => (
                    <li key={h.id} className="py-2 flex items-center justify-between gap-3">
                      <span className="font-bold text-slate-800">
                        {h.oldPct == null ? tr("set", "fixé") : `${h.oldPct}%`} → {h.newPct}%
                      </span>
                      <span className="text-slate-500 text-right">
                        {h.changedByName} · {formatDate(h.createdAt, language)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      </div>
    );
  };

  return (
    <PermissionGuard module="express">
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0B2545]">Transimex Express</h1>
        </div>
        <ExpressAdminTabs />
        <Link href="/admin/express" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900">
          <ArrowLeft className="w-3.5 h-3.5" />
          {tr("Back to applications", "Retour aux demandes")}
        </Link>
        {body()}
        {toast && (
          <div
            role="status"
            className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white ${toast.error ? "bg-red-600" : "bg-emerald-600"}`}
          >
            {toast.text}
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}

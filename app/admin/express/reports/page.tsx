"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowDownToLine, Loader2 } from "lucide-react";
import PermissionGuard from "@/components/admin/PermissionGuard";
import { ExpressAdminTabs, adminInput, useTr } from "@/components/admin/express/expressAdminShared";
import { formatCad } from "@/lib/shipping/core/money";
import { CARD_FEE_FIXED_CENTS, CARD_FEE_PCT, type Bucket, type ProfitReport, type ProfitRow } from "@/lib/express/profitReport";

type Loaded = ProfitReport & { names: Record<string, string>; skipped: number; awaitingLabel: number; from: string; to: string };
type Preset = "month" | "30" | "90" | "year" | "all" | "custom";

const day = (d: Date) => d.toISOString().slice(0, 10);

function presetRange(preset: Preset): { from: string; to: string } {
  const now = new Date();
  const to = day(now);
  if (preset === "month") return { from: day(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))), to };
  if (preset === "30") return { from: day(new Date(now.getTime() - 30 * 86_400_000)), to };
  if (preset === "90") return { from: day(new Date(now.getTime() - 90 * 86_400_000)), to };
  if (preset === "year") return { from: `${now.getUTCFullYear()}-01-01`, to };
  return { from: "", to: "" };
}

export default function AdminExpressProfitReportPage() {
  const { language, tr } = useTr();
  const [preset, setPreset] = useState<Preset>("month");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [data, setData] = useState<Loaded | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const range = preset === "custom" ? custom : presetRange(preset);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (range.from) params.set("from", range.from);
      if (range.to) params.set("to", range.to);
      const res = await fetch(`/api/admin/express/reports/profit?${params}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed to load the report");
      setData(body);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.from, range.to]);

  useEffect(() => {
    load();
  }, [load]);

  const m = (c: number) => formatCad(c, language);
  const pct = (n: number) => `${n.toFixed(1)}%`;
  const dateText = (iso: string) => new Intl.DateTimeFormat(language === "fr" ? "fr-CA" : "en-CA", { dateStyle: "medium" }).format(new Date(iso));
  const typeLabel = (k: string) => (k === "b2b" ? tr("Business (B2B)", "Entreprise (B2B)") : k === "b2c" ? tr("Individual (B2C)", "Particulier (B2C)") : tr("Partner's customer", "Client d'un partenaire"));

  const exportCsv = () => {
    if (!data) return;
    const head = ["date", "reference", "account", "type", "from", "to", "paid_by", "revenue", "dhl_cost", "pickup_fee", "profit", "est_card_fee", "net_profit", "client_discount_pct", "discount_not_applied", "cancelled"];
    const lines = data.rows.map((r: ProfitRow) => [r.date.slice(0, 10), r.reference, data.names[r.accountId] || r.accountId, r.accountType, r.originCountry, r.destinationCountry, r.payMethod, (r.revenueCents / 100).toFixed(2), (r.dhlCostCents / 100).toFixed(2), (r.pickupFeeCents / 100).toFixed(2), (r.profitCents / 100).toFixed(2), (r.cardFeeCents / 100).toFixed(2), (r.netProfitCents / 100).toFixed(2), r.discountPct, r.discountWaived ? "yes" : "no", r.cancelled ? "yes" : "no"]);
    const csv = [head, ...lines].map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `express-profit-${range.from || "start"}-${range.to || "today"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const presets: [Preset, string][] = useMemo(
    () => [
      ["month", tr("This month", "Ce mois-ci")],
      ["30", tr("Last 30 days", "30 derniers jours")],
      ["90", tr("Last 90 days", "90 derniers jours")],
      ["year", tr("This year", "Cette année")],
      ["all", tr("All time", "Depuis le début")],
      ["custom", tr("Custom", "Personnalisé")],
    ],
    [tr]
  );

  const table = (title: string, buckets: Bucket[], label: (k: string) => string) => (
    <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <h2 className="px-5 py-3 border-b border-slate-100 font-bold text-[#0B2545] text-sm">{title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-100">
              <th className="px-5 py-2 font-bold">{tr("Name", "Nom")}</th>
              <th className="px-3 py-2 text-right font-bold">{tr("Shipments", "Envois")}</th>
              <th className="px-3 py-2 text-right font-bold">{tr("Revenue", "Revenus")}</th>
              <th className="px-3 py-2 text-right font-bold">{tr("DHL cost", "Coût DHL")}</th>
              <th className="px-5 py-2 text-right font-bold">{tr("Profit", "Profit")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {buckets.slice(0, 12).map((b) => (
              <tr key={b.key}>
                <td className="px-5 py-2 font-semibold text-slate-800">{label(b.key)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{b.count}</td>
                <td className="px-3 py-2 text-right tabular-nums">{m(b.revenueCents)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-600">{m(b.dhlCostCents)}</td>
                <td className={`px-5 py-2 text-right font-bold tabular-nums ${b.profitCents < 0 ? "text-red-600" : "text-emerald-700"}`}>{m(b.profitCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  const totals = data?.totals;

  return (
    <PermissionGuard module="express">
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0B2545]">Transimex Express</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            {tr("What Express shipments sold for, what DHL's rate said they cost, and what Transimex kept.", "Ce que les envois Express ont rapporté, ce que le tarif de DHL a coûté, et ce que Transimex a gardé.")}
          </p>
        </div>

        <ExpressAdminTabs />

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-wrap gap-1.5" role="tablist">
            {presets.map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={preset === key}
                onClick={() => setPreset(key)}
                className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${preset === key ? "border-[#0B2545] bg-[#0B2545] text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
              >
                {label}
              </button>
            ))}
          </div>
          {preset === "custom" && (
            <div className="flex items-center gap-2">
              <input type="date" className={`${adminInput} !w-40`} value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} aria-label={tr("From", "Du")} />
              <span className="text-slate-400">→</span>
              <input type="date" className={`${adminInput} !w-40`} value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} aria-label={tr("To", "Au")} />
            </div>
          )}
          <div className="flex-1" />
          {data && data.rows.length > 0 && (
            <button type="button" onClick={exportCsv} className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
              <ArrowDownToLine className="h-3.5 w-3.5" />
              {tr("Export CSV", "Exporter en CSV")}
            </button>
          )}
        </div>

        {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}
        {loading && !data && (
          <div className="flex items-center gap-2 py-12 justify-center text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}

        {data && totals && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {(
                [
                  [tr("Shipments", "Envois"), String(totals.count), "text-[#0B2545]"],
                  [tr("Revenue", "Revenus"), m(totals.revenueCents), "text-[#0B2545]"],
                  [tr("DHL cost", "Coût DHL"), m(totals.dhlCostCents), "text-slate-700"],
                  [tr("Profit", "Profit"), m(totals.profitCents), totals.profitCents < 0 ? "text-red-600" : "text-emerald-700"],
                  [tr("Margin", "Marge"), pct(totals.marginPct), "text-slate-800"],
                ] as [string, string, string][]
              ).map(([label, value, tone]) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
                  <p className={`mt-1 text-2xl font-extrabold tabular-nums ${tone}`}>{value}</p>
                </div>
              ))}
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100 text-sm">
              <div className="flex items-center justify-between gap-4 px-5 py-2.5">
                <span className="text-slate-500">{tr(`Estimated card fees (${CARD_FEE_PCT}% + ${m(CARD_FEE_FIXED_CENTS)} per card payment)`, `Frais de carte estimés (${CARD_FEE_PCT} % + ${m(CARD_FEE_FIXED_CENTS)} par paiement par carte)`)}</span>
                <span className="font-semibold tabular-nums">−{m(totals.cardFeeCents)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 px-5 py-2.5">
                <span className="font-bold text-slate-800">{tr("Profit after card fees", "Profit après les frais de carte")}</span>
                <span className={`font-extrabold tabular-nums ${totals.netProfitCents < 0 ? "text-red-600" : "text-emerald-700"}`}>{m(totals.netProfitCents)}</span>
              </div>
            </section>

            <div className="space-y-2 text-xs text-slate-600">
              <p>
                {tr(
                  "Revenue is what clients paid after refunds and credits. DHL cost is DHL's rate when the price was quoted, so a weight correction DHL bills later is not included until it is reconciled. A shipment counts on the day its label was created, and stays counted if it was cancelled afterwards, because DHL's charge remains.",
                  "Les revenus sont ce que les clients ont payé après remboursements et crédits. Le coût DHL est le tarif de DHL au moment de la soumission : une correction de poids facturée plus tard n'y est pas incluse tant qu'elle n'est pas rapprochée. Un envoi compte le jour de la création de son étiquette et reste compté s'il est annulé ensuite, car le coût DHL demeure."
                )}
              </p>
              {data.awaitingLabel > 0 && (
                <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 font-semibold text-amber-800">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                  {tr(`${data.awaitingLabel} paid booking(s) have no DHL label yet and are not counted.`, `${data.awaitingLabel} réservation(s) payée(s) n'ont pas encore d'étiquette DHL et ne sont pas comptées.`)}
                </p>
              )}
              {data.skipped > 0 && (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 font-semibold text-amber-800">
                  {tr(`${data.skipped} shipment(s) have no saved quote and are left out.`, `${data.skipped} envoi(s) n'ont pas de soumission enregistrée et sont exclus.`)}
                </p>
              )}
              {totals.belowCostCount > 0 && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 font-semibold text-red-700">
                  {tr(`${totals.belowCostCount} shipment(s) lost money (client paid less than DHL's rate).`, `${totals.belowCostCount} envoi(s) ont perdu de l'argent (le client a payé moins que le tarif de DHL).`)}
                </p>
              )}
              {totals.waivedCount > 0 && (
                <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  {tr(`${totals.waivedCount} shipment(s) got no client discount because neither end is in Canada.`, `${totals.waivedCount} envoi(s) n'ont reçu aucun rabais client car aucune extrémité n'est au Canada.`)}
                </p>
              )}
            </div>

            {data.rows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
                {tr("No DHL-booked shipments in this period.", "Aucun envoi réservé auprès de DHL durant cette période.")}
              </div>
            ) : (
              <>
                <div className="grid gap-5 xl:grid-cols-2">
                  {table(tr("By month", "Par mois"), data.byMonth, (k) => k)}
                  {table(tr("By account type", "Par type de compte"), data.byType, typeLabel)}
                  {table(tr("Top routes", "Principaux trajets"), data.byRoute, (k) => k)}
                  {table(tr("Top accounts", "Principaux comptes"), data.byAccount, (k) => data.names[k] || k)}
                </div>

                <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <h2 className="px-5 py-3 border-b border-slate-100 font-bold text-[#0B2545] text-sm">{tr("Every shipment", "Chaque envoi")}</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-100">
                          <th className="px-5 py-2 font-bold">{tr("Label date", "Date de l'étiquette")}</th>
                          <th className="px-3 py-2 font-bold">{tr("Reference", "Référence")}</th>
                          <th className="px-3 py-2 font-bold">{tr("Account", "Compte")}</th>
                          <th className="px-3 py-2 font-bold">{tr("Route", "Trajet")}</th>
                          <th className="px-3 py-2 text-right font-bold">{tr("Revenue", "Revenus")}</th>
                          <th className="px-3 py-2 text-right font-bold">{tr("DHL cost", "Coût DHL")}</th>
                          <th className="px-5 py-2 text-right font-bold">{tr("Profit", "Profit")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.rows.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50">
                            <td className="px-5 py-2 whitespace-nowrap text-slate-600">{dateText(r.date)}</td>
                            <td className="px-3 py-2">
                              <Link href={`/admin/express/shipments/${r.id}`} className="font-mono font-bold text-[#0B2545] hover:underline">
                                {r.reference}
                              </Link>
                              {r.cancelled && <span className="ml-2 rounded-full border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">{tr("cancelled", "annulé")}</span>}
                            </td>
                            <td className="px-3 py-2 text-slate-700">{data.names[r.accountId] || "—"}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-slate-600">
                              {r.originCountry} → {r.destinationCountry}
                              {r.discountWaived && <span title={tr("No client discount: neither end is in Canada", "Aucun rabais client : aucune extrémité n'est au Canada")} className="ml-1.5 text-[10px] font-bold text-slate-400">0%</span>}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">{m(r.revenueCents)}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-slate-600">{m(r.dhlCostCents)}</td>
                            <td className={`px-5 py-2 text-right font-bold tabular-nums ${r.profitCents < 0 ? "text-red-600" : "text-emerald-700"}`}>{m(r.profitCents)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}
          </>
        )}
      </div>
    </PermissionGuard>
  );
}

"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import PermissionGuard from "@/components/admin/PermissionGuard";
import { ExpressAdminTabs, adminInput, dollarsToCents, useTr } from "@/components/admin/express/expressAdminShared";
import { COUNTRIES } from "@/lib/data/countries";
import { AFRICAN_COUNTRY_CODES } from "@/lib/express/africa";
import { formatCad } from "@/lib/shipping/core/money";
import type { PriceBreakdown } from "@/lib/express/pricing";
import type { AdminAccountDTO } from "@/lib/express/accountDto";

interface SimResult {
  account: { id: string; type: string; status: string; name: string } | null;
  discountSource: string;
  service: { code: string; name: string; estimatedDelivery: string | null };
  pricing: PriceBreakdown;
}

const AFRICA = COUNTRIES.filter((c) => AFRICAN_COUNTRY_CODES.has(c.code));

export default function AdminExpressSimulatorPage() {
  const { language, tr } = useTr();
  const [accounts, setAccounts] = useState<AdminAccountDTO[]>([]);
  const [form, setForm] = useState({
    accountId: "",
    originPostal: "M5V 2T6",
    originCity: "Toronto",
    country: "CM",
    destPostal: "00237",
    destCity: "Douala",
    weight: "2",
    length: "20",
    width: "20",
    height: "20",
    declared: "100",
    customs: true,
    pickup: false,
    override: "",
    markupKind: "none" as "none" | "flat" | "percent",
    markupValue: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SimResult | null>(null);

  useEffect(() => {
    fetch("/api/admin/express/accounts?status=active")
      .then((r) => r.json())
      .then((d) => d.success && setAccounts(d.accounts))
      .catch(() => {});
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    const declaredCents = dollarsToCents(form.declared);
    const num = (v: string) => (v.trim() === "" ? NaN : Number(v));
    if (declaredCents == null || declaredCents < 0) return setError(tr("Enter the declared value in CAD.", "Entrez la valeur déclarée en CAD."));
    if ([num(form.weight), num(form.length), num(form.width), num(form.height)].some((n) => !Number.isFinite(n))) {
      return setError(tr("Enter the weight and the three dimensions.", "Entrez le poids et les trois dimensions."));
    }

    let markup: unknown = null;
    if (form.markupKind === "flat") {
      const cents = dollarsToCents(form.markupValue);
      if (cents == null || cents < 0) return setError(tr("Enter a flat markup in CAD.", "Entrez une majoration fixe en CAD."));
      markup = { kind: "flat", cents };
    } else if (form.markupKind === "percent") {
      const pct = num(form.markupValue);
      if (!Number.isFinite(pct) || pct < 0) return setError(tr("Enter a markup percent.", "Entrez un pourcentage de majoration."));
      markup = { kind: "percent", pct };
    }

    const body = {
      request: {
        origin: { postalCode: form.originPostal, city: form.originCity },
        destination: { countryCode: form.country, postalCode: form.destPostal, city: form.destCity },
        parcels: [{ weightKg: num(form.weight), lengthCm: num(form.length), widthCm: num(form.width), heightCm: num(form.height) }],
        declaredValueCents: declaredCents,
        isCustomsDeclarable: form.customs,
        pickupRequested: form.pickup,
      },
      ...(form.accountId ? { accountId: form.accountId } : {}),
      ...(form.override.trim() !== "" ? { discountPctOverride: Number(form.override) } : {}),
      markup,
    };

    setBusy(true);
    try {
      const res = await fetch("/api/admin/express/quotes/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = Array.isArray(data.fields) ? data.fields.map((f: { path: string; message: string }) => `${f.path}: ${f.message}`).join("; ") : "";
        throw new Error([data.error, detail].filter(Boolean).join(" — ") || "Simulation failed");
      }
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const m = (cents: number) => formatCad(cents, language);

  const rows = useMemo(() => {
    if (!result) return [];
    const p = result.pricing;
    const lines: { label: string; account: number | null; publicPrice: number | null; client: number | null; bold?: boolean }[] = [
      { label: tr("Base freight", "Fret de base"), account: p.account.baseFreightCents, publicPrice: p.publicList.baseFreightCents, client: p.client.baseFreightCents },
    ];
    p.client.surcharges.forEach((s) => {
      const acct = p.account.surcharges.find((a) => a.code === s.code);
      const pub = p.publicList.surcharges.find((a) => a.code === s.code);
      lines.push({ label: s.name, account: acct ? acct.amountCents : null, publicPrice: pub ? pub.amountCents : null, client: s.amountCents });
    });
    lines.push({ label: tr("Total", "Total"), account: p.account.totalCents, publicPrice: p.publicList.totalCents, client: p.client.totalCents, bold: true });
    return lines;
  }, [result, tr]);

  return (
    <PermissionGuard module="express">
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0B2545]">Transimex Express</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            {tr("Price a shipment for any account and see every price level. Nothing is saved.", "Évaluez un envoi pour n'importe quel compte et voyez chaque niveau de prix. Rien n'est enregistré.")}
          </p>
        </div>

        <ExpressAdminTabs />

        <div className="grid xl:grid-cols-5 gap-5">
          <form onSubmit={submit} className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 space-y-4" noValidate>
            <label className="block space-y-1">
              <span className="text-xs font-bold text-slate-700">{tr("Account", "Compte")}</span>
              <select className={adminInput} value={form.accountId} onChange={set("accountId")}>
                <option value="">{tr("B2C (global discount)", "B2C (rabais global)")}</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {(a.company?.name || a.contactName) + " · " + a.type.toUpperCase() + (a.discountPct != null ? ` · ${a.discountPct}%` : "")}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-700">{tr("Origin postal code", "Code postal d'origine")}</span>
                <input className={adminInput} value={form.originPostal} onChange={set("originPostal")} />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-700">{tr("Origin city", "Ville d'origine")}</span>
                <input className={adminInput} value={form.originCity} onChange={set("originCity")} />
              </label>
            </div>

            <label className="block space-y-1">
              <span className="text-xs font-bold text-slate-700">{tr("Destination country", "Pays de destination")}</span>
              <select className={adminInput} value={form.country} onChange={set("country")}>
                {AFRICA.map((c) => (
                  <option key={c.code} value={c.code}>
                    {language === "fr" ? c.nameFr : c.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-700">{tr("Destination postal code", "Code postal de destination")}</span>
                <input className={adminInput} value={form.destPostal} onChange={set("destPostal")} />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-700">{tr("Destination city", "Ville de destination")}</span>
                <input className={adminInput} value={form.destCity} onChange={set("destCity")} />
              </label>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {([["weight", "kg"], ["length", "cm"], ["width", "cm"], ["height", "cm"]] as [keyof typeof form, string][]).map(([k, unit]) => (
                <label key={k} className="block space-y-1">
                  <span className="text-xs font-bold text-slate-700 capitalize">
                    {k === "weight" ? tr("Weight", "Poids") : k === "length" ? tr("Length", "Long.") : k === "width" ? tr("Width", "Larg.") : tr("Height", "Haut.")} ({unit})
                  </span>
                  <input className={adminInput} value={form[k] as string} onChange={set(k)} inputMode="decimal" />
                </label>
              ))}
            </div>

            <label className="block space-y-1">
              <span className="text-xs font-bold text-slate-700">{tr("Declared value (CAD)", "Valeur déclarée (CAD)")}</span>
              <input className={adminInput} value={form.declared} onChange={set("declared")} inputMode="decimal" />
            </label>

            <div className="flex flex-wrap gap-5 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.customs} onChange={set("customs")} className="accent-[#0B2545]" />
                {tr("Customs declarable", "Déclaration en douane")}
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.pickup} onChange={set("pickup")} className="accent-[#0B2545]" />
                {tr("DHL pickup", "Ramassage DHL")}
              </label>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100">
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-700">{tr("What-if discount %", "Rabais hypothétique %")}</span>
                <input className={adminInput} value={form.override} onChange={set("override")} inputMode="decimal" placeholder={tr("none", "aucun")} />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-700">{tr("Partner markup", "Majoration partenaire")}</span>
                <select className={adminInput} value={form.markupKind} onChange={set("markupKind")}>
                  <option value="none">{tr("None", "Aucune")}</option>
                  <option value="flat">{tr("Flat (CAD)", "Fixe (CAD)")}</option>
                  <option value="percent">{tr("Percent", "Pourcentage")}</option>
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-700">{tr("Markup value", "Valeur")}</span>
                <input className={adminInput} value={form.markupValue} onChange={set("markupValue")} inputMode="decimal" disabled={form.markupKind === "none"} />
              </label>
            </div>

            {error && (
              <p role="alert" className="text-xs font-semibold text-red-600">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0B2545] hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-bold cursor-pointer"
            >
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {tr("Calculate price", "Calculer le prix")}
            </button>
          </form>

          <div className="xl:col-span-3 space-y-4">
            {!result ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
                {tr("The result will appear here.", "Le résultat s'affichera ici.")}
              </div>
            ) : (
              <>
                {result.pricing.belowCost && (
                  <div role="alert" className="rounded-2xl border border-red-300 bg-red-50 p-4 flex gap-3 text-red-800 text-sm">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <div>
                      <b>{tr("Below cost.", "Sous le coût.")}</b>{" "}
                      {tr(
                        `The client price is ${m(Math.abs(result.pricing.profitCents))} under what DHL charges Transimex. Clients are not given quotes like this.`,
                        `Le prix client est de ${m(Math.abs(result.pricing.profitCents))} sous ce que DHL facture à Transimex. Les clients ne reçoivent pas de telles soumissions.`
                      )}
                    </div>
                  </div>
                )}

                <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-bold text-[#0B2545] text-sm">{result.service.name}</h2>
                    <span className="text-[11px] text-slate-500">
                      {result.account ? `${result.account.name} (${result.account.type.toUpperCase()})` : "B2C"} · {result.discountSource}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-100">
                          <th className="text-left px-5 py-2 font-bold">{tr("Line", "Ligne")}</th>
                          <th className="text-right px-3 py-2 font-bold">{tr("DHL account rate", "Tarif de compte DHL")}</th>
                          <th className="text-right px-3 py-2 font-bold">{tr("DHL public price", "Prix public DHL")}</th>
                          <th className="text-right px-5 py-2 font-bold">{tr("Client price", "Prix client")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rows.map((r) => (
                          <tr key={r.label} className={r.bold ? "font-bold bg-slate-50" : ""}>
                            <td className="px-5 py-2">{r.label}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{r.account != null ? m(r.account) : "—"}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{r.publicPrice != null ? m(r.publicPrice) : "—"}</td>
                            <td className="px-5 py-2 text-right tabular-nums">{r.client != null ? m(r.client) : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 text-sm">
                  {(
                    [
                      [tr("Client discount", "Rabais client"), `${result.pricing.clientDiscountPct}% = −${m(result.pricing.discountCents)} ${tr("on base freight", "sur le fret de base")}`],
                      [
                        tr("Public price source", "Source du prix public"),
                        result.pricing.publicSource === "carrier"
                          ? tr("Returned by DHL", "Retourné par DHL")
                          : tr(`Rebuilt from the account rate (DHL contract discount ${result.pricing.dhlContractDiscountPct}%)`, `Reconstruit à partir du tarif de compte (rabais du contrat DHL ${result.pricing.dhlContractDiscountPct} %)`),
                      ],
                      ...(result.pricing.pickupFeeCents > 0 ? [[tr("Pickup fee", "Frais de ramassage"), m(result.pricing.pickupFeeCents)] as [string, string]] : []),
                      [tr("Partner markup", "Majoration du partenaire"), result.pricing.markupCents > 0 ? m(result.pricing.markupCents) : "—"],
                      [tr("Customer price (with markup)", "Prix du client final (avec majoration)"), m(result.pricing.customerTotalCents)],
                      [tr("Transimex profit", "Profit de Transimex"), m(result.pricing.profitCents)],
                    ] as [string, string][]
                  ).map(([label, value]) => (
                    <div key={label} className="px-5 py-2.5 flex items-center justify-between gap-4">
                      <span className="text-slate-500">{label}</span>
                      <span className={`font-semibold text-right ${label.startsWith("Transimex") || label.startsWith("Profit") ? (result.pricing.profitCents < 0 ? "text-red-600" : "text-emerald-700") : "text-slate-800"}`}>{value}</span>
                    </div>
                  ))}
                </section>
              </>
            )}
          </div>
        </div>
      </div>
    </PermissionGuard>
  );
}

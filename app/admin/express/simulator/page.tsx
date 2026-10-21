"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import PermissionGuard from "@/components/admin/PermissionGuard";
import { ExpressAdminTabs, adminInput, dollarsToCents, useTr } from "@/components/admin/express/expressAdminShared";
import CountrySelect from "@/components/express/CountrySelect";
import UnitToggle from "@/components/express/UnitToggle";
import { lengthToCm, unitLabel, weightToKg, type UnitSystem } from "@/lib/express/units";
import { formatCad } from "@/lib/shipping/core/money";
import type { PriceBreakdown } from "@/lib/express/pricing";
import type { AdminAccountDTO } from "@/lib/express/accountDto";

interface SimResult {
  account: { id: string; type: string; status: string; name: string } | null;
  discountSource: string;
  service: { code: string; name: string; estimatedDelivery: string | null };
  pricing: PriceBreakdown;
}


function FormSection({ title, hint, action, children }: { title: string; hint?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-[#0B2545]">{title}</h2>
          {hint && <p className="text-[11px] text-slate-500 mt-0.5 max-w-sm">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function AdminExpressSimulatorPage() {
  const { language, tr } = useTr();
  const [accounts, setAccounts] = useState<AdminAccountDTO[]>([]);
  const [form, setForm] = useState({
    accountId: "",
    contentType: "goods" as "goods" | "documents",
    originCountry: "CA",
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
    pickup: false,
    override: "",
    markupKind: "none" as "none" | "flat" | "percent",
    markupValue: "",
  });
  const [units, setUnits] = useState<UnitSystem>("imperial");
  const documents = form.contentType === "documents";
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

    const declaredCents = documents ? 0 : dollarsToCents(form.declared);
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
        origin: { countryCode: form.originCountry, postalCode: form.originPostal, city: form.originCity },
        destination: { countryCode: form.country, postalCode: form.destPostal, city: form.destCity },
        parcels: [{ weightKg: weightToKg(num(form.weight), units), lengthCm: lengthToCm(num(form.length), units), widthCm: lengthToCm(num(form.width), units), heightCm: lengthToCm(num(form.height), units) }],
        contentType: form.contentType,
        declaredValueCents: declaredCents,
        isCustomsDeclarable: !documents,
        pickupRequested: form.pickup,
      },
      // "No discount": no account and a 0% client discount, so the client column shows DHL's public price.
      ...(form.accountId && form.accountId !== "none" ? { accountId: form.accountId } : {}),
      ...(form.accountId === "none" ? { discountPctOverride: 0 } : form.override.trim() !== "" ? { discountPctOverride: Number(form.override) } : {}),
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

  // The discount DHL gave Transimex on base freight, worked out from the two prices DHL returned.
  const dhlDiscountPct = result && result.pricing.publicList.baseFreightCents > 0
    ? Math.round((1 - result.pricing.account.baseFreightCents / result.pricing.publicList.baseFreightCents) * 10000) / 100
    : 0;

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
            <FormSection title={tr("1. Who is it priced for?", "1. Pour qui est le prix ?")} hint={tr("The account decides the client discount. \"No discount\" shows DHL's public price.", "Le compte détermine le rabais client. « Aucun rabais » montre le prix public DHL.")}>
              <select className={adminInput} value={form.accountId} onChange={set("accountId")} aria-label={tr("Account", "Compte")}>
                <option value="">{tr("B2C (global discount)", "B2C (rabais global)")}</option>
                <option value="none">{tr("No discount (DHL public price)", "Aucun rabais (prix public DHL)")}</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {(a.company?.name || a.contactName) + " · " + a.type.toUpperCase() + (a.discountPct != null ? ` · ${a.discountPct}%` : "")}
                  </option>
                ))}
              </select>
            </FormSection>

            <FormSection title={tr("2. What is being sent?", "2. Que envoie-t-on ?")} hint={tr("The same choice the client makes first. Documents use a different DHL product and need no customs details.", "Le même choix que fait le client en premier. Les documents utilisent un autre produit DHL et n'exigent aucune information douanière.")}>
              <div className="grid grid-cols-2 gap-2" role="radiogroup">
                {([
                  ["goods", tr("Goods", "Marchandises"), tr("Customs value and duties apply", "Valeur en douane et droits applicables")],
                  ["documents", tr("Documents", "Documents"), tr("Paper only, no commercial value", "Papier seulement, sans valeur commerciale")],
                ] as const).map(([value, title, desc]) => (
                  <label key={value} className={`flex gap-2.5 rounded-xl border p-3 cursor-pointer ${form.contentType === value ? "border-[#0B2545] bg-[#0B2545]/5" : "border-slate-200"}`}>
                    <input type="radio" name="contentType" className="mt-0.5 accent-[#0B2545]" checked={form.contentType === value} onChange={() => setForm((f) => ({ ...f, contentType: value }))} />
                    <span>
                      <span className="block text-xs font-bold text-slate-900">{title}</span>
                      <span className="block text-[11px] text-slate-500 mt-0.5">{desc}</span>
                    </span>
                  </label>
                ))}
              </div>
              {!documents && (
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-slate-700">{tr("Declared value (CAD)", "Valeur déclarée (CAD)")}</span>
                  <input className={adminInput} value={form.declared} onChange={set("declared")} inputMode="decimal" />
                </label>
              )}
            </FormSection>

            <FormSection title={tr("3. From and to", "3. D'où et vers où")} hint={tr("Any two countries DHL serves. Postal codes are optional where a country has none.", "Deux pays quelconques desservis par DHL. Le code postal est facultatif si le pays n'en a pas.")}>
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{tr("From (pickup)", "De (ramassage)")}</p>
                <CountrySelect className={adminInput} value={form.originCountry} onChange={(code) => setForm((f) => ({ ...f, originCountry: code }))} ariaLabel={tr("Origin country", "Pays d'origine")} />
                <div className="grid grid-cols-2 gap-3">
                  <input className={adminInput} value={form.originCity} onChange={set("originCity")} placeholder={tr("City", "Ville")} aria-label={tr("Origin city", "Ville d'origine")} />
                  <input className={adminInput} value={form.originPostal} onChange={set("originPostal")} placeholder={tr("Postal code", "Code postal")} aria-label={tr("Origin postal code", "Code postal d'origine")} />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{tr("To (delivery)", "Vers (livraison)")}</p>
                <CountrySelect className={adminInput} value={form.country} onChange={(code) => setForm((f) => ({ ...f, country: code }))} ariaLabel={tr("Destination country", "Pays de destination")} />
                <div className="grid grid-cols-2 gap-3">
                  <input className={adminInput} value={form.destCity} onChange={set("destCity")} placeholder={tr("City", "Ville")} aria-label={tr("Destination city", "Ville de destination")} />
                  <input className={adminInput} value={form.destPostal} onChange={set("destPostal")} placeholder={tr("Postal code", "Code postal")} aria-label={tr("Destination postal code", "Code postal de destination")} />
                </div>
              </div>
            </FormSection>

            <FormSection
              title={tr("4. The parcel", "4. Le colis")}
              hint={tr("DHL charges on the greater of actual and volumetric weight. Add one parcel here.", "DHL facture selon le plus élevé du poids réel et du poids volumétrique. Ajoutez un colis ici.")}
              action={<UnitToggle value={units} onChange={setUnits} />}
            >
              <div className="grid grid-cols-4 gap-3">
                {([["weight", tr("Weight (kg)", "Poids (kg)")], ["length", tr("Length (cm)", "Long. (cm)")], ["width", tr("Width (cm)", "Larg. (cm)")], ["height", tr("Height (cm)", "Haut. (cm)")]] as [keyof typeof form, string][]).map(([k, label]) => (
                  <label key={k} className="block space-y-1">
                    <span className="text-xs font-bold text-slate-700">{unitLabel(label, units)}</span>
                    <input className={adminInput} value={form[k] as string} onChange={set(k)} inputMode="decimal" />
                  </label>
                ))}
              </div>
            </FormSection>

            <FormSection title={tr("5. Pickup", "5. Ramassage")} hint={tr("How the client hands the parcel to DHL.", "Comment le client remet le colis à DHL.")}>
              <div className="grid grid-cols-2 gap-2" role="radiogroup">
                {([
                  [true, tr("DHL pickup", "Ramassage DHL")],
                  [false, tr("Drop-off at a DHL service point", "Dépôt à un point de service DHL")],
                ] as const).map(([value, title]) => (
                  <label key={String(value)} className={`flex gap-2.5 rounded-xl border p-3 cursor-pointer ${form.pickup === value ? "border-[#0B2545] bg-[#0B2545]/5" : "border-slate-200"}`}>
                    <input type="radio" name="pickup" className="mt-0.5 accent-[#0B2545]" checked={form.pickup === value} onChange={() => setForm((f) => ({ ...f, pickup: value }))} />
                    <span className="text-xs font-bold text-slate-900">{title}</span>
                  </label>
                ))}
              </div>
            </FormSection>

            <p className="pt-3 border-t border-slate-100 text-sm font-bold text-[#0B2545]">{tr("6. What-if (optional)", "6. Hypothèses (facultatif)")}</p>
            <div className="grid grid-cols-3 gap-3">
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
                      // What DHL charges Transimex, laid out like the DHL invoice: list price, discount, then what is billed.
                      [tr("DHL public price (base freight)", "Prix public DHL (fret de base)"), m(result.pricing.publicList.baseFreightCents)],
                      [
                        tr("DHL discount to Transimex", "Rabais de DHL à Transimex"),
                        `${dhlDiscountPct}% = −${m(result.pricing.publicList.baseFreightCents - result.pricing.account.baseFreightCents)}`,
                      ],
                      [tr("DHL charges Transimex (base freight)", "DHL facture à Transimex (fret de base)"), m(result.pricing.account.baseFreightCents)],
                      [tr("DHL charges Transimex (total with surcharges)", "DHL facture à Transimex (total avec suppléments)"), m(result.pricing.account.totalCents)],
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

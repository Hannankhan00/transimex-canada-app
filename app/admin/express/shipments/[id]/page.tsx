"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import PermissionGuard from "@/components/admin/PermissionGuard";
import { ExpressAdminTabs, ShipmentStatusBadge, formatDate, useTr } from "@/components/admin/express/expressAdminShared";
import { formatCad } from "@/lib/shipping/core/money";
import { COUNTRIES } from "@/lib/data/countries";
import type { toAdminShipmentDTO } from "@/lib/express/shipmentDto";
import type { toAdminQuoteDTO } from "@/lib/express/quoteDto";

type Shipment = ReturnType<typeof toAdminShipmentDTO>;
type Quote = ReturnType<typeof toAdminQuoteDTO>;

export default function AdminExpressShipmentPage() {
  const { id } = useParams<{ id: string }>();
  const { language, tr } = useTr();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/express/shipments/${id}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load shipment");
      setShipment(data.shipment);
      setQuote(data.quote);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const m = (c: number) => formatCad(c, language);
  const country = (code: string) => {
    const c = COUNTRIES.find((x) => x.code === code);
    return c ? (language === "fr" ? c.nameFr : c.name) : code;
  };

  const addr = (a: Shipment["shipper"]) => (
    <div className="text-sm text-slate-700 leading-relaxed">
      <p className="font-semibold text-slate-900">{a.name}</p>
      {a.company && <p>{a.company}</p>}
      <p>{a.line1}{a.line2 ? `, ${a.line2}` : ""}</p>
      <p>{a.city}{a.region ? `, ${a.region}` : ""} {a.postalCode}</p>
      <p>{country(a.countryCode)}</p>
      <p className="text-slate-500">{a.phone}{a.email ? ` · ${a.email}` : ""}</p>
    </div>
  );

  const body = () => {
    if (loading) return <div className="py-16 text-center text-xs text-slate-400">{tr("Loading...", "Chargement...")}</div>;
    if (error || !shipment) {
      return (
        <div className="py-16 text-center text-xs text-red-600 font-semibold">
          {error || tr("Not found", "Introuvable")}{" "}
          <button type="button" onClick={load} className="underline cursor-pointer">
            {tr("Retry", "Réessayer")}
          </button>
        </div>
      );
    }
    const p = quote?.pricing;

    return (
      <div className="grid lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 space-y-5">
          <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-mono font-bold text-[#0B2545]">{shipment.reference}</h2>
              <ShipmentStatusBadge status={shipment.status} />
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold uppercase">{shipment.accountType}</span>
            </div>
            <dl className="text-sm divide-y divide-slate-100">
              {[
                [tr("Client", "Client"), `${shipment.user.companyName || shipment.user.name} · ${shipment.user.email}`],
                [tr("Booked", "Réservé"), formatDate(shipment.createdAt, language)],
                [tr("Ship date", "Date d'expédition"), shipment.plannedShipDate],
                [tr("Pickup", "Ramassage"), shipment.pickupRequested ? tr("DHL pickup", "Ramassage DHL") : tr("Drop-off at DHL service point", "Dépôt à un point de service DHL")],
                [tr("Duties and taxes", "Droits et taxes"), shipment.dutiesPayer === "recipient" ? tr("Recipient pays on delivery", "Le destinataire paie à la livraison") : tr("Sender pays", "L'expéditeur paie")],
                [tr("Parcels", "Colis"), shipment.parcels.map((x) => `${x.weightKg} kg · ${x.lengthCm}×${x.widthCm}×${x.heightCm} cm`).join("  |  ")],
                [tr("Declared value", "Valeur déclarée"), m(shipment.declaredValueCents)],
                [tr("Terms accepted", "Conditions acceptées"), shipment.termsVersion],
                [tr("Tracking", "Suivi"), shipment.trackingNumber || "—"],
              ].map(([k, v]) => (
                <div key={k} className="py-2 grid sm:grid-cols-3 gap-1">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="sm:col-span-2 font-semibold text-slate-800 break-words">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <div className="grid md:grid-cols-2 gap-5">
            <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
              <h2 className="font-bold text-[#0B2545] text-sm">{tr("Sender", "Expéditeur")}</h2>
              {addr(shipment.shipper)}
            </section>
            <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
              <h2 className="font-bold text-[#0B2545] text-sm">{tr("Recipient", "Destinataire")}</h2>
              {addr(shipment.recipient)}
            </section>
          </div>

          <section className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-bold text-[#0B2545] text-sm mb-3">{tr("Customs items", "Articles douaniers")}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-100">
                    <th className="text-left py-2 pr-3 font-bold">{tr("Description", "Description")}</th>
                    <th className="text-left py-2 pr-3 font-bold">HS</th>
                    <th className="text-right py-2 pr-3 font-bold">{tr("Qty", "Qté")}</th>
                    <th className="text-right py-2 pr-3 font-bold">{tr("Unit value", "Valeur unitaire")}</th>
                    <th className="text-left py-2 pr-3 font-bold">{tr("Origin", "Origine")}</th>
                    <th className="text-left py-2 font-bold">{tr("Reason", "Motif")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shipment.items.map((i, idx) => (
                    <tr key={idx}>
                      <td className="py-2 pr-3">{i.description}</td>
                      <td className="py-2 pr-3 font-mono text-xs">{i.hsCode}</td>
                      <td className="py-2 pr-3 text-right">{i.quantity}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{m(i.unitValueCents)}</td>
                      <td className="py-2 pr-3">{i.countryOfOrigin}</td>
                      <td className="py-2">{i.exportReason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="lg:col-span-2 space-y-5">
          {p && (
            <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <h2 className="font-bold text-[#0B2545] text-sm">
                {tr("Price breakdown", "Détail du prix")} <span className="ml-1 px-1.5 py-0.5 rounded bg-slate-900 text-white text-[9px] uppercase tracking-wide">{tr("staff only", "personnel seulement")}</span>
              </h2>
              {p.belowCost && (
                <p role="alert" className="flex gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {tr("Below cost", "Sous le coût")}
                </p>
              )}
              <dl className="text-sm divide-y divide-slate-100">
                {(
                  [
                    [tr("DHL account rate", "Tarif de compte DHL"), m(p.account.totalCents)],
                    [tr("DHL public price", "Prix public DHL"), m(p.publicList.totalCents)],
                    [tr("Public price source", "Source du prix public"), p.publicSource === "carrier" ? tr("DHL", "DHL") : tr(`Rebuilt (contract discount ${p.dhlContractDiscountPct}%)`, `Reconstruit (rabais du contrat ${p.dhlContractDiscountPct} %)`)],
                    [tr("Client discount", "Rabais client"), `${p.clientDiscountPct}% = −${m(p.discountCents)}`],
                    ...(p.pickupFeeCents > 0 ? [[tr("Pickup fee", "Frais de ramassage"), m(p.pickupFeeCents)] as [string, string]] : []),
                    [tr("Client paid / pays", "Prix client"), m(p.client.totalCents)],
                    [tr("Profit", "Profit"), m(p.profitCents)],
                  ] as [string, string][]
                ).map(([k, v]) => (
                  <div key={k} className="py-2 flex justify-between gap-3">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className={`font-semibold text-right ${k === tr("Profit", "Profit") ? (p.profitCents < 0 ? "text-red-600" : "text-emerald-700") : "text-slate-800"}`}>{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <section className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-bold text-[#0B2545] text-sm mb-2">{tr("History", "Historique")}</h2>
            <ul className="text-xs divide-y divide-slate-100">
              {[...shipment.statusHistory].reverse().map((h, i) => (
                <li key={i} className="py-2 flex justify-between gap-3">
                  <ShipmentStatusBadge status={h.status} />
                  <span className="text-slate-500">{formatDate(h.at, language)}</span>
                </li>
              ))}
            </ul>
          </section>
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
        <Link href="/admin/express/shipments" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900">
          <ArrowLeft className="w-3.5 h-3.5" />
          {tr("Back to shipments", "Retour aux envois")}
        </Link>
        {body()}
      </div>
    </PermissionGuard>
  );
}

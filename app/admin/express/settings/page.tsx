"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import PermissionGuard from "@/components/admin/PermissionGuard";
import { ExpressAdminTabs, adminInput, dollarsToCents, formatDate, useTr } from "@/components/admin/express/expressAdminShared";

interface HistoryRow {
  id: string;
  oldPct: number | null;
  newPct: number;
  changedByName: string;
  createdAt: string;
}

interface SettingsView {
  b2cDiscountPct: number;
  dhlContractDiscountPct: number | null;
  pickupFeeCents: number;
  history: HistoryRow[];
}

export default function AdminExpressSettingsPage() {
  const { language, tr } = useTr();
  const [b2c, setB2c] = useState("");
  const [contract, setContract] = useState("");
  const [pickup, setPickup] = useState("");
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const apply = (s: SettingsView) => {
    setB2c(String(s.b2cDiscountPct));
    setContract(s.dhlContractDiscountPct != null ? String(s.dhlContractDiscountPct) : "");
    setPickup(String(s.pickupFeeCents / 100));
    setHistory(s.history);
  };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/express/settings");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load settings");
      apply(data.settings);
    } catch (err: any) {
      setMessage({ text: err.message, error: true });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const b2cPct = Number(b2c);
    if (b2c.trim() === "" || !Number.isFinite(b2cPct) || b2cPct < 0 || b2cPct > 100) {
      setMessage({ text: tr("Enter a B2C discount between 0 and 100.", "Entrez un rabais B2C entre 0 et 100."), error: true });
      return;
    }
    let contractPct: number | null = null;
    if (contract.trim() !== "") {
      contractPct = Number(contract);
      if (!Number.isFinite(contractPct) || contractPct < 0 || contractPct >= 100) {
        setMessage({ text: tr("The DHL contract discount must be at least 0 and below 100.", "Le rabais du contrat DHL doit être d'au moins 0 et inférieur à 100."), error: true });
        return;
      }
    }
    const pickupCents = pickup.trim() === "" ? 0 : dollarsToCents(pickup);
    if (pickupCents == null || pickupCents < 0 || pickupCents > 100000) {
      setMessage({ text: tr("Enter a pickup fee between $0 and $1,000.", "Entrez des frais de ramassage entre 0 $ et 1 000 $."), error: true });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/express/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ b2cDiscountPct: b2cPct, dhlContractDiscountPct: contractPct, pickupFeeCents: pickupCents }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = Array.isArray(data.fields) ? data.fields.map((f: { message: string }) => f.message).join(", ") : "";
        throw new Error([data.error, detail].filter(Boolean).join(": ") || "Save failed");
      }
      apply(data.settings);
      setMessage({ text: tr("Saved. New quotes use these settings; saved quotes are unchanged.", "Enregistré. Les nouvelles soumissions utilisent ces paramètres; les soumissions enregistrées ne changent pas.") });
    } catch (err: any) {
      setMessage({ text: err.message, error: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <PermissionGuard module="express">
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0B2545]">Transimex Express</h1>
          <p className="text-sm text-slate-600 mt-0.5">{tr("Settings that apply to every Express account.", "Paramètres qui s'appliquent à tous les comptes Express.")}</p>
        </div>

        <ExpressAdminTabs />

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">{tr("Loading...", "Chargement...")}</div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-5 max-w-4xl">
            <form onSubmit={save} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5" noValidate>
              <div className="space-y-2">
                <h2 className="font-bold text-[#0B2545] text-sm">{tr("B2C discount", "Rabais B2C")}</h2>
                <p className="text-xs text-slate-500">
                  {tr(
                    "One discount for every B2C account, taken off base freight only. Surcharges pass through at DHL's amount. Changing it affects new quotes only.",
                    "Un seul rabais pour tous les comptes B2C, appliqué au fret de base seulement. Les surcharges sont transmises au montant de DHL. Le changement n'affecte que les nouvelles soumissions."
                  )}
                </p>
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-slate-700">{tr("Discount on base freight (%)", "Rabais sur le fret de base (%)")}</span>
                  <input className={adminInput} value={b2c} onChange={(e) => setB2c(e.target.value)} inputMode="decimal" />
                </label>
              </div>

              <div className="space-y-2 pt-4 border-t border-slate-100">
                <h2 className="font-bold text-[#0B2545] text-sm">
                  {tr("DHL contract discount", "Rabais du contrat DHL")} <span className="ml-1 px-1.5 py-0.5 rounded bg-slate-900 text-white text-[9px] uppercase tracking-wide">{tr("staff only", "personnel seulement")}</span>
                </h2>
                <p className="text-xs text-slate-500">
                  {tr(
                    "Your discount from DHL on base freight. Used only when DHL's API returns our account rate and no public price: public base freight = account base freight ÷ (1 − discount). Never shown to clients. Leave empty until you have the figure from the DHL contract.",
                    "Votre rabais DHL sur le fret de base. Utilisé seulement lorsque l'API de DHL retourne notre tarif de compte sans prix public : fret de base public = fret de base du compte ÷ (1 − rabais). Jamais montré aux clients. Laissez vide jusqu'à ce que vous ayez le chiffre du contrat DHL."
                  )}
                </p>
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-slate-700">{tr("Contract discount (%)", "Rabais du contrat (%)")}</span>
                  <input className={adminInput} value={contract} onChange={(e) => setContract(e.target.value)} inputMode="decimal" placeholder={tr("not set", "non défini")} />
                </label>
              </div>

              <div className="space-y-2 pt-4 border-t border-slate-100">
                <h2 className="font-bold text-[#0B2545] text-sm">{tr("DHL pickup fee", "Frais de ramassage DHL")}</h2>
                <p className="text-xs text-slate-500">
                  {tr(
                    "Flat fee added to a quote when the client chooses DHL pickup. Never discounted. Set it from the DHL contract; 0 means no fee.",
                    "Frais fixes ajoutés à une soumission lorsque le client choisit le ramassage DHL. Jamais rabaissés. À fixer selon le contrat DHL; 0 signifie aucuns frais."
                  )}
                </p>
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-slate-700">{tr("Pickup fee (CAD)", "Frais de ramassage (CAD)")}</span>
                  <input className={adminInput} value={pickup} onChange={(e) => setPickup(e.target.value)} inputMode="decimal" />
                </label>
              </div>

              {message && (
                <p role="status" className={`text-xs font-semibold ${message.error ? "text-red-600" : "text-emerald-700"}`}>
                  {message.text}
                </p>
              )}
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0B2545] hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-bold cursor-pointer"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {tr("Save settings", "Enregistrer les paramètres")}
              </button>
            </form>

            <section className="bg-white rounded-2xl border border-slate-200 p-5 self-start">
              <h2 className="font-bold text-[#0B2545] text-sm mb-2">{tr("B2C discount history", "Historique du rabais B2C")}</h2>
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
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}

"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import PermissionGuard from "@/components/admin/PermissionGuard";
import { ExpressAdminTabs, adminInput, formatDate, useTr } from "@/components/admin/express/expressAdminShared";

interface HistoryRow {
  id: string;
  oldPct: number | null;
  newPct: number;
  changedByName: string;
  createdAt: string;
}

export default function AdminExpressSettingsPage() {
  const { language, tr } = useTr();
  const [current, setCurrent] = useState<number | null>(null);
  const [value, setValue] = useState("");
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const apply = (settings: { b2cDiscountPct: number; history: HistoryRow[] }) => {
    setCurrent(settings.b2cDiscountPct);
    setValue(String(settings.b2cDiscountPct));
    setHistory(settings.history);
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
    const pct = Number(value);
    if (value.trim() === "" || !Number.isFinite(pct) || pct < 0 || pct > 100) {
      setMessage({ text: tr("Enter a discount between 0 and 100.", "Entrez un rabais entre 0 et 100."), error: true });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/express/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ b2cDiscountPct: pct }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = Array.isArray(data.fields) ? data.fields.map((f: { message: string }) => f.message).join(", ") : "";
        throw new Error([data.error, detail].filter(Boolean).join(": ") || "Save failed");
      }
      apply(data.settings);
      setMessage({ text: tr("Saved. New quotes use this discount; saved quotes are unchanged.", "Enregistré. Les nouvelles soumissions utilisent ce rabais; les soumissions enregistrées ne changent pas.") });
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
            <form onSubmit={save} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4" noValidate>
              <div>
                <h2 className="font-bold text-[#0B2545] text-sm">{tr("B2C discount", "Rabais B2C")}</h2>
                <p className="text-xs text-slate-500 mt-1">
                  {tr(
                    "One discount for every B2C account, taken off base freight only. Surcharges pass through at DHL's amount. Changing it affects new quotes only.",
                    "Un seul rabais pour tous les comptes B2C, appliqué au fret de base seulement. Les surcharges sont transmises au montant de DHL. Le changement n'affecte que les nouvelles soumissions."
                  )}
                </p>
              </div>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-700">{tr("Discount on base freight (%)", "Rabais sur le fret de base (%)")}</span>
                <input className={adminInput} value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" />
              </label>
              {current != null && (
                <p className="text-[11px] text-slate-500">
                  {tr("Current", "Actuel")}: <b>{current}%</b>
                </p>
              )}
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
                {tr("Save discount", "Enregistrer le rabais")}
              </button>
            </form>

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
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}

"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Upload } from "lucide-react";
import PermissionGuard from "@/components/admin/PermissionGuard";
import { ExpressAdminTabs, adminInput, dollarsToCents, useTr } from "@/components/admin/express/expressAdminShared";
import { formatCad } from "@/lib/shipping/core/money";

interface DhlInvoice {
  id: string;
  number: string;
  totalCents: number;
  issuedOn: string | null;
  status: "unpaid" | "paid";
  paidAt: string | null;
  note: string;
  linkedCount: number;
  linkedCents: number;
}

interface Preview {
  applied: boolean;
  matched: { waybill: string; chargeCents: number; reference: string; previousCents: number | null }[];
  unmatched: { waybill: string; chargeCents: number }[];
  skipped: number;
  matchedCents: number;
  unmatchedCents: number;
}

export default function AdminExpressDhlInvoicesPage() {
  const { language, tr } = useTr();
  const m = (c: number) => formatCad(c, language);
  const [invoices, setInvoices] = useState<DhlInvoice[]>([]);
  const [unpaidCents, setUnpaidCents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState("");
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);

  const [form, setForm] = useState({ number: "", total: "", issuedOn: "", note: "" });
  const [importNumber, setImportNumber] = useState("");
  const [csv, setCsv] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);

  const flash = useCallback((text: string, isError = false) => {
    setToast({ text, error: isError });
    setTimeout(() => setToast(null), 5000);
  }, []);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/admin/express/dhl-invoices");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load DHL invoices");
      setInvoices(data.invoices);
      setUnpaidCents(data.unpaidCents);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const call = async (name: string, request: () => Promise<Response>, done: (data: any) => void) => {
    setBusy(name);
    try {
      const res = await request();
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) throw new Error(data.error || "Action failed");
      done(data);
    } catch (err: any) {
      flash(err.message, true);
    } finally {
      setBusy("");
    }
  };

  const json = (method: string, body: unknown) => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  const addInvoice = () => {
    const cents = dollarsToCents(form.total);
    if (!form.number.trim() || cents === null) return flash(tr("Enter the invoice number and total", "Entrez le numéro et le total de la facture"), true);
    return call("add", () => fetch("/api/admin/express/dhl-invoices", json("POST", { number: form.number, total: cents / 100, issuedOn: form.issuedOn, note: form.note })), () => {
      setForm({ number: "", total: "", issuedOn: "", note: "" });
      flash(tr("DHL invoice recorded", "Facture DHL enregistrée"));
      load();
    });
  };

  const setStatus = (inv: DhlInvoice, status: "paid" | "unpaid") =>
    call("status-" + inv.id, () => fetch(`/api/admin/express/dhl-invoices/${inv.id}`, json("PATCH", { status })), () => load());

  const runImport = (apply: boolean) =>
    call("import", () => fetch("/api/admin/express/dhl-invoices/import", json("POST", { csv, invoiceNumber: importNumber, apply })), (data) => {
      setPreview(data);
      if (data.applied) flash(tr(`${data.matched.length} DHL charges saved`, `${data.matched.length} coûts DHL enregistrés`));
      if (data.applied) load();
    });

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    setCsv(await file.text());
    setPreview(null);
  };

  return (
    <PermissionGuard module="express">
      <div className="max-w-5xl mx-auto space-y-6 px-4 py-6 sm:px-6">
        <ExpressAdminTabs />
        <div>
          <h1 className="text-xl font-extrabold text-[#0B2545]">{tr("DHL invoices", "Factures DHL")}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {tr(
              "Bills DHL sends to Transimex. Record each one, import its charges per shipment, and mark it paid. Real charges replace the quoted rate in the",
              "Les factures que DHL envoie à Transimex. Enregistrez chacune, importez ses coûts par envoi et marquez-la payée. Les coûts réels remplacent le tarif soumis dans le"
            )}{" "}
            <Link href="/admin/express/reports" className="font-bold text-[#0B2545] underline">
              {tr("profit report", "rapport de profit")}
            </Link>
            .
          </p>
        </div>

        {toast && (
          <p role="status" className={`rounded-xl border px-3 py-2 text-sm font-semibold ${toast.error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
            {toast.text}
          </p>
        )}
        {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
          <h2 className="text-sm font-bold text-[#0B2545]">{tr("Record a DHL invoice", "Enregistrer une facture DHL")}</h2>
          <div className="flex flex-wrap items-end gap-3">
            <label className="space-y-1">
              <span className="block text-xs font-bold text-slate-600">{tr("DHL invoice number", "Numéro de facture DHL")}</span>
              <input className={`${adminInput} !w-48`} value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
            </label>
            <label className="space-y-1">
              <span className="block text-xs font-bold text-slate-600">{tr("Total (CAD)", "Total (CAD)")}</span>
              <input className={`${adminInput} !w-32`} inputMode="decimal" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} placeholder="0.00" />
            </label>
            <label className="space-y-1">
              <span className="block text-xs font-bold text-slate-600">{tr("Invoice date", "Date de la facture")}</span>
              <input type="date" className={`${adminInput} !w-40`} value={form.issuedOn} onChange={(e) => setForm({ ...form, issuedOn: e.target.value })} />
            </label>
            <button type="button" disabled={busy !== ""} onClick={addInvoice} className="cursor-pointer rounded-lg bg-[#0B2545] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
              {tr("Add", "Ajouter")}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
            <h2 className="text-sm font-bold text-[#0B2545]">{tr("Invoices", "Factures")}</h2>
            <span className="text-xs font-semibold text-slate-600">
              {tr("Still to pay DHL", "Reste à payer à DHL")}: <span className="font-extrabold tabular-nums text-[#0B2545]">{m(unpaidCents)}</span>
            </span>
          </div>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            </div>
          ) : invoices.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">{tr("No DHL invoices recorded yet.", "Aucune facture DHL enregistrée.")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-5 py-2 text-left font-bold">{tr("Invoice", "Facture")}</th>
                    <th className="px-3 py-2 text-right font-bold">{tr("Total", "Total")}</th>
                    <th className="px-3 py-2 text-right font-bold">{tr("Matched to shipments", "Associé aux envois")}</th>
                    <th className="px-5 py-2 text-right font-bold">{tr("Status", "Statut")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td className="px-5 py-2.5">
                        <span className="font-mono font-bold text-[#0B2545]">{inv.number}</span>
                        {inv.issuedOn && <span className="ml-2 text-slate-500">{new Date(inv.issuedOn).toISOString().slice(0, 10)}</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-semibold">{m(inv.totalCents)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">
                        {inv.linkedCount} · {m(inv.linkedCents)}
                        {inv.linkedCount > 0 && inv.linkedCents !== inv.totalCents && <span className="ml-1.5 text-[10px] font-bold text-amber-600">{tr("differs from total", "diffère du total")}</span>}
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        {inv.status === "paid" ? (
                          <button type="button" onClick={() => setStatus(inv, "unpaid")} disabled={busy !== ""} className="cursor-pointer rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-bold text-emerald-700">
                            {tr("Paid", "Payée")}
                          </button>
                        ) : (
                          <button type="button" onClick={() => setStatus(inv, "paid")} disabled={busy !== ""} className="cursor-pointer rounded-lg border border-slate-300 px-2.5 py-1 font-bold text-slate-700 hover:bg-slate-50">
                            {tr("Mark paid", "Marquer payée")}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
          <h2 className="text-sm font-bold text-[#0B2545]">{tr("Import charges from a DHL invoice file", "Importer les coûts d'un fichier de facture DHL")}</h2>
          <p className="text-xs text-slate-600">
            {tr(
              "Choose the CSV detail file from DHL (MyBill). It needs a waybill column and an amount column. You see the matches first and nothing is saved until you confirm.",
              "Choisissez le fichier CSV détaillé de DHL (MyBill). Il doit avoir une colonne de lettre de transport et une colonne de montant. Vous voyez d'abord les correspondances et rien n'est enregistré avant votre confirmation."
            )}
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="space-y-1">
              <span className="block text-xs font-bold text-slate-600">{tr("DHL invoice number", "Numéro de facture DHL")}</span>
              <input className={`${adminInput} !w-48`} value={importNumber} onChange={(e) => setImportNumber(e.target.value)} />
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
              <Upload className="h-3.5 w-3.5" />
              {csv ? tr("File loaded", "Fichier chargé") : tr("Choose CSV file", "Choisir un fichier CSV")}
              <input type="file" accept=".csv,text/csv,text/plain" className="sr-only" onChange={(e) => readFile(e.target.files?.[0])} />
            </label>
            <button type="button" disabled={busy !== "" || !csv || !importNumber.trim()} onClick={() => runImport(false)} className="cursor-pointer rounded-lg bg-[#0B2545] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
              {tr("Preview", "Aperçu")}
            </button>
          </div>

          {preview && (
            <div className="space-y-3 text-xs">
              <p className="font-semibold text-slate-700">
                {tr(
                  `${preview.matched.length} shipment(s) matched (${m(preview.matchedCents)}), ${preview.unmatched.length} waybill(s) not found (${m(preview.unmatchedCents)}), ${preview.skipped} row(s) skipped.`,
                  `${preview.matched.length} envoi(s) associé(s) (${m(preview.matchedCents)}), ${preview.unmatched.length} lettre(s) de transport introuvable(s) (${m(preview.unmatchedCents)}), ${preview.skipped} ligne(s) ignorée(s).`
                )}
              </p>
              {preview.matched.length > 0 && (
                <div className="max-h-60 overflow-auto rounded-xl border border-slate-200">
                  <table className="w-full">
                    <tbody className="divide-y divide-slate-100">
                      {preview.matched.map((r) => (
                        <tr key={r.waybill}>
                          <td className="px-3 py-1.5 font-mono font-bold text-[#0B2545]">{r.reference}</td>
                          <td className="px-3 py-1.5 font-mono text-slate-500">{r.waybill}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums font-semibold">{m(r.chargeCents)}</td>
                          <td className="px-3 py-1.5 text-right text-slate-500">{r.previousCents !== null ? tr(`was ${m(r.previousCents)}`, `était ${m(r.previousCents)}`) : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {preview.unmatched.length > 0 && (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 font-semibold text-amber-800">
                  {tr("Not found among our bookings (shipped outside this app, or still being booked): ", "Introuvables parmi nos réservations (expédiés hors de cette application, ou en cours de réservation) : ")}
                  {preview.unmatched.slice(0, 8).map((u) => u.waybill).join(", ")}
                  {preview.unmatched.length > 8 ? "…" : ""}
                </p>
              )}
              {!preview.applied && preview.matched.length > 0 && (
                <button type="button" disabled={busy !== ""} onClick={() => runImport(true)} className="cursor-pointer rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
                  {tr(`Save ${preview.matched.length} DHL charges`, `Enregistrer ${preview.matched.length} coûts DHL`)}
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </PermissionGuard>
  );
}

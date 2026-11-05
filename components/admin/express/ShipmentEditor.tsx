"use client";

import React, { useMemo, useState } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { adminInput, useTr } from "@/components/admin/express/expressAdminShared";
import { COUNTRIES } from "@/lib/data/countries";
import type { toAdminShipmentDTO } from "@/lib/express/shipmentDto";

type Shipment = ReturnType<typeof toAdminShipmentDTO>;

interface Props {
  shipment: Shipment;
  onClose: () => void;
  /** Called after a successful save with a message to show. The page reloads the booking. */
  onSaved: (message: string) => void;
}

type AddressForm = { name: string; company: string; line1: string; line2: string; city: string; region: string; postalCode: string; phone: string; email: string };
const toAddress = (a: Shipment["shipper"]): AddressForm => ({
  name: a.name, company: a.company, line1: a.line1, line2: a.line2, city: a.city, region: a.region, postalCode: a.postalCode, phone: a.phone, email: a.email,
});

/** Weekdays from today (UTC, like the server) up to 60 days out. The current date is kept in the list even if it has passed. */
function dateChoices(current: string): string[] {
  const days: string[] = [];
  const d = new Date();
  const last = Date.now() + 60 * 86_400_000;
  while (d.getTime() <= last) {
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) days.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return current && !days.includes(current) ? [current, ...days] : days;
}

function Field({ label, error, children, wide }: { label: string; error?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`block space-y-1 ${wide ? "sm:col-span-2" : ""}`}>
      <span className="block text-xs font-bold text-slate-700">{label}</span>
      {children}
      {error && <span className="block text-[11px] font-semibold text-red-600">{error}</span>}
    </label>
  );
}

export default function ShipmentEditor({ shipment, onClose, onSaved }: Props) {
  const { language, tr } = useTr();
  const documents = shipment.contentType === "documents";
  const [shipper, setShipper] = useState<AddressForm>(toAddress(shipment.shipper));
  const [recipient, setRecipient] = useState<AddressForm>(toAddress(shipment.recipient));
  const [pickup, setPickup] = useState(shipment.pickupRequested);
  const [shipDate, setShipDate] = useState(shipment.plannedShipDate);
  const [duties, setDuties] = useState<"recipient" | "sender">(shipment.dutiesPayer);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const dates = useMemo(() => dateChoices(shipment.plannedShipDate), [shipment.plannedShipDate]);
  const dateText = (d: string) => new Intl.DateTimeFormat(language === "fr" ? "fr-CA" : "en-CA", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
  const countryName = (code: string) => {
    const c = COUNTRIES.find((x) => x.code === code);
    return c ? (language === "fr" ? c.nameFr : c.name) : code;
  };
  const err = (path: string) => errors[path];

  const save = async () => {
    setError("");
    setErrors({});
    const body = {
      shipper,
      recipient,
      pickupRequested: pickup,
      plannedShipDate: shipDate,
      dutiesPayer: duties,
      reason,
    };
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/express/shipments/${shipment.id}/edit`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (Array.isArray(data.fields)) setErrors(Object.fromEntries((data.fields as { path: string; message: string }[]).map((f) => [f.path, f.message])));
        setError(data.error || tr("Could not save the changes.", "Impossible d'enregistrer les modifications."));
        return;
      }
      onSaved(data.warning || tr("Changes saved and recorded in the audit log.", "Modifications enregistrées et consignées dans le journal d'audit."));
    } catch {
      setError(tr("Could not reach the server. Try again.", "Impossible de joindre le serveur. Réessayez."));
    } finally {
      setSaving(false);
    }
  };

  const addressBlock = (title: string, value: AddressForm, set: (a: AddressForm) => void, prefix: "shipper" | "recipient", code: string, emailRequired: boolean) => {
    const up = (k: keyof AddressForm) => (e: React.ChangeEvent<HTMLInputElement>) => set({ ...value, [k]: e.target.value });
    return (
      <section className="space-y-3 rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-[#0B2545]">{title}</h3>
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600" title={tr("The country cannot be changed: it sets the DHL service and the price.", "Le pays ne peut pas être modifié : il détermine le service DHL et le prix.")}>
            {countryName(code)}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={tr("Full name", "Nom complet")} error={err(`${prefix}.name`)}><input className={adminInput} value={value.name} onChange={up("name")} /></Field>
          <Field label={tr("Company", "Entreprise")} error={err(`${prefix}.company`)}><input className={adminInput} value={value.company} onChange={up("company")} /></Field>
          <Field label={tr("Address line 1", "Adresse ligne 1")} error={err(`${prefix}.line1`)}><input className={adminInput} value={value.line1} onChange={up("line1")} /></Field>
          <Field label={tr("Address line 2", "Adresse ligne 2")} error={err(`${prefix}.line2`)}><input className={adminInput} value={value.line2} onChange={up("line2")} /></Field>
          <Field label={tr("City", "Ville")} error={err(`${prefix}.city`)}><input className={adminInput} value={value.city} onChange={up("city")} /></Field>
          <Field label={tr("Province / state", "Province / État")} error={err(`${prefix}.region`)}><input className={adminInput} value={value.region} onChange={up("region")} /></Field>
          <Field label={tr("Postal code", "Code postal")} error={err(`${prefix}.postalCode`)}><input className={adminInput} value={value.postalCode} onChange={up("postalCode")} /></Field>
          <Field label={tr("Phone", "Téléphone")} error={err(`${prefix}.phone`)}><input className={adminInput} value={value.phone} onChange={up("phone")} /></Field>
          <Field label={emailRequired ? tr("Email", "Courriel") : tr("Email (optional)", "Courriel (facultatif)")} error={err(`${prefix}.email`)} wide><input className={adminInput} type="email" value={value.email} onChange={up("email")} /></Field>
        </div>
      </section>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center overflow-y-auto bg-slate-900/60 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={tr("Edit shipment", "Modifier l'envoi")}>
      <div className="flex max-h-[96vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[92vh] sm:rounded-2xl">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-extrabold text-[#0B2545]">{tr("Edit shipment", "Modifier l'envoi")} <span className="font-mono text-base">{shipment.reference}</span></h2>
            <p className="mt-0.5 text-xs text-slate-500">{tr("Every change is saved with your name, the date and your reason.", "Chaque modification est enregistrée avec votre nom, la date et votre motif.")}</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label={tr("Close", "Fermer")} className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <span>
              {tr(
                "The price the client paid does not change. Countries, weights, parcels and items cannot be edited here: that needs a new booking. The client is emailed about the change. After saving, use Retry label to book with DHL.",
                "Le prix payé par le client ne change pas. Les pays, les poids, les colis et les articles ne peuvent pas être modifiés ici : il faut une nouvelle réservation. Le client est informé par courriel. Après l'enregistrement, utilisez Réessayer l'étiquette pour réserver auprès de DHL."
              )}
            </span>
          </p>

          <div className="grid gap-4 lg:grid-cols-2">
            {addressBlock(tr("Sender (pickup address)", "Expéditeur (adresse de ramassage)"), shipper, setShipper, "shipper", shipment.shipper.countryCode, true)}
            {addressBlock(tr("Recipient (delivery address)", "Destinataire (adresse de livraison)"), recipient, setRecipient, "recipient", shipment.recipient.countryCode, false)}
          </div>

          <section className="grid gap-4 rounded-xl border border-slate-200 p-4 sm:grid-cols-2">
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-[#0B2545]">{tr("Pickup or drop-off", "Ramassage ou dépôt")}</h3>
              {[
                { v: true, label: tr("DHL pickup (a driver collects)", "Ramassage DHL (un chauffeur passe)") },
                { v: false, label: tr("Drop-off at a DHL service point", "Dépôt à un point de service DHL") },
              ].map((o) => (
                <label key={String(o.v)} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${pickup === o.v ? "border-[#0B2545] bg-[#0B2545]/5 font-semibold" : "border-slate-200"}`}>
                  <input type="radio" name="edit-pickup" checked={pickup === o.v} onChange={() => setPickup(o.v)} className="accent-[#0B2545]" />
                  {o.label}
                </label>
              ))}
            </div>
            <div className="space-y-3">
              <Field label={tr("Shipping date", "Date d'expédition")} error={err("plannedShipDate")}>
                <select className={adminInput} value={shipDate} onChange={(e) => setShipDate(e.target.value)}>
                  {dates.map((d) => <option key={d} value={d}>{dateText(d)}{d === shipment.plannedShipDate ? ` (${tr("current", "actuelle")})` : ""}</option>)}
                </select>
              </Field>
              {!documents && (
                <Field label={tr("Duties and taxes paid by", "Droits et taxes payés par")}>
                  <select className={adminInput} value={duties} onChange={(e) => setDuties(e.target.value as "recipient" | "sender")}>
                    <option value="recipient">{tr("Recipient, on delivery", "Le destinataire, à la livraison")}</option>
                    <option value="sender">{tr("Sender", "L'expéditeur")}</option>
                  </select>
                </Field>
              )}
            </div>
          </section>

          <section className="space-y-2 rounded-xl border border-slate-200 p-4">
            <Field label={tr("Why are you making this change? (saved in the audit log)", "Pourquoi cette modification? (consigné dans le journal d'audit)")} error={err("reason")}>
              <textarea className={adminInput} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder={tr("e.g. Client called: wrong street number. Confirmed with DHL.", "p. ex. Le client a appelé : mauvais numéro civique. Confirmé avec DHL.")} />
            </Field>
          </section>
        </div>

        <div className="shrink-0 space-y-2 border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
          {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={onClose} disabled={saving} className="cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700">
              {tr("Cancel", "Annuler")}
            </button>
            <button type="button" onClick={save} disabled={saving} className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#0B2545] px-5 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? tr("Saving...", "Enregistrement...") : tr("Save changes", "Enregistrer les modifications")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

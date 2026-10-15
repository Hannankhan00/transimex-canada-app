"use client";

import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { adminInput, dollarsToCents, useTr } from "./expressAdminShared";

export interface B2bTerms {
  discountPct: number | null;
  billingModes: ("pay_at_booking" | "invoice")[];
  creditLimitCents: number | null;
  paymentTermsDays: number | null;
}

interface Props {
  initial: B2bTerms;
  /** How the applicant said they would like to pay, shown as a hint beside the billing choices. */
  paymentPreference?: "pay_at_booking" | "weekly_invoice";
  submitLabel: string;
  busy: boolean;
  onSubmit: (terms: {
    discountPct: number;
    billingModes: ("pay_at_booking" | "invoice")[];
    creditLimitCents: number | null;
    paymentTermsDays: number | null;
  }) => void;
}

/** Discount, billing mode, credit limit and payment terms for a B2B account. */
export default function B2bTermsForm({ initial, paymentPreference, submitLabel, busy, onSubmit }: Props) {
  const { tr } = useTr();
  const [discount, setDiscount] = useState(initial.discountPct != null ? String(initial.discountPct) : "");
  const [payAtBooking, setPayAtBooking] = useState(
    initial.billingModes.length === 0 ? true : initial.billingModes.includes("pay_at_booking")
  );
  const [invoice, setInvoice] = useState(initial.billingModes.includes("invoice"));
  const [creditLimit, setCreditLimit] = useState(
    initial.creditLimitCents != null ? String(initial.creditLimitCents / 100) : ""
  );
  const [terms, setTerms] = useState(initial.paymentTermsDays != null ? String(initial.paymentTermsDays) : "");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const discountPct = Number(discount);
    if (discount.trim() === "" || !Number.isFinite(discountPct) || discountPct < 0 || discountPct > 100) {
      setError(tr("Enter a discount between 0 and 100.", "Entrez un rabais entre 0 et 100."));
      return;
    }
    const billingModes: ("pay_at_booking" | "invoice")[] = [];
    if (payAtBooking) billingModes.push("pay_at_booking");
    if (invoice) billingModes.push("invoice");
    if (billingModes.length === 0) {
      setError(tr("Choose at least one billing mode.", "Choisissez au moins un mode de facturation."));
      return;
    }

    let creditLimitCents: number | null = null;
    let paymentTermsDays: number | null = null;
    if (invoice) {
      creditLimitCents = dollarsToCents(creditLimit);
      paymentTermsDays = terms.trim() === "" ? null : Number(terms);
      if (!creditLimitCents || creditLimitCents <= 0) {
        setError(tr("Enter a credit limit for invoice billing.", "Entrez une limite de crédit pour la facturation."));
        return;
      }
      if (!paymentTermsDays || !Number.isInteger(paymentTermsDays) || paymentTermsDays < 1 || paymentTermsDays > 365) {
        setError(tr("Enter payment terms between 1 and 365 days.", "Entrez des conditions de paiement entre 1 et 365 jours."));
        return;
      }
    }

    onSubmit({ discountPct, billingModes, creditLimitCents, paymentTermsDays });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <label className="block space-y-1">
        <span className="text-xs font-bold text-slate-700">{tr("Discount on base freight (%)", "Rabais sur le fret de base (%)")}</span>
        <input
          className={adminInput}
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
          inputMode="decimal"
          placeholder="e.g. 15"
        />
      </label>

      <fieldset className="space-y-2">
        <legend className="text-xs font-bold text-slate-700">{tr("Billing mode", "Mode de facturation")}</legend>
        {paymentPreference && (
          <p className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-[11px] text-slate-600">
            {tr("The applicant asked for:", "Le demandeur a demandé :")}{" "}
            <b className="text-slate-800">
              {paymentPreference === "weekly_invoice" ? tr("Weekly invoice (credit)", "Facture hebdomadaire (crédit)") : tr("Pay by card when booking", "Paiement par carte à la réservation")}
            </b>
          </p>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={payAtBooking} onChange={(e) => setPayAtBooking(e.target.checked)} className="accent-[#0B2545]" />
          {tr("Pay by card at booking", "Paiement par carte à la réservation")}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={invoice} onChange={(e) => setInvoice(e.target.checked)} className="accent-[#0B2545]" />
          {tr("Weekly invoice (credit)", "Facture hebdomadaire (crédit)")}
        </label>
      </fieldset>

      {invoice && (
        <div className="grid sm:grid-cols-2 gap-4 rounded-xl bg-slate-50 border border-slate-200 p-4">
          <label className="block space-y-1">
            <span className="text-xs font-bold text-slate-700">{tr("Credit limit (CAD)", "Limite de crédit (CAD)")}</span>
            <input className={adminInput} value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} inputMode="decimal" placeholder="e.g. 5000" />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-bold text-slate-700">{tr("Payment terms (days after invoice)", "Conditions de paiement (jours après la facture)")}</span>
            <input className={adminInput} value={terms} onChange={(e) => setTerms(e.target.value)} inputMode="numeric" placeholder="e.g. 7" />
          </label>
        </div>
      )}

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
        {submitLabel}
      </button>
    </form>
  );
}

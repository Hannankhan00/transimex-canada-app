"use client";

import React, { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { X, Landmark, Save } from "lucide-react";

export interface BankAccountItem {
  id: string;
  bankName: string;
  beneficiaryName: string;
  accountNumber: string;
  transitNumber?: string;
  institutionNumber?: string;
  swiftBic?: string;
  bankAddress?: string;
  currency: "CAD" | "USD";
  isDefault: boolean;
  isActive: boolean;
  notes?: string;
}

interface BankAccountFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  editingBank: BankAccountItem | null;
}

const emptyForm = {
  bankName: "",
  beneficiaryName: "Transimex Canada Inc.",
  accountNumber: "",
  transitNumber: "",
  institutionNumber: "",
  swiftBic: "",
  bankAddress: "",
  currency: "CAD" as "CAD" | "USD",
  isDefault: false,
  isActive: true,
  notes: "",
};

export default function BankAccountForm({ isOpen, onClose, onSaved, editingBank }: BankAccountFormProps) {
  const { language } = useLanguage();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingBank) {
      setForm({
        bankName: editingBank.bankName,
        beneficiaryName: editingBank.beneficiaryName,
        accountNumber: editingBank.accountNumber,
        transitNumber: editingBank.transitNumber || "",
        institutionNumber: editingBank.institutionNumber || "",
        swiftBic: editingBank.swiftBic || "",
        bankAddress: editingBank.bankAddress || "",
        currency: editingBank.currency,
        isDefault: editingBank.isDefault,
        isActive: editingBank.isActive,
        notes: editingBank.notes || "",
      });
    } else {
      setForm(emptyForm);
    }
    setError(null);
  }, [editingBank, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.bankName.trim() || !form.beneficiaryName.trim() || !form.accountNumber.trim()) {
      setError(language === "fr" ? "Veuillez remplir tous les champs obligatoires." : "Please fill in all required fields.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const url = editingBank ? `/api/admin/banks/${editingBank.id}` : "/api/admin/banks";
      const method = editingBank ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save bank account");
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save bank account");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0B2545] text-white flex items-center justify-center">
              <Landmark className="w-4.5 h-4.5" />
            </div>
            <h3 className="font-bold text-[#0B2545] text-sm">
              {editingBank
                ? language === "fr" ? "Modifier le Compte Bancaire" : "Edit Bank Account"
                : language === "fr" ? "Ajouter un Compte Bancaire" : "Add Bank Account"}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-[11px] font-bold text-slate-600">{language === "fr" ? "Nom de la Banque" : "Bank Name"} *</label>
              <input
                value={form.bankName}
                onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0B2545]"
                placeholder="Royal Bank of Canada (RBC)"
              />
            </div>

            <div className="col-span-2">
              <label className="text-[11px] font-bold text-slate-600">{language === "fr" ? "Bénéficiaire" : "Beneficiary Name"} *</label>
              <input
                value={form.beneficiaryName}
                onChange={(e) => setForm({ ...form, beneficiaryName: e.target.value })}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0B2545]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600">{language === "fr" ? "Devise" : "Currency"} *</label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value as "CAD" | "USD" })}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0B2545]"
              >
                <option value="CAD">CAD</option>
                <option value="USD">USD</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600">{language === "fr" ? "Numéro de Compte" : "Account Number"} *</label>
              <input
                value={form.accountNumber}
                onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0B2545]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600">{language === "fr" ? "No. de Transit" : "Transit Number"}</label>
              <input
                value={form.transitNumber}
                onChange={(e) => setForm({ ...form, transitNumber: e.target.value })}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0B2545]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600">{language === "fr" ? "No. d'Institution" : "Institution Number"}</label>
              <input
                value={form.institutionNumber}
                onChange={(e) => setForm({ ...form, institutionNumber: e.target.value })}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0B2545]"
              />
            </div>

            <div className="col-span-2">
              <label className="text-[11px] font-bold text-slate-600">SWIFT / BIC</label>
              <input
                value={form.swiftBic}
                onChange={(e) => setForm({ ...form, swiftBic: e.target.value })}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0B2545]"
              />
            </div>

            <div className="col-span-2">
              <label className="text-[11px] font-bold text-slate-600">{language === "fr" ? "Adresse de la Banque" : "Bank Address"}</label>
              <input
                value={form.bankAddress}
                onChange={(e) => setForm({ ...form, bankAddress: e.target.value })}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0B2545]"
              />
            </div>
          </div>

          <div className="flex items-center gap-5 pt-1">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                className="rounded border-slate-300"
              />
              {language === "fr" ? `Compte par défaut (${form.currency})` : `Default account for ${form.currency}`}
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="rounded border-slate-300"
              />
              {language === "fr" ? "Actif" : "Active"}
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              {language === "fr" ? "Annuler" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-[#d21f27] hover:bg-[#b51a21] disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? (language === "fr" ? "Enregistrement..." : "Saving...") : language === "fr" ? "Enregistrer" : "Save Bank Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import SettingsNavTabs from "@/components/admin/settings/SettingsNavTabs";
import PermissionGuard from "@/components/admin/PermissionGuard";
import BankAccountForm, { BankAccountItem } from "@/components/admin/settings/BankAccountForm";
import {
  Landmark,
  Plus,
  Pencil,
  Trash2,
  Star,
  CheckCircle2,
  EyeOff,
} from "lucide-react";

export default function AdminBanksSettingsPage() {
  const { language } = useLanguage();
  const [banks, setBanks] = useState<BankAccountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<BankAccountItem | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fetchBanks = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/banks");
      const data = await res.json();
      if (res.ok && data.banks) setBanks(data.banks);
    } catch (err) {
      console.error("Error fetching bank accounts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanks();
  }, [fetchBanks]);

  const handleAdd = () => {
    setEditingBank(null);
    setIsFormOpen(true);
  };

  const handleEdit = (bank: BankAccountItem) => {
    setEditingBank(bank);
    setIsFormOpen(true);
  };

  const handleSaved = () => {
    setToastMsg(language === "fr" ? "Compte bancaire enregistré." : "Bank account saved.");
    setTimeout(() => setToastMsg(null), 2500);
    fetchBanks();
  };

  const handleSetDefault = async (bank: BankAccountItem) => {
    try {
      await fetch(`/api/admin/banks/${bank.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      fetchBanks();
    } catch (err) {
      console.error("Error setting default bank account:", err);
    }
  };

  const handleDelete = async (bank: BankAccountItem) => {
    const confirmMsg =
      language === "fr"
        ? `Supprimer le compte bancaire « ${bank.bankName} » ? Les factures déjà générées conservent leurs coordonnées bancaires.`
        : `Delete bank account "${bank.bankName}"? Invoices already generated keep their own copy of these bank details.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/admin/banks/${bank.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchBanks();
    } catch (err: any) {
      alert(err.message || "Failed to delete bank account");
    }
  };

  const banksByCurrency = {
    CAD: banks.filter((b) => b.currency === "CAD"),
    USD: banks.filter((b) => b.currency === "USD"),
  };

  return (
    <PermissionGuard module="settings">
      <div className="space-y-8 animate-in fade-in duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#d21f27]">
              {language === "fr" ? "Coordonnées de Virement Bancaire" : "Wire & EFT Remittance Details"}
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0B2545] tracking-tight leading-tight mt-1">
              {language === "fr" ? "Comptes Bancaires de l'Entreprise" : "Company Bank Accounts"}
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl">
              {language === "fr"
                ? "Gérez les comptes bancaires utilisés sur les factures générées. Le compte par défaut de chaque devise apparaît sur toutes les nouvelles factures."
                : "Manage the bank accounts shown on generated invoices. Each currency's default account is used on every new invoice going forward."}
            </p>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            className="px-4 py-2 bg-[#d21f27] hover:bg-[#b51a21] active:scale-[0.98] text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{language === "fr" ? "Ajouter un Compte" : "Add Bank Account"}</span>
          </button>
        </div>

        <SettingsNavTabs />

        {toastMsg && (
          <div className="p-3.5 bg-[#0B2545] text-white rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-slate-400 text-sm">
            {language === "fr" ? "Chargement..." : "Loading..."}
          </div>
        ) : banks.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-12 text-center">
            <Landmark className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-medium">
              {language === "fr" ? "Aucun compte bancaire configuré." : "No bank accounts configured yet."}
            </p>
            <p className="text-slate-400 text-xs mt-1">
              {language === "fr"
                ? "Ajoutez-en un pour qu'il apparaisse sur les factures générées."
                : "Add one so it appears on generated invoices."}
            </p>
          </div>
        ) : (
          (["CAD", "USD"] as const).map((currency) =>
            banksByCurrency[currency].length === 0 ? null : (
              <div key={currency} className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{currency} {language === "fr" ? "Comptes" : "Accounts"}</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                  {banksByCurrency[currency].map((bank) => (
                    <div
                      key={bank.id}
                      className={`bg-white rounded-2xl p-4 sm:p-5 border shadow-2xs ${
                        bank.isDefault ? "border-[#d21f27]/40 ring-1 ring-[#d21f27]/10" : "border-slate-200/90"
                      } ${!bank.isActive ? "opacity-60" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-[#0B2545] text-white flex items-center justify-center flex-shrink-0">
                            <Landmark className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <div className="font-bold text-[#0B2545] text-sm">{bank.bankName}</div>
                            <div className="text-[11px] text-slate-500">{bank.beneficiaryName}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {bank.isDefault && (
                            <span className="px-2 py-0.5 rounded-full bg-red-50 text-[#d21f27] text-[10px] font-bold flex items-center gap-1 border border-red-200/60">
                              <Star className="w-3 h-3 fill-current" />
                              {language === "fr" ? "Par Défaut" : "Default"}
                            </span>
                          )}
                          {!bank.isActive && (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold flex items-center gap-1">
                              <EyeOff className="w-3 h-3" />
                              {language === "fr" ? "Inactif" : "Inactive"}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 space-y-1 text-[11px] text-slate-600 font-mono">
                        <div>{language === "fr" ? "Compte" : "Account"}: {bank.accountNumber}</div>
                        {bank.transitNumber && <div>{language === "fr" ? "Transit" : "Transit"}: {bank.transitNumber}</div>}
                        {bank.institutionNumber && <div>{language === "fr" ? "Institution" : "Institution"}: {bank.institutionNumber}</div>}
                        {bank.swiftBic && <div>SWIFT/BIC: {bank.swiftBic}</div>}
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        {!bank.isDefault ? (
                          <button
                            type="button"
                            onClick={() => handleSetDefault(bank)}
                            className="text-[11px] font-bold text-[#0B2545] hover:underline cursor-pointer"
                          >
                            {language === "fr" ? "Définir par défaut" : "Set as Default"}
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            {language === "fr" ? "Utilisé sur les nouvelles factures" : "Used on new invoices"}
                          </span>
                        )}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEdit(bank)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
                            title={language === "fr" ? "Modifier" : "Edit"}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(bank)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-[#d21f27] cursor-pointer"
                            title={language === "fr" ? "Supprimer" : "Delete"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )
        )}

        <BankAccountForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSaved={handleSaved}
          editingBank={editingBank}
        />
      </div>
    </PermissionGuard>
  );
}

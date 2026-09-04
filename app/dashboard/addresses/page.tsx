"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  SavedAddress,
  AddressFormData,
} from "@/lib/validations/address";
import AddressModal from "@/components/portal/AddressModal";
import {
  MapPin,
  Building2,
  Plus,
  Edit2,
  Trash2,
  Phone,
  User,
  CheckCircle2,
  Star,
  Search,
  FileText,
  AlertTriangle,
  X,
  Compass,
} from "lucide-react";

export default function AddressesPage() {
  const { t, language } = useLanguage();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadAddresses = () => {
    fetch("/api/addresses")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setAddresses(data.addresses);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleSaveAddress = async (data: AddressFormData, editId?: string) => {
    try {
      const res = await fetch(editId ? `/api/addresses/${editId}` : "/api/addresses", {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to save address");

      loadAddresses();
      showToast(
        editId
          ? language === "fr"
            ? "Emplacement mis à jour avec succès"
            : "Address updated successfully"
          : language === "fr"
          ? "Nouvel emplacement ajouté"
          : "New address location added to vault"
      );
    } catch (err: any) {
      showToast(err.message || "Failed to save address");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/addresses/${id}`, { method: "DELETE" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to delete address");

      loadAddresses();
      showToast(language === "fr" ? "Emplacement supprimé" : "Address removed from directory");
    } catch (err: any) {
      showToast(err.message || "Failed to delete address");
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const res = await fetch(`/api/addresses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to update address");

      loadAddresses();
      showToast(language === "fr" ? "Adresse principale mise à jour" : "Primary default shipping address set");
    } catch (err: any) {
      showToast(err.message || "Failed to update address");
    }
  };

  const filteredAddresses = addresses.filter((a) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      a.alias.toLowerCase().includes(q) ||
      a.city.toLowerCase().includes(q) ||
      a.street.toLowerCase().includes(q) ||
      a.province.toLowerCase().includes(q) ||
      a.company.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0B2545] text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold border border-white/10 animate-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#d21f27]">
            {language === "fr" ? "Carnet de Lieux & Dépôts" : "Logistics Address Directory"}
          </span>
          <h1
            className="text-2xl sm:text-3xl font-bold text-[#0B2545] tracking-tight leading-tight mt-1"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {t.nav.addresses}
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            {language === "fr"
              ? "Enregistrez vos quais de chargement, entrepôts et points de livraison pour accélérer vos demandes de transport."
              : "Manage frequent pickup warehouses, cross-dock terminals, and receiver delivery facilities."}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingAddress(null);
            setModalOpen(true);
          }}
          className="px-4 py-2.5 bg-[#d21f27] hover:bg-[#b51a21] text-white rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>{language === "fr" ? "+ Nouvelle Adresse" : "+ Add New Address"}</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between gap-3">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={
              language === "fr"
                ? "Rechercher par alias, ville, adresse, entreprise..."
                : "Search by alias, facility name, city, province..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition font-medium text-slate-900"
          />
        </div>
        <div className="text-xs text-slate-500 font-semibold hidden sm:block">
          {addresses.length} {language === "fr" ? "adresses enregistrées" : "saved locations"}
        </div>
      </div>

      {/* Addresses Grid */}
      {filteredAddresses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <Compass className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="text-sm font-bold text-slate-700">
            {language === "fr" ? "Aucune adresse trouvée" : "No Saved Addresses"}
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {language === "fr"
              ? "Ajoutez vos quais de chargement fréquents pour remplir automatiquement vos demandes de soumission."
              : "Save your pickup depots and delivery cross-docks to bypass manual entry on future freight bookings."}
          </p>
          <button
            type="button"
            onClick={() => {
              setEditingAddress(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0B2545] text-white rounded-xl text-xs font-bold hover:bg-[#123661] transition"
          >
            <Plus className="w-4 h-4" />
            <span>{language === "fr" ? "Créer une adresse" : "Create First Address"}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAddresses.map((addr) => (
            <div
              key={addr.id}
              className={`bg-white rounded-2xl p-5 border transition flex flex-col justify-between gap-4 ${
                addr.isDefault
                  ? "border-[#0B2545]/40 shadow-xs ring-1 ring-[#0B2545]/10"
                  : "border-slate-200 shadow-xs hover:shadow-md"
              }`}
            >
              {/* Top Row: Alias & Badges & Action Icons */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-[#0B2545]">
                      {addr.alias}
                    </span>
                    {addr.isDefault && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Default
                      </span>
                    )}
                  </div>

                  {/* Actions: Edit & Delete */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingAddress(addr);
                        setModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-[#0B2545] hover:bg-slate-100 rounded-lg transition cursor-pointer"
                      title="Edit Address"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(addr.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                      title="Delete Address"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Company & Location Info */}
                <div className="space-y-1.5 text-xs text-slate-700">
                  <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>{addr.company}</span>
                  </div>

                  <div className="flex items-start gap-1.5 text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-[#d21f27] flex-shrink-0 mt-0.5" />
                    <span className="font-medium leading-relaxed">
                      {addr.street}, {addr.city}, {addr.province} {addr.postalCode}, {addr.country}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-500 pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{addr.contactPerson}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{addr.phone}</span>
                    </div>
                  </div>

                  {/* Access instructions (if any) */}
                  {addr.accessInstructions && (
                    <div className="mt-2 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100/80">
                      <span className="font-bold text-slate-700 block mb-0.5">
                        {language === "fr" ? "Accès Quai :" : "Dock Instructions:"}
                      </span>
                      {addr.accessInstructions}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Card Controls */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                {!addr.isDefault ? (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(addr.id)}
                    className="text-[11px] font-bold text-[#0B2545] hover:text-[#d21f27] transition cursor-pointer flex items-center gap-1"
                  >
                    <Star className="w-3.5 h-3.5" />
                    <span>{language === "fr" ? "Définir par défaut" : "Set as Default"}</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Primary Route Location
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setEditingAddress(addr);
                    setModalOpen(true);
                  }}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
                >
                  {language === "fr" ? "Modifier les détails" : "Edit Location"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Address Create/Edit Modal with React Hook Form & Zod */}
      <AddressModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingAddress(null);
        }}
        onSave={handleSaveAddress}
        initialData={editingAddress}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-[#0B2545]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-[#d21f27]" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">
                {language === "fr" ? "Supprimer l'emplacement ?" : "Delete Address?"}
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-5">
              {language === "fr"
                ? "Êtes-vous sûr de vouloir supprimer cette adresse de votre carnet ? Cette action est irréversible."
                : "Are you sure you want to remove this shipping facility from your address book? This cannot be undone."}
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                {language === "fr" ? "Annuler" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 bg-[#d21f27] hover:bg-[#b51a21] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                {language === "fr" ? "Confirmer la suppression" : "Delete Address"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

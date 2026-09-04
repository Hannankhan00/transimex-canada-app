"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addressSchema, AddressFormData, SavedAddress } from "@/lib/validations/address";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { api } from "@/lib/api";
import { X, Building2, MapPin, User, Phone, FileText, Check } from "lucide-react";
import CountrySelect from "@/components/ui/CountrySelect";

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AddressFormData, editId?: string) => void;
  initialData?: SavedAddress | null;
}

export default function AddressModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: AddressModalProps) {
  const { language } = useLanguage();
  const isEditing = Boolean(initialData);
  const [currentUserCompany, setCurrentUserCompany] = useState("");
  const [currentUserContact, setCurrentUserContact] = useState("");
  const [currentUserPhone, setCurrentUserPhone] = useState("");

  useEffect(() => {
    api.auth.me().then((res) => {
      if (res.user) {
        setCurrentUserCompany(res.user.companyName || "");
        setCurrentUserContact(res.user.name || "");
        setCurrentUserPhone((res.user as any).phone || "");
      }
    });
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema) as any,
    defaultValues: {
      alias: "",
      company: "",
      contactPerson: "",
      phone: "",
      street: "",
      city: "",
      province: "",
      postalCode: "",
      country: "Canada",
      accessInstructions: "",
      isDefault: false,
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        alias: initialData.alias,
        company: initialData.company,
        contactPerson: initialData.contactPerson,
        phone: initialData.phone,
        street: initialData.street,
        city: initialData.city,
        province: initialData.province,
        postalCode: initialData.postalCode,
        country: initialData.country || "Canada",
        accessInstructions: initialData.accessInstructions || "",
        isDefault: initialData.isDefault || false,
      });
    } else {
      reset({
        alias: "",
        company: currentUserCompany,
        contactPerson: currentUserContact,
        phone: currentUserPhone,
        street: "",
        city: "",
        province: "",
        postalCode: "",
        country: "Canada",
        accessInstructions: "",
        isDefault: false,
      });
    }
  }, [initialData, reset, isOpen, currentUserCompany, currentUserContact, currentUserPhone]);

  if (!isOpen) return null;

  const onSubmit = (data: AddressFormData) => {
    onSave(data, initialData?.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[#0B2545]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#d21f27]">
              {language === "fr" ? "Carnet d'Adresses" : "Address Book Management"}
            </span>
            <h3
              className="text-xl font-bold text-[#0B2545] mt-0.5"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {isEditing
                ? language === "fr"
                  ? "Modifier l'Emplacement"
                  : "Edit Shipping Location"
                : language === "fr"
                ? "Ajouter un Nouvel Emplacement"
                : "Add New Shipping Location"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          {/* Alias / Facility Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              {language === "fr" ? "Alias / Nom du Site" : "Location Alias / Facility Name"} *
            </label>
            <input
              {...register("alias")}
              placeholder="e.g. Montreal Main Distribution Center, Toronto Dock #4"
              className={`w-full px-3.5 py-2.5 bg-slate-50 border ${
                errors.alias ? "border-red-500 bg-red-50/30" : "border-slate-200"
              } focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition font-medium text-slate-900`}
            />
            {errors.alias && (
              <p className="text-[11px] text-red-600 mt-1 font-semibold">{errors.alias.message}</p>
            )}
          </div>

          {/* Company & Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {language === "fr" ? "Nom de l'Entreprise" : "Company Name"} *
              </label>
              <div className="relative">
                <input
                  {...register("company")}
                  placeholder="e.g. Laurentian Global Logistics Ltd."
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border ${
                    errors.company ? "border-red-500 bg-red-50/30" : "border-slate-200"
                  } focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition font-medium text-slate-900`}
                />
              </div>
              {errors.company && (
                <p className="text-[11px] text-red-600 mt-1 font-semibold">{errors.company.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {language === "fr" ? "Personne-Ressource" : "Contact Person / Dock Mgr"} *
              </label>
              <input
                {...register("contactPerson")}
                placeholder="e.g. Marc Tremblay"
                className={`w-full px-3.5 py-2.5 bg-slate-50 border ${
                  errors.contactPerson ? "border-red-500 bg-red-50/30" : "border-slate-200"
                } focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition font-medium text-slate-900`}
              />
              {errors.contactPerson && (
                <p className="text-[11px] text-red-600 mt-1 font-semibold">{errors.contactPerson.message}</p>
              )}
            </div>
          </div>

          {/* Phone & Country */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {language === "fr" ? "Numéro de Téléphone" : "Phone Number"} *
              </label>
              <input
                {...register("phone")}
                placeholder="+1 (514) 555-0199"
                className={`w-full px-3.5 py-2.5 bg-slate-50 border ${
                  errors.phone ? "border-red-500 bg-red-50/30" : "border-slate-200"
                } focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition font-medium text-slate-900`}
              />
              {errors.phone && (
                <p className="text-[11px] text-red-600 mt-1 font-semibold">{errors.phone.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {language === "fr" ? "Pays" : "Country"} *
              </label>
              <Controller
                name="country"
                control={control}
                render={({ field }) => (
                  <CountrySelect
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    hasError={Boolean(errors.country)}
                    placeholder={language === "fr" ? "Rechercher un pays..." : "Search country..."}
                  />
                )}
              />
              {errors.country && (
                <p className="text-[11px] text-red-600 mt-1 font-semibold">{errors.country.message}</p>
              )}
            </div>
          </div>

          {/* Street Address */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              {language === "fr" ? "Adresse Civique" : "Street Address"} *
            </label>
            <input
              {...register("street")}
              placeholder="e.g. 4850 Rue Saint-Patrick, Suite 200"
              className={`w-full px-3.5 py-2.5 bg-slate-50 border ${
                errors.street ? "border-red-500 bg-red-50/30" : "border-slate-200"
              } focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition font-medium text-slate-900`}
            />
            {errors.street && (
              <p className="text-[11px] text-red-600 mt-1 font-semibold">{errors.street.message}</p>
            )}
          </div>

          {/* City, Province, Postal Code */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {language === "fr" ? "Ville" : "City"} *
              </label>
              <input
                {...register("city")}
                placeholder="Montreal"
                className={`w-full px-3.5 py-2.5 bg-slate-50 border ${
                  errors.city ? "border-red-500 bg-red-50/30" : "border-slate-200"
                } focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition font-medium text-slate-900`}
              />
              {errors.city && (
                <p className="text-[11px] text-red-600 mt-1 font-semibold">{errors.city.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {language === "fr" ? "Province / État" : "Province / State"} *
              </label>
              <input
                {...register("province")}
                placeholder="e.g. Quebec, Ontario, California"
                className={`w-full px-3.5 py-2.5 bg-slate-50 border ${
                  errors.province ? "border-red-500 bg-red-50/30" : "border-slate-200"
                } focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition font-medium text-slate-900`}
              />
              {errors.province && (
                <p className="text-[11px] text-red-600 mt-1 font-semibold">{errors.province.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {language === "fr" ? "Code Postal" : "Postal / ZIP"} *
              </label>
              <input
                {...register("postalCode")}
                placeholder="H4E 4N4"
                className={`w-full px-3.5 py-2.5 bg-slate-50 border ${
                  errors.postalCode ? "border-red-500 bg-red-50/30" : "border-slate-200"
                } focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition font-medium text-slate-900`}
              />
              {errors.postalCode && (
                <p className="text-[11px] text-red-600 mt-1 font-semibold">{errors.postalCode.message}</p>
              )}
            </div>
          </div>

          {/* Access Instructions */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              {language === "fr" ? "Instructions d'Accès au Quai" : "Gate / Dock Access Instructions (Optional)"}
            </label>
            <textarea
              {...register("accessInstructions")}
              rows={2}
              placeholder="e.g. Ring security bell at gate 3. Receiving hours: 07:00 - 16:30 EST."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0B2545] rounded-xl text-xs outline-none transition font-medium text-slate-900 resize-none"
            />
          </div>

          {/* Default Address Checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isDefault"
              {...register("isDefault")}
              className="w-4 h-4 text-[#d21f27] rounded-md border-slate-300 focus:ring-[#d21f27] cursor-pointer"
            />
            <label htmlFor="isDefault" className="text-xs font-semibold text-slate-700 cursor-pointer">
              {language === "fr"
                ? "Définir comme adresse d'expédition principale par défaut"
                : "Set as default primary shipping origin / destination"}
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              {language === "fr" ? "Annuler" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-[#d21f27] hover:bg-[#b51a21] text-white text-xs font-bold rounded-xl shadow-sm hover:shadow-md transition cursor-pointer flex items-center gap-2"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>
                {isEditing
                  ? language === "fr"
                    ? "Mettre à jour"
                    : "Save Changes"
                  : language === "fr"
                  ? "Enregistrer le Lieu"
                  : "Save Address"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { CarrierVendor, FleetUnit, TransportModeType, VendorStatusType } from "@/lib/carrierTypes";
import { X, Truck, Save, AlertTriangle, Plus, Trash2 } from "lucide-react";

let tempUnitCounter = 0;
function makeTempUnit(): FleetUnit {
  tempUnitCounter += 1;
  return { id: `temp-${tempUnitCounter}`, driverName: "", vehicleType: "", plateNumber: "", active: true };
}

interface CarrierModalProps {
  isOpen: boolean;
  onClose: () => void;
  carrierToEdit?: CarrierVendor | null;
  onCarrierSaved: (carrier: CarrierVendor) => void;
}

export default function CarrierModal({
  isOpen,
  onClose,
  carrierToEdit,
  onCarrierSaved,
}: CarrierModalProps) {
  const { language } = useLanguage();
  const isEditing = !!carrierToEdit;

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [primaryMode, setPrimaryMode] = useState<TransportModeType>("Road");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [headquarters, setHeadquarters] = useState("");
  const [operatingLanesStr, setOperatingLanesStr] = useState("");
  const [fleetSize, setFleetSize] = useState("");
  const [units, setUnits] = useState<FleetUnit[]>([]);
  const [rating, setRating] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [coverageAmount, setCoverageAmount] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [status, setStatus] = useState<VendorStatusType>("Active");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (carrierToEdit) {
      setName(carrierToEdit.name);
      setCode(carrierToEdit.code);
      setPrimaryMode(carrierToEdit.primaryMode);
      setContactName(carrierToEdit.dispatchContact.name);
      setPhone(carrierToEdit.dispatchContact.phone);
      setEmail(carrierToEdit.dispatchContact.email);
      setEmergencyPhone(carrierToEdit.dispatchContact.emergencyPhone || "");
      setHeadquarters(carrierToEdit.headquarters);
      setOperatingLanesStr(carrierToEdit.operatingLanes.join(", "));
      setFleetSize(carrierToEdit.fleetSize);
      setUnits(carrierToEdit.units && carrierToEdit.units.length > 0 ? carrierToEdit.units : []);
      setRating(carrierToEdit.rating ? carrierToEdit.rating.toString() : "");
      setPolicyNumber(carrierToEdit.insurance.policyNumber);
      setCoverageAmount(carrierToEdit.insurance.coverageAmount);
      setExpiryDate(carrierToEdit.insurance.expiryDate);
      setStatus(carrierToEdit.status);
      setNotes(carrierToEdit.notes || "");
    } else {
      // Reset for a brand-new partner — no earned rating or shipment history
      // exists yet, so those fields start blank/zero rather than pre-filled
      // with plausible-looking example values.
      setName("");
      setCode("");
      setPrimaryMode("Road");
      setContactName("");
      setPhone("");
      setEmail("");
      setEmergencyPhone("");
      setHeadquarters("");
      setOperatingLanesStr("");
      setFleetSize("");
      setUnits([]);
      setRating("");
      setPolicyNumber("");
      setCoverageAmount("");
      setExpiryDate("");
      setStatus("Active");
      setNotes("");
    }
    setError(null);
  }, [carrierToEdit, isOpen]);

  if (!isOpen) return null;

  const handleAddUnit = () => setUnits((prev) => [...prev, makeTempUnit()]);
  const handleRemoveUnit = (id: string) => setUnits((prev) => prev.filter((u) => u.id !== id));
  const handleUnitChange = (id: string, field: keyof FleetUnit, value: string | boolean) => {
    setUnits((prev) => prev.map((u) => (u.id === id ? { ...u, [field]: value } : u)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !code.trim() || !phone.trim() || !email.trim() || !expiryDate) {
      setError(
        language === "fr"
          ? "Le nom du transporteur, le code SCAC, le téléphone de répartition, le courriel et la date d'expiration de l'assurance sont requis."
          : "Carrier Name, SCAC/Code, Dispatch Phone, Email, and Insurance Expiry are required."
      );
      return;
    }

    const incompleteUnit = units.some((u) => !u.driverName.trim() || !u.vehicleType.trim() || !u.plateNumber.trim());
    if (incompleteUnit) {
      setError(
        language === "fr"
          ? "Chaque véhicule ajouté doit avoir un nom de chauffeur, un type de véhicule et un numéro de plaque, ou être supprimé."
          : "Every vehicle row needs a driver name, vehicle type, and plate number — or remove the row."
      );
      return;
    }

    const lanes = operatingLanesStr
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean);

    const payload = {
      name,
      code: code.toUpperCase(),
      primaryMode,
      supportedModes: [primaryMode],
      dispatchContact: {
        name: contactName || "Primary Dispatch Desk",
        phone,
        email,
        emergencyPhone,
      },
      headquarters,
      operatingLanes: lanes,
      fleetSize: fleetSize || "",
      units: units.map((u) => ({
        id: u.id.startsWith("temp-") ? undefined : u.id,
        driverName: u.driverName.trim(),
        vehicleType: u.vehicleType.trim(),
        plateNumber: u.plateNumber.trim(),
        active: u.active,
      })),
      rating: rating ? parseFloat(rating) : 0,
      insurance: {
        policyNumber,
        coverageAmount,
        expiryDate,
        isCompliant: new Date(expiryDate).getTime() > Date.now(),
      },
      status,
      notes,
    };

    try {
      setLoading(true);
      const url = isEditing
        ? `/api/admin/carriers/${encodeURIComponent(carrierToEdit.id)}`
        : "/api/admin/carriers";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save carrier details");
      }

      onCarrierSaved(data.carrier);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save carrier");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0B2545] text-white flex items-center justify-center flex-shrink-0">
              <Truck className="w-5 h-5 text-[#d21f27]" />
            </div>
            <div>
              <h3 className="font-bold text-[#0B2545] text-base leading-tight">
                {isEditing
                  ? `${language === "fr" ? "Modifier le Partenaire :" : "Edit Logistics Partner:"} ${carrierToEdit.name}`
                  : language === "fr"
                  ? "Ajouter un Nouveau Partenaire Transporteur"
                  : "Add New Logistics Carrier Partner"}
              </h3>
              <p className="text-[11px] text-slate-500">
                {language === "fr"
                  ? "Enregistrez les identifiants du transporteur, l'assurance de conformité et les corridors d'exploitation standards."
                  : "Register authorized carrier credentials, compliance insurance, and standard operating corridors."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Section 1: Carrier Entity Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="font-bold text-slate-700 block mb-1">
                {language === "fr" ? "Nom de l'Entreprise" : "Company Name"}
              </label>
              <input
                type="text"
                placeholder="e.g. Bison Transport Expedited"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#0B2545] focus:bg-white rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                {language === "fr" ? "Code SCAC / DOT" : "SCAC / DOT Code"}
              </label>
              <input
                type="text"
                placeholder="e.g. BISO"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#0B2545] focus:bg-white rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 outline-none uppercase"
              />
            </div>
          </div>

          {/* Section 2: Mode & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                {language === "fr" ? "Mode Principal" : "Primary Mode"}
              </label>
              <select
                value={primaryMode}
                onChange={(e) => setPrimaryMode(e.target.value as TransportModeType)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none"
              >
                <option value="Road">{language === "fr" ? "Routier (Autoroute)" : "Road (Highway)"}</option>
                <option value="Sea">{language === "fr" ? "Maritime" : "Sea (Maritime)"}</option>
                <option value="Air">{language === "fr" ? "Aérien (Express)" : "Air (Express)"}</option>
                <option value="Rail">{language === "fr" ? "Ferroviaire (Intermodal)" : "Rail (Intermodal)"}</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                {language === "fr" ? "Statut du Transporteur" : "Carrier Status"}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as VendorStatusType)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none"
              >
                <option value="Active">{language === "fr" ? "Actif et Conforme" : "Active & Compliant"}</option>
                <option value="Under Review">{language === "fr" ? "En Révision" : "Under Review"}</option>
                <option value="Suspended">{language === "fr" ? "Suspendu" : "Suspended"}</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                {language === "fr" ? "Cote de Fiabilité (1,0 - 5,0)" : "Reliability Rating (1.0 - 5.0)"}
              </label>
              <input
                type="number"
                step="0.1"
                min="1.0"
                max="5.0"
                placeholder={language === "fr" ? "Pas encore évalué" : "Not yet rated"}
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
              />
            </div>
          </div>

          {/* Section 3: Dispatch Contacts */}
          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              {language === "fr" ? "Contact de Répartition Principal" : "Primary Dispatch Contact"}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  {language === "fr" ? "Nom du Répartiteur" : "Dispatcher Name"}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Greg Sutherland"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  {language === "fr" ? "Téléphone de Répartition" : "Dispatch Hotline Phone"}
                </label>
                <input
                  type="text"
                  placeholder="+1 (800) 555-0199"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  {language === "fr" ? "Courriel de Notification" : "Dispatch Notification Email"}
                </label>
                <input
                  type="email"
                  placeholder="dispatch@carrier.ca"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  {language === "fr" ? "Téléphone d'Urgence 24/7" : "Emergency 24/7 Phone"}
                </label>
                <input
                  type="text"
                  placeholder="+1 (514) 555-9988"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Operational Corridors & Fleet */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                {language === "fr" ? "Terminal du Siège Social" : "Headquarters Terminal"}
              </label>
              <input
                type="text"
                placeholder="e.g. Winnipeg, MB"
                value={headquarters}
                onChange={(e) => setHeadquarters(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                {language === "fr" ? "Description de la Flotte" : "Fleet Description"}
              </label>
              <input
                type="text"
                placeholder="e.g. 450+ Dry Van & Reefer Tandems"
                value={fleetSize}
                onChange={(e) => setFleetSize(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-bold text-slate-700 block mb-1">
                {language === "fr" ? "Corridors d'Exploitation Standards (séparés par des virgules)" : "Standard Operating Lanes (Comma-separated)"}
              </label>
              <input
                type="text"
                placeholder="e.g. Montreal <-> Detroit, Toronto <-> Chicago, Calgary <-> Vancouver"
                value={operatingLanesStr}
                onChange={(e) => setOperatingLanesStr(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
              />
            </div>
          </div>

          {/* Section 3b: Fleet Units (Driver + Vehicle combos, for One-Click Assignment) */}
          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                {language === "fr"
                  ? "Véhicules et Chauffeurs (pour l'Assignation Rapide aux Expéditions)"
                  : "Fleet Units — Driver + Vehicle (for One-Click Shipment Assignment)"}
              </span>
              <button
                type="button"
                onClick={handleAddUnit}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-[#0B2545] text-[#0B2545] font-bold text-[11px] transition cursor-pointer inline-flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>{language === "fr" ? "Ajouter un Véhicule" : "Add Unit"}</span>
              </button>
            </div>

            {units.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic">
                {language === "fr"
                  ? "Aucun véhicule enregistré — ce transporteur n'apparaîtra pas dans le sélecteur d'assignation rapide tant qu'aucun véhicule n'est ajouté."
                  : "No units on file yet — this carrier won't appear in the one-click assignment picker until at least one unit is added."}
              </p>
            ) : (
              <div className="space-y-2">
                {units.map((unit) => (
                  <div
                    key={unit.id}
                    className="grid grid-cols-1 sm:grid-cols-[1.2fr_1.2fr_1fr_auto_auto] gap-2 items-center bg-white p-2 rounded-lg border border-slate-200"
                  >
                    <input
                      type="text"
                      placeholder={language === "fr" ? "Nom du chauffeur" : "Driver name"}
                      value={unit.driverName}
                      onChange={(e) => handleUnitChange(unit.id, "driverName", e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none"
                    />
                    <input
                      type="text"
                      placeholder="e.g. 53' Tandem Dry Van"
                      value={unit.vehicleType}
                      onChange={(e) => handleUnitChange(unit.id, "vehicleType", e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none"
                    />
                    <input
                      type="text"
                      placeholder="e.g. AB-12345"
                      value={unit.plateNumber}
                      onChange={(e) => handleUnitChange(unit.id, "plateNumber", e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-800 outline-none"
                    />
                    <label className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-600 whitespace-nowrap px-1">
                      <input
                        type="checkbox"
                        checked={unit.active}
                        onChange={(e) => handleUnitChange(unit.id, "active", e.target.checked)}
                        className="cursor-pointer"
                      />
                      {language === "fr" ? "Actif" : "Active"}
                    </label>
                    <button
                      type="button"
                      onClick={() => handleRemoveUnit(unit.id)}
                      title={language === "fr" ? "Supprimer" : "Remove"}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer justify-self-end"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 5: Insurance & Compliance */}
          <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/80 space-y-3">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
              {language === "fr" ? "Assurance et Conformité Réglementaire" : "Insurance & Regulatory Compliance"}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  {language === "fr" ? "Numéro de Police" : "Policy Number"}
                </label>
                <input
                  type="text"
                  placeholder="POL-BISO-99824"
                  value={policyNumber}
                  onChange={(e) => setPolicyNumber(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  {language === "fr" ? "Limite de Couverture" : "Coverage Limit"}
                </label>
                <input
                  type="text"
                  placeholder="$10,000,000 CAD"
                  value={coverageAmount}
                  onChange={(e) => setCoverageAmount(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  {language === "fr" ? "Date d'Expiration" : "Expiry Date"}
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 6: Internal Notes */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              {language === "fr" ? "Notes Opérationnelles Internes" : "Internal Operations Notes"}
            </label>
            <textarea
              rows={2}
              placeholder={
                language === "fr"
                  ? "Instructions de répartition, types d'équipement préférés, observations de performance..."
                  : "Dispatch instructions, preferred equipment types, performance observations..."
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              {language === "fr" ? "Annuler" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-[#0B2545] hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5 text-[#d21f27]" />
              <span>
                {loading
                  ? language === "fr"
                    ? "Enregistrement..."
                    : "Saving Partner..."
                  : isEditing
                  ? language === "fr"
                    ? "Mettre à Jour le Partenaire"
                    : "Update Partner"
                  : language === "fr"
                  ? "Ajouter le Partenaire Transporteur"
                  : "Add Carrier Partner"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

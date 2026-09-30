"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { CarrierVendor, FleetUnit, TransportModeType, VendorStatusType, carriesOwnInsurance } from "@/lib/carrierTypes";
import { X, Truck, Ship, Plane, Train, Save, AlertTriangle, Plus, Trash2 } from "lucide-react";

let tempUnitCounter = 0;
function makeTempUnit(): FleetUnit {
  tempUnitCounter += 1;
  return { id: `temp-${tempUnitCounter}`, driverName: "", vehicleType: "", plateNumber: "", active: true };
}

const MODE_OPTIONS: { value: TransportModeType; en: string; fr: string; Icon: typeof Truck }[] = [
  { value: "Road", en: "Road", fr: "Routier", Icon: Truck },
  { value: "Sea", en: "Sea", fr: "Maritime", Icon: Ship },
  { value: "Air", en: "Air", fr: "Aérien", Icon: Plane },
  { value: "Rail", en: "Rail", fr: "Ferroviaire", Icon: Train },
];

/** Field labels and examples that change with the carrier's mode. */
function modeCopy(mode: TransportModeType, fr: boolean) {
  switch (mode) {
    case "Sea":
      return {
        namePlaceholder: "e.g. CMA CGM",
        codeLabel: fr ? "Code SCAC" : "SCAC Code",
        codePlaceholder: "e.g. CMDU",
        contactTitle: fr ? "Contact Réservations et Service Client" : "Booking & Customer Service Contact",
        contactNameLabel: fr ? "Représentant du Compte" : "Account Representative",
        phoneLabel: fr ? "Téléphone des Réservations" : "Booking Desk Phone",
        emailLabel: fr ? "Courriel Réservations / Service Client" : "Booking / Customer Service Email",
        emailPlaceholder: "bookings@carrier.com",
        hqPlaceholder: "e.g. Marseille, France",
        fleetLabel: fr ? "Flotte" : "Fleet",
        fleetPlaceholder: "e.g. 650+ container vessels",
        lanesLabel: fr ? "Routes Portuaires (séparées par des virgules)" : "Port-to-Port Routes (Comma-separated)",
        lanesPlaceholder: "e.g. Montreal <-> Douala, Montreal <-> Tanger Med",
        accountLabel: fr ? "Numéro de Compte / Contrat" : "Account / Contract Number",
        accountPlaceholder: fr ? "Votre numéro de client chez le transporteur" : "Your customer number with this line",
      };
    case "Air":
      return {
        namePlaceholder: "e.g. Air Canada Cargo",
        codeLabel: fr ? "Code IATA de la Compagnie" : "IATA Airline Code",
        codePlaceholder: "e.g. AC",
        contactTitle: fr ? "Contact Réservations Fret" : "Cargo Booking Contact",
        contactNameLabel: fr ? "Représentant du Compte" : "Account Representative",
        phoneLabel: fr ? "Téléphone des Réservations Fret" : "Cargo Booking Phone",
        emailLabel: fr ? "Courriel Réservations Fret" : "Cargo Booking Email",
        emailPlaceholder: "cargo@airline.com",
        hqPlaceholder: "e.g. Montreal, QC",
        fleetLabel: fr ? "Flotte" : "Fleet",
        fleetPlaceholder: "e.g. Boeing 777F & 767F freighters",
        lanesLabel: fr ? "Routes Aéroportuaires (séparées par des virgules)" : "Airport-to-Airport Routes (Comma-separated)",
        lanesPlaceholder: "e.g. YUL <-> CDG, YYZ <-> LOS",
        accountLabel: fr ? "Numéro de Compte / Contrat" : "Account / Contract Number",
        accountPlaceholder: fr ? "Votre numéro de client chez la compagnie" : "Your customer number with this airline",
      };
    default:
      return {
        namePlaceholder: "e.g. Bison Transport Expedited",
        codeLabel: fr ? "Code SCAC / DOT" : "SCAC / DOT Code",
        codePlaceholder: "e.g. BISO",
        contactTitle: fr ? "Contact de Répartition Principal" : "Primary Dispatch Contact",
        contactNameLabel: fr ? "Nom du Répartiteur" : "Dispatcher Name",
        phoneLabel: fr ? "Téléphone de Répartition" : "Dispatch Hotline Phone",
        emailLabel: fr ? "Courriel de Notification" : "Dispatch Notification Email",
        emailPlaceholder: "dispatch@carrier.ca",
        hqPlaceholder: "e.g. Winnipeg, MB",
        fleetLabel: fr ? "Description de la Flotte" : "Fleet Description",
        fleetPlaceholder: mode === "Rail" ? "e.g. 1,200 intermodal well cars" : "e.g. 450+ Dry Van & Reefer Tandems",
        lanesLabel: fr
          ? "Corridors d'Exploitation Standards (séparés par des virgules)"
          : "Standard Operating Lanes (Comma-separated)",
        lanesPlaceholder: "e.g. Montreal <-> Detroit, Toronto <-> Chicago, Calgary <-> Vancouver",
        accountLabel: "",
        accountPlaceholder: "",
      };
  }
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
  const [accountNumber, setAccountNumber] = useState("");
  const [awbPrefix, setAwbPrefix] = useState("");
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
      setAccountNumber(carrierToEdit.accountNumber || "");
      setAwbPrefix(carrierToEdit.awbPrefix || "");
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
      setAccountNumber("");
      setAwbPrefix("");
      setStatus("Active");
      setNotes("");
    }
    setError(null);
  }, [carrierToEdit, isOpen]);

  if (!isOpen) return null;

  const fr = language === "fr";
  const copy = modeCopy(primaryMode, fr);
  const ownFleet = carriesOwnInsurance(primaryMode);
  // Units are hidden for Sea/Air, except when editing a carrier that already has
  // some on file — they stay visible so they aren't kept or dropped out of sight.
  const showUnits = ownFleet || units.length > 0;
  const HeaderIcon = MODE_OPTIONS.find((m) => m.value === primaryMode)?.Icon || Truck;

  const handleAddUnit = () => setUnits((prev) => [...prev, makeTempUnit()]);
  const handleRemoveUnit = (id: string) => setUnits((prev) => prev.filter((u) => u.id !== id));
  const handleUnitChange = (id: string, field: keyof FleetUnit, value: string | boolean) => {
    setUnits((prev) => prev.map((u) => (u.id === id ? { ...u, [field]: value } : u)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (
      !name.trim() ||
      !code.trim() ||
      !phone.trim() ||
      !email.trim() ||
      !headquarters.trim() ||
      (ownFleet && !expiryDate)
    ) {
      setError(
        ownFleet
          ? fr
            ? "Le nom, le code SCAC, le siège social, le téléphone de répartition, le courriel et la date d'expiration de l'assurance sont requis."
            : "Company Name, SCAC/Code, Headquarters, Dispatch Phone, Email, and Insurance Expiry are required."
          : fr
          ? "Le nom, le code, le siège social, le téléphone et le courriel des réservations sont requis."
          : "Company Name, Code, Headquarters, Booking Phone, and Email are required."
      );
      return;
    }

    if (primaryMode === "Air" && awbPrefix && !/^\d{3}$/.test(awbPrefix)) {
      setError(fr ? "Le préfixe LTA doit comporter 3 chiffres (ex. 014)." : "The AWB prefix must be 3 digits (e.g. 014).");
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
      insurance: ownFleet
        ? {
            policyNumber,
            coverageAmount,
            expiryDate,
            isCompliant: new Date(expiryDate).getTime() > Date.now(),
          }
        : { policyNumber: "", coverageAmount: "", expiryDate: "", isCompliant: true },
      accountNumber: ownFleet ? "" : accountNumber.trim(),
      awbPrefix: primaryMode === "Air" ? awbPrefix.trim() : "",
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
              <HeaderIcon className="w-5 h-5 text-[#d21f27]" />
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
                {ownFleet
                  ? fr
                    ? "Enregistrez les identifiants du transporteur, l'assurance de conformité et les corridors d'exploitation standards."
                    : "Register authorized carrier credentials, compliance insurance, and standard operating corridors."
                  : fr
                  ? "Enregistrez les codes du transporteur, votre compte et vos contacts de réservation."
                  : "Register the carrier's codes, your account with them, and booking contacts."}
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
          {/* Mode comes first, since it decides which fields below apply */}
          <div>
            <span className="font-bold text-slate-700 block mb-1">{fr ? "Mode de Transport" : "Transport Mode"}</span>
            <div className="grid grid-cols-4 gap-2">
              {MODE_OPTIONS.map(({ value, en, fr: frLabel, Icon }) => {
                const selected = primaryMode === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPrimaryMode(value)}
                    aria-pressed={selected}
                    className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 rounded-xl border px-2 py-2 font-bold transition cursor-pointer ${
                      selected
                        ? "bg-[#0B2545] border-[#0B2545] text-white"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:border-[#0B2545]"
                    }`}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${selected ? "text-[#d21f27]" : "text-slate-400"}`} />
                    <span>{fr ? frLabel : en}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 1: Carrier Entity Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="font-bold text-slate-700 block mb-1">
                {language === "fr" ? "Nom de l'Entreprise" : "Company Name"}
              </label>
              <input
                type="text"
                placeholder={copy.namePlaceholder}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#0B2545] focus:bg-white rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                {copy.codeLabel}
              </label>
              <input
                type="text"
                placeholder={copy.codePlaceholder}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#0B2545] focus:bg-white rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 outline-none uppercase"
              />
            </div>
          </div>

          {/* Section 2: Mode & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              {copy.contactTitle}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  {copy.contactNameLabel}
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
                  {copy.phoneLabel}
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
                  {copy.emailLabel}
                </label>
                <input
                  type="email"
                  placeholder={copy.emailPlaceholder}
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
                {ownFleet
                  ? fr
                    ? "Terminal du Siège Social"
                    : "Headquarters Terminal"
                  : fr
                  ? "Siège Social"
                  : "Headquarters"}
              </label>
              <input
                type="text"
                placeholder={copy.hqPlaceholder}
                value={headquarters}
                onChange={(e) => setHeadquarters(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                {copy.fleetLabel}
              </label>
              <input
                type="text"
                placeholder={copy.fleetPlaceholder}
                value={fleetSize}
                onChange={(e) => setFleetSize(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
              />
            </div>

            {!ownFleet && (
              <div className={primaryMode === "Air" ? "" : "sm:col-span-2"}>
                <label className="font-bold text-slate-700 block mb-1">{copy.accountLabel}</label>
                <input
                  type="text"
                  placeholder={copy.accountPlaceholder}
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 outline-none"
                />
              </div>
            )}

            {primaryMode === "Air" && (
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {fr ? "Préfixe LTA (3 chiffres)" : "AWB Prefix (3 digits)"}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={3}
                  placeholder="e.g. 014"
                  value={awbPrefix}
                  onChange={(e) => setAwbPrefix(e.target.value.replace(/\D/g, ""))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 outline-none"
                />
              </div>
            )}

            <div className="sm:col-span-2">
              <label className="font-bold text-slate-700 block mb-1">{copy.lanesLabel}</label>
              <input
                type="text"
                placeholder={copy.lanesPlaceholder}
                value={operatingLanesStr}
                onChange={(e) => setOperatingLanesStr(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
              />
            </div>
          </div>

          {/* Section 3b: Fleet Units (Driver + Vehicle combos, for One-Click Assignment) — Road/Rail only */}
          {showUnits && (
          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
            {!ownFleet && (
              <p className="text-[11px] text-amber-700">
                {fr
                  ? "Les transporteurs maritimes et aériens n'ont pas de véhicules. Supprimez ces lignes si elles ne s'appliquent plus."
                  : "Sea and air carriers don't use fleet units. Remove these rows if they no longer apply."}
              </p>
            )}
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
          )}

          {/* Section 5: Insurance & Compliance — Road/Rail only; ocean and air liability follows the B/L or AWB terms */}
          {ownFleet && (
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
          )}

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

"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { CarrierVendor, FleetUnit, isCarrierAssignable } from "@/lib/carrierTypes";
import {
  X,
  Truck,
  Ship,
  Plane,
  Train,
  Search,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ShieldAlert,
} from "lucide-react";

interface CarrierAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called with the chosen carrier + specific driver/vehicle unit; the caller
   * decides how to apply it (create-shipment form state vs. a PATCH to an
   * existing shipment). */
  onAssign: (carrier: CarrierVendor, unit: FleetUnit) => Promise<void> | void;
  title?: string;
}

export default function CarrierAssignModal({
  isOpen,
  onClose,
  onAssign,
  title,
}: CarrierAssignModalProps) {
  const { language } = useLanguage();
  const [carriers, setCarriers] = useState<CarrierVendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCarrierId, setSelectedCarrierId] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSearch("");
    setSelectedCarrierId(null);
    setSelectedUnitId(null);
    setError(null);
    setLoading(true);
    fetch("/api/admin/carriers")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setCarriers(data.carriers || []);
        } else {
          setError(data.error || "Failed to load carriers");
        }
      })
      .catch(() => setError("Failed to load carriers"))
      .finally(() => setLoading(false));
  }, [isOpen]);

  const modeIcon = (mode: string) => {
    switch (mode) {
      case "Road":
        return <Truck className="w-3.5 h-3.5 text-blue-600" />;
      case "Sea":
        return <Ship className="w-3.5 h-3.5 text-cyan-600" />;
      case "Air":
        return <Plane className="w-3.5 h-3.5 text-sky-600" />;
      case "Rail":
        return <Train className="w-3.5 h-3.5 text-amber-600" />;
      default:
        return <Truck className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  // Only carriers with at least one unit on file are useful in a one-click picker.
  const eligibleCarriers = useMemo(() => carriers.filter((c) => c.units.length > 0), [carriers]);

  const filteredCarriers = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return eligibleCarriers;
    return eligibleCarriers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.units.some(
          (u) =>
            u.driverName.toLowerCase().includes(q) ||
            u.plateNumber.toLowerCase().includes(q) ||
            u.vehicleType.toLowerCase().includes(q)
        )
    );
  }, [eligibleCarriers, search]);

  const selectedCarrier = carriers.find((c) => c.id === selectedCarrierId) || null;
  const selectedUnit = selectedCarrier?.units.find((u) => u.id === selectedUnitId) || null;
  const carrierBlocked = selectedCarrier ? !isCarrierAssignable(selectedCarrier) : false;

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!selectedCarrier || !selectedUnit) return;
    setAssigning(true);
    setError(null);
    try {
      await onAssign(selectedCarrier, selectedUnit);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to assign carrier");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0B2545] text-white flex items-center justify-center flex-shrink-0">
              <Truck className="w-5 h-5 text-[#d21f27]" />
            </div>
            <div>
              <h3 className="font-bold text-[#0B2545] text-base leading-tight">
                {title ||
                  (language === "fr"
                    ? "Assigner un Transporteur Enregistré"
                    : "Assign a Saved Carrier")}
              </h3>
              <p className="text-[11px] text-slate-500">
                {selectedCarrier
                  ? language === "fr"
                    ? "Sélectionnez le véhicule et le chauffeur à assigner."
                    : "Pick the specific driver + vehicle to assign."
                  : language === "fr"
                  ? "Sélectionnez un partenaire du répertoire."
                  : "Pick a partner from the directory."}
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

        {!selectedCarrier ? (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder={
                  language === "fr" ? "Rechercher transporteur, chauffeur, plaque..." : "Search carrier, driver, plate..."
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#0B2545] focus:bg-white rounded-xl pl-8 pr-3 py-2 text-xs text-slate-800 outline-none transition"
              />
            </div>

            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {loading ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  {language === "fr" ? "Chargement des transporteurs..." : "Loading carriers..."}
                </div>
              ) : filteredCarriers.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  {carriers.length === 0
                    ? language === "fr"
                      ? "Aucun transporteur trouvé."
                      : "No carriers found."
                    : language === "fr"
                    ? "Aucun transporteur avec un véhicule enregistré ne correspond. Ajoutez un véhicule dans le répertoire des transporteurs."
                    : "No carrier with a registered unit matches. Add a vehicle to a carrier in the directory first."}
                </div>
              ) : (
                filteredCarriers.map((carrier) => {
                  const blocked = !isCarrierAssignable(carrier);
                  const activeUnits = carrier.units.filter((u) => u.active).length;
                  return (
                    <button
                      key={carrier.id}
                      type="button"
                      onClick={() => setSelectedCarrierId(carrier.id)}
                      className="w-full text-left p-3 flex items-center gap-2.5 transition cursor-pointer hover:bg-slate-50"
                    >
                      <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                        {modeIcon(carrier.primaryMode)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-[#0B2545] text-xs block truncate">
                          {carrier.name}
                        </span>
                        <span className="text-[10px] text-slate-500 block truncate">
                          {activeUnits} {language === "fr" ? "véhicule(s) actif(s)" : "active unit(s)"}
                        </span>
                      </div>
                      {blocked && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-[9px] font-bold flex-shrink-0">
                          <ShieldAlert className="w-2.5 h-2.5" />
                          {carrier.status !== "Active"
                            ? carrier.status
                            : language === "fr"
                            ? "Assurance Expirée"
                            : "Insurance Expired"}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                setSelectedCarrierId(null);
                setSelectedUnitId(null);
              }}
              className="text-[11px] font-bold text-slate-500 hover:text-[#0B2545] transition cursor-pointer inline-flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>{language === "fr" ? "Retour aux Transporteurs" : "Back to Carriers"}</span>
            </button>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                {modeIcon(selectedCarrier.primaryMode)}
              </div>
              <span className="font-bold text-[#0B2545] text-xs">{selectedCarrier.name}</span>
            </div>

            {carrierBlocked && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-[11px] font-medium flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>
                  {language === "fr"
                    ? `Ce transporteur ne peut pas être assigné : statut "${selectedCarrier.status}" ou assurance expirée. Mettez à jour son dossier de conformité d'abord.`
                    : `This carrier can't be assigned: status is "${selectedCarrier.status}" or its insurance has expired. Update its compliance record first.`}
                </span>
              </div>
            )}

            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-60 overflow-y-auto">
              {selectedCarrier.units.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  {language === "fr" ? "Aucun véhicule enregistré pour ce transporteur." : "No units on file for this carrier."}
                </div>
              ) : (
                selectedCarrier.units.map((unit) => {
                  const isSelected = unit.id === selectedUnitId;
                  const disabled = carrierBlocked || !unit.active;
                  return (
                    <button
                      key={unit.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => setSelectedUnitId(unit.id)}
                      className={`w-full text-left p-3 flex items-center gap-2.5 transition ${
                        disabled
                          ? "opacity-50 cursor-not-allowed"
                          : isSelected
                          ? "bg-[#0B2545]/5 cursor-pointer"
                          : "hover:bg-slate-50 cursor-pointer"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-[#0B2545] text-xs block truncate">
                          {unit.driverName}
                        </span>
                        <span className="text-[10px] text-slate-500 block truncate">
                          {unit.vehicleType} • {unit.plateNumber}
                          {!unit.active ? ` • ${language === "fr" ? "Inactif" : "Inactive"}` : ""}
                        </span>
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-[#0B2545] flex-shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}

        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={assigning}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            {language === "fr" ? "Annuler" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedUnit || carrierBlocked || assigning}
            className="px-4 py-2 bg-[#0B2545] hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            {assigning
              ? language === "fr"
                ? "Assignation..."
                : "Assigning..."
              : language === "fr"
              ? "Confirmer l'Assignation"
              : "Confirm Assignment"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Transimex Canada Price Estimator Calculation Engine
 * Implements standard freight forwarding rating rules (IATA, Ocean CBM/FCL, Highway Land).
 */

import {
  FreightMode,
  RateCard,
  SEED_RATE_CARDS,
} from "./rateCards";

export interface EstimateRequest {
  origin: string; // ISO 2 code (e.g. "CA")
  destination: string; // ISO 2 code (e.g. "CM", "GH")
  mode: FreightMode;
  dimensions?: {
    length_cm: number;
    width_cm: number;
    height_cm: number;
  };
  package_count?: number;
  actual_weight_kg?: number;
  cbm?: number; // for sea_lcl
  container_size?: "20ft" | "40ft"; // for sea_fcl
  declared_value?: number; // for insurance
}

export interface CostBreakdown {
  base_cost: number;
  fuel_surcharge: number;
  fuel_surcharge_pct: number;
  customs_handling_fee: number;
  insurance: number;
  insurance_pct: number;
}

export interface EstimateResult {
  success: boolean;
  rateCardId?: string;
  origin: string;
  destination: string;
  destination_hub?: string;
  mode: FreightMode;
  mode_label?: string;
  actual_weight_kg: number;
  volumetric_weight_kg: number;
  chargeable_weight_kg: number;
  cbm_calculated: number;
  rate_applied: number;
  pricing_unit: "per_kg" | "per_cbm" | "per_container";
  breakdown: CostBreakdown;
  subtotal: number;
  min_charge: number;
  min_charge_applied: boolean;
  total_estimate: number;
  currency: "CAD";
  transit_time_days: string;
  error?: string;
}

// In-memory or localStorage-synced RateCards store
let activeRateCards: RateCard[] = [...SEED_RATE_CARDS];

export function getAllRateCards(): RateCard[] {
  return activeRateCards;
}

export function updateRateCard(updatedCard: RateCard): void {
  activeRateCards = activeRateCards.map((rc) =>
    rc.id === updatedCard.id ? updatedCard : rc
  );
}

export function findRateCard(
  origin: string,
  destination: string,
  mode: FreightMode
): RateCard | undefined {
  return activeRateCards.find(
    (rc) =>
      rc.active &&
      rc.origin_country.toUpperCase() === origin.toUpperCase() &&
      rc.destination_country.toUpperCase() === destination.toUpperCase() &&
      rc.mode === mode
  );
}

/**
 * Main Freight Rating Engine
 */
export function calculateFreightEstimate(req: EstimateRequest): EstimateResult {
  const card = findRateCard(req.origin, req.destination, req.mode);

  if (!card) {
    return {
      success: false,
      origin: req.origin,
      destination: req.destination,
      mode: req.mode,
      actual_weight_kg: 0,
      volumetric_weight_kg: 0,
      chargeable_weight_kg: 0,
      cbm_calculated: 0,
      rate_applied: 0,
      pricing_unit: "per_kg",
      breakdown: {
        base_cost: 0,
        fuel_surcharge: 0,
        fuel_surcharge_pct: 0,
        customs_handling_fee: 0,
        insurance: 0,
        insurance_pct: 0,
      },
      subtotal: 0,
      min_charge: 0,
      min_charge_applied: false,
      total_estimate: 0,
      currency: "CAD",
      transit_time_days: "N/A",
      error: `Corridor ${req.origin} → ${req.destination} for ${req.mode} is not currently covered in automated tariffs. Please request a custom dispatch quote.`,
    };
  }

  const count = Math.max(req.package_count || 1, 1);
  const actualKg = Math.max(req.actual_weight_kg || 0, 0);

  // 1. Calculate Dimensions and Volume
  let volWeightKg = 0;
  let cbm = req.cbm || 0;

  if (req.dimensions && req.dimensions.length_cm > 0) {
    const volumeCm3 =
      req.dimensions.length_cm *
      req.dimensions.width_cm *
      req.dimensions.height_cm *
      count;

    if (card.volumetric_divisor > 1) {
      volWeightKg = volumeCm3 / card.volumetric_divisor;
    }

    if (!req.cbm || req.cbm === 0) {
      cbm = volumeCm3 / 1_000_000;
    }
  }

  let chargeableKg = Math.max(actualKg, volWeightKg);
  let rateApplied = 0;
  let pricingUnit: "per_kg" | "per_cbm" | "per_container" = "per_kg";
  let baseCost = 0;

  // 2. Compute Base Cost based on Mode
  if (req.mode === "sea_fcl") {
    pricingUnit = "per_container";
    const size = req.container_size || "20ft";
    rateApplied = card.flat_container_rates?.[size] || card.min_charge;
    baseCost = rateApplied;
  } else if (req.mode === "sea_lcl") {
    pricingUnit = "per_cbm";
    // standard LCL rating: 1 CBM = 1000 kg or direct CBM
    const billedCbm = Math.max(cbm, actualKg / 1000, 1.0);
    rateApplied = card.rate_per_cbm || 280;
    baseCost = billedCbm * rateApplied;
    cbm = billedCbm;
  } else {
    // Air or Land weight breaks tier match
    pricingUnit = "per_kg";
    if (chargeableKg === 0) {
      chargeableKg = 1; // minimum 1 kg
    }

    if (card.weight_breaks && card.weight_breaks.length > 0) {
      const matchedTier = card.weight_breaks.find(
        (tier) => chargeableKg >= tier.min_kg && chargeableKg < tier.max_kg
      );
      if (matchedTier) {
        rateApplied = matchedTier.rate_per_kg;
      } else {
        rateApplied =
          card.weight_breaks[card.weight_breaks.length - 1].rate_per_kg;
      }
    } else {
      rateApplied = 10.0;
    }

    baseCost = chargeableKg * rateApplied;
  }

  // 3. Surcharges
  const fuelSurcharge = Math.round(baseCost * card.fuel_surcharge_pct * 100) / 100;
  const customsFee = card.customs_handling_fee;

  let insuranceCost = 0;
  if (req.declared_value && req.declared_value > 0) {
    insuranceCost =
      Math.round(req.declared_value * card.insurance_pct * 100) / 100;
  }

  const rawSubtotal = baseCost + fuelSurcharge + customsFee + insuranceCost;
  const minChargeApplied = rawSubtotal < card.min_charge;
  const finalTotal = minChargeApplied ? card.min_charge : rawSubtotal;

  return {
    success: true,
    rateCardId: card.id,
    origin: card.origin_country,
    destination: card.destination_country,
    destination_hub: card.destination_hub,
    mode: card.mode,
    mode_label: card.mode_label,
    actual_weight_kg: Math.round(actualKg * 10) / 10,
    volumetric_weight_kg: Math.round(volWeightKg * 10) / 10,
    chargeable_weight_kg: Math.round(chargeableKg * 10) / 10,
    cbm_calculated: Math.round(cbm * 100) / 100,
    rate_applied: rateApplied,
    pricing_unit: pricingUnit,
    breakdown: {
      base_cost: Math.round(baseCost * 100) / 100,
      fuel_surcharge: fuelSurcharge,
      fuel_surcharge_pct: card.fuel_surcharge_pct,
      customs_handling_fee: customsFee,
      insurance: insuranceCost,
      insurance_pct: card.insurance_pct,
    },
    subtotal: Math.round(rawSubtotal * 100) / 100,
    min_charge: card.min_charge,
    min_charge_applied: minChargeApplied,
    total_estimate: Math.round(finalTotal * 100) / 100,
    currency: "CAD",
    transit_time_days: card.transit_time_days,
  };
}

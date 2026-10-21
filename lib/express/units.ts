/**
 * The booking forms accept pounds and inches (DHL's own sheets use them) or kilograms and centimetres.
 * Everything sent to the server and to DHL is metric, so these convert at the form's edge.
 */
export type UnitSystem = "imperial" | "metric";

const KG_PER_LB = 0.45359237;
const CM_PER_IN = 2.54;

const round = (v: number, dp: number) => Math.round(v * 10 ** dp) / 10 ** dp;

export const weightToKg = (v: number, units: UnitSystem) => (units === "imperial" ? round(v * KG_PER_LB, 3) : v);
export const lengthToCm = (v: number, units: UnitSystem) => (units === "imperial" ? round(v * CM_PER_IN, 1) : v);

/** A weight in kilograms, shown in the chosen unit. */
export const weightFromKg = (kg: number, units: UnitSystem) => round(units === "imperial" ? kg / KG_PER_LB : kg, 1);

export const weightUnit = (units: UnitSystem) => (units === "imperial" ? "lb" : "kg");

/** Swaps the unit in a translated label such as "Weight (kg)" or "Length (cm)". */
export const unitLabel = (label: string, units: UnitSystem) => (units === "imperial" ? label.replace("(kg)", "(lb)").replace("(cm)", "(in)") : label);

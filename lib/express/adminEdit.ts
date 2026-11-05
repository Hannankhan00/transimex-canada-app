import { z } from "zod";
import type { IExpressAdminEdit, IExpressShipment } from "@/models/ExpressShipment";
import { bookingSchema } from "./shipmentSchemas";

/**
 * Staff corrections to a booking that has no DHL label yet (a client hit a problem, or DHL refused something, and
 * the DHL team fixed it with the client): the addresses, DHL pickup or drop-off, the ship date and who pays duties. Every edit needs a reason and leaves a field-by-field record on the
 * booking AND an audit entry. The price the client paid is never recalculated here.
 */

const weekday = (d: string) => {
  const day = new Date(`${d}T12:00:00Z`).getUTCDay();
  return day !== 0 && day !== 6;
};
const todayUtc = () => new Date().toISOString().slice(0, 10);
const addDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

export const adminEditSchema = z.object({
  // Deliberately not editable: the countries, the parcels (weight and size) and the items. They set the price and
  // the DHL service, so a change there needs a new booking.
  shipper: bookingSchema.shape.shipper,
  recipient: bookingSchema.shape.recipient.omit({ countryCode: true }),
  pickupRequested: z.boolean(),
  plannedShipDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .refine((d) => d >= todayUtc() && d <= addDays(60), "Ship date must be today or within the next 60 days")
    .refine(weekday, "Choose a weekday: DHL does not collect on weekends"),
  dutiesPayer: z.enum(["recipient", "sender"]),
  reason: z
    .string({ required_error: "Give the reason for this change" })
    .trim()
    .min(5, "Give the reason for this change (at least 5 characters)")
    .max(300),
});

export type AdminEditInput = z.infer<typeof adminEditSchema>;

type EditableDoc = Pick<IExpressShipment, "status" | "trackingNumber" | "pickupConfirmation" | "fulfilment">;
export type EditBlock = "has_label" | "cancelled" | "in_progress" | "outcome_unknown";

/** Why a booking cannot be edited, or null when it can. Only a booking with no DHL parcel yet can change. */
export function editBlockReason(sh: EditableDoc): EditBlock | null {
  if (sh.status === "cancelled") return "cancelled";
  if (sh.status === "label_ready" || sh.trackingNumber || sh.pickupConfirmation) return "has_label";
  if (sh.fulfilment?.state === "pending") return "in_progress";
  if (sh.fulfilment?.state === "unknown") return "outcome_unknown";
  return null;
}

export const EDIT_BLOCK_TEXT: Record<EditBlock, string> = {
  has_label: "DHL already has this parcel. Cancel the booking and make a new one to change it.",
  cancelled: "A cancelled booking cannot be edited.",
  in_progress: "The label is being created right now. Try again in a minute.",
  outcome_unknown: "DHL may already have booked this parcel. Check with DHL first; it cannot be edited until that is settled.",
};

type Change = IExpressAdminEdit["changes"][number];

const show = (v: unknown): string => (v === undefined || v === null || v === "" ? "(empty)" : String(v)).slice(0, 300);
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

function diffFlat(
  out: Change[],
  prefix: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  labels: Record<string, string>,
  fmt: (k: string, v: unknown) => string = (_k, v) => show(v)
) {
  for (const key of Object.keys(labels)) {
    const a = before[key] ?? "";
    const b = after[key] ?? "";
    if (String(a) !== String(b)) out.push({ field: `${prefix}${labels[key]}`, from: fmt(key, before[key]), to: fmt(key, after[key]) });
  }
}

const ADDRESS_LABELS = { name: "name", company: "company", line1: "address line 1", line2: "address line 2", city: "city", region: "province / state", postalCode: "postal code", phone: "phone", email: "email" };
const PARCEL_LABELS = { weightKg: "weight (kg)", lengthCm: "length (cm)", widthCm: "width (cm)", heightCm: "height (cm)" };
const ITEM_LABELS = { description: "description", hsCode: "HS code", quantity: "quantity", unitValueCents: "unit value", countryOfOrigin: "country of origin", netWeightKg: "net weight (kg)", exportReason: "export reason" };

export type EditSnapshot = Pick<IExpressShipment, "shipper" | "recipient" | "parcels" | "items" | "contentDescription" | "pickupRequested" | "plannedShipDate" | "dutiesPayer">;

const asRecord = (o: unknown) => (o ?? {}) as Record<string, unknown>;

/** A readable list of what changed between two versions of a booking. Empty when nothing did. */
export function diffShipment(before: EditSnapshot, after: EditSnapshot): Change[] {
  const out: Change[] = [];
  diffFlat(out, "Sender ", asRecord(before.shipper), asRecord(after.shipper), ADDRESS_LABELS);
  diffFlat(out, "Recipient ", asRecord(before.recipient), asRecord(after.recipient), ADDRESS_LABELS);

  const listDiff = (
    name: string,
    a: unknown[],
    b: unknown[],
    labels: Record<string, string>,
    describe: (x: Record<string, unknown>) => string,
    fmt?: (k: string, v: unknown) => string
  ) => {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if (i >= a.length) out.push({ field: `${name} ${i + 1}`, from: "(none)", to: `added: ${describe(asRecord(b[i]))}` });
      else if (i >= b.length) out.push({ field: `${name} ${i + 1}`, from: describe(asRecord(a[i])), to: "removed" });
      else diffFlat(out, `${name} ${i + 1} `, asRecord(a[i]), asRecord(b[i]), labels, fmt);
    }
  };
  listDiff("Parcel", before.parcels ?? [], after.parcels ?? [], PARCEL_LABELS, (p) => `${p.weightKg} kg, ${p.lengthCm}x${p.widthCm}x${p.heightCm} cm`);
  listDiff(
    "Item",
    before.items ?? [],
    after.items ?? [],
    ITEM_LABELS,
    (i) => `${i.description} x${i.quantity} at ${money(Number(i.unitValueCents))}`,
    (k, v) => (k === "unitValueCents" ? money(Number(v)) : show(v))
  );

  if ((before.contentDescription ?? "") !== (after.contentDescription ?? "")) {
    out.push({ field: "Contents description", from: show(before.contentDescription), to: show(after.contentDescription) });
  }
  if (Boolean(before.pickupRequested) !== Boolean(after.pickupRequested)) {
    const label = (on: boolean) => (on ? "DHL pickup" : "Drop-off at a DHL service point");
    out.push({ field: "Pickup", from: label(Boolean(before.pickupRequested)), to: label(Boolean(after.pickupRequested)) });
  }
  if (before.plannedShipDate !== after.plannedShipDate) out.push({ field: "Shipping date", from: show(before.plannedShipDate), to: show(after.plannedShipDate) });
  if (before.dutiesPayer !== after.dutiesPayer) out.push({ field: "Duties and taxes paid by", from: show(before.dutiesPayer), to: show(after.dutiesPayer) });
  return out;
}

/** One line for the audit log: who and when come from the entry itself. */
export function auditDetails(reference: string, reason: string, changes: Change[]): string {
  return `Edited ${reference}. Reason: ${reason}. Changes: ${changes.map((c) => `${c.field}: ${c.from} -> ${c.to}`).join("; ")}`;
}

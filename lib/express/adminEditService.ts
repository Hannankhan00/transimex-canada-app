import connectDB from "@/lib/mongoose";
import ExpressShipment, { type IExpressAdminEdit, type IExpressShipment } from "@/models/ExpressShipment";
import type { TokenPayload } from "@/lib/auth";
import { contentTypeOf } from "./contentType";
import { EDIT_BLOCK_TEXT, diffShipment, editBlockReason, type AdminEditInput, type EditSnapshot } from "./adminEdit";

type Change = IExpressAdminEdit["changes"][number];

export type AdminEditResult =
  | { ok: true; changes: Change[]; reference: string }
  | { ok: false; code: "not_found" | "blocked" | "invalid" | "no_changes" | "conflict"; message: string; fields?: { path: string; message: string }[] };

/** Applies a staff edit atomically and records it on the booking. The caller writes the audit entry. */
export async function applyAdminEdit(shipmentId: string, input: AdminEditInput, actor: TokenPayload, now: Date = new Date()): Promise<AdminEditResult> {
  await connectDB();
  const sh = await ExpressShipment.findById(shipmentId).lean<IExpressShipment>();
  if (!sh) return { ok: false, code: "not_found", message: "Shipment not found" };

  const blocked = editBlockReason(sh);
  if (blocked) return { ok: false, code: "blocked", message: EDIT_BLOCK_TEXT[blocked] };

  const after = {
    shipper: { ...input.shipper, countryCode: sh.shipper.countryCode },
    recipient: { ...input.recipient, countryCode: sh.recipient.countryCode },
    parcels: sh.parcels,
    items: sh.items,
    contentDescription: sh.contentDescription,
    pickupRequested: input.pickupRequested,
    plannedShipDate: input.plannedShipDate,
    dutiesPayer: contentTypeOf(sh.contentType) === "documents" ? sh.dutiesPayer : input.dutiesPayer,
  };

  const changes = diffShipment(sh, after as unknown as EditSnapshot);
  if (changes.length === 0) return { ok: false, code: "no_changes", message: "Nothing was changed." };

  const entry: IExpressAdminEdit = { at: now, by: actor.userId, byName: actor.name, byEmail: actor.email, reason: input.reason, changes };

  // Only a booking that is still editable is updated, so an edit racing a label or a cancel cannot land after it.
  const updated = await ExpressShipment.findOneAndUpdate(
    {
      _id: shipmentId,
      status: { $in: ["awaiting_payment", "paid"] },
      trackingNumber: { $exists: false },
      "fulfilment.state": { $nin: ["pending", "unknown", "ok"] },
    },
    { $set: { shipper: after.shipper, recipient: after.recipient, pickupRequested: after.pickupRequested, plannedShipDate: after.plannedShipDate, dutiesPayer: after.dutiesPayer }, $push: { adminEdits: entry } },
    { returnDocument: "after" }
  ).lean();
  if (!updated) return { ok: false, code: "conflict", message: "The booking changed while you were editing (a label or cancellation went through). Reload and check it." };

  return { ok: true, changes, reference: sh.reference };
}

import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { logAuditStrict } from "@/lib/audit";
import { requireExpressStaff, validationError } from "@/lib/express/access";
import { adminEditSchema, auditDetails } from "@/lib/express/adminEdit";
import { applyAdminEdit } from "@/lib/express/adminEditService";
import { notifyShipmentEvent } from "@/lib/express/shipmentNotify";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Staff correct a booking that DHL does not have yet (address, parcels, items, pickup or drop-off, ship date).
 * A reason is required. The change is saved on the booking with who, when and what, and written to the audit log.
 * The price the client paid is not recalculated.
 */
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const access = await requireExpressStaff();
    if (access.error) return access.error;

    const { id } = await params;
    if (!isValidObjectId(id)) return NextResponse.json({ error: "Shipment not found" }, { status: 404 });

    const body = await req.json().catch(() => null);
    const parsed = adminEditSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const result = await applyAdminEdit(id, parsed.data, access.actor);
    if (!result.ok) {
      const status = result.code === "not_found" ? 404 : result.code === "invalid" ? 422 : 409;
      return NextResponse.json({ error: result.message, code: result.code, ...(result.fields ? { fields: result.fields } : {}) }, { status });
    }

    // Tell the client what changed (the staff reason stays internal). Best effort: it never blocks the edit.
    const summary = result.changes.map((c) => `${c.field}: ${c.from} → ${c.to}`).join("; ").slice(0, 600);
    await notifyShipmentEvent(id, "details_updated", summary);

    // The edit is already saved on the booking with the same facts; a failure here is reported, never hidden.
    try {
      await logAuditStrict({
        actor: access.actor,
        action: "EXPRESS_SHIPMENT_EDITED",
        resourceType: "ExpressShipment",
        resourceId: id,
        details: auditDetails(result.reference, parsed.data.reason, result.changes),
      });
    } catch (error) {
      console.error("Express shipment edit saved but the audit log entry failed:", error);
      return NextResponse.json({ success: true, changes: result.changes, warning: "Saved, but the audit log entry could not be written. The change is recorded on the booking." });
    }

    return NextResponse.json({ success: true, changes: result.changes });
  } catch (error) {
    console.error("Express admin shipment edit error:", error);
    return NextResponse.json({ error: "Failed to save the changes" }, { status: 500 });
  }
}

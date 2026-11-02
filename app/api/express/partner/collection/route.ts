import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import ExpressAccount from "@/models/ExpressAccount";
import { logAudit } from "@/lib/audit";
import { validationError } from "@/lib/express/access";
import { requireActivePartner } from "@/lib/express/partnerAccess";
import { collectionSchema } from "@/lib/express/payoutDetails";

/**
 * How the partner's customers pay: on the partner's own Stripe account, or to Transimex (which tracks the partner's
 * earnings and pays them out). Only affects bookings made from now on: an existing booking keeps the way it was set up.
 */
export async function PUT(req: Request) {
  try {
    const access = await requireActivePartner();
    if (access.error) return access.error;

    const parsed = collectionSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return validationError(parsed.error);

    await connectDB();
    await ExpressAccount.updateOne({ _id: access.account._id }, { $set: { "partner.customerPayments": parsed.data.collection } });
    await logAudit({
      actor: access.actor,
      action: "EXPRESS_PARTNER_COLLECTION_CHANGED",
      resourceType: "ExpressAccount",
      resourceId: String(access.account._id),
      details: `Partner chose to collect customer payments via ${parsed.data.collection === "stripe" ? "their own Stripe account" : "Transimex"}`,
    });
    return NextResponse.json({ success: true, collection: parsed.data.collection });
  } catch (error) {
    console.error("Express partner collection error:", error);
    return NextResponse.json({ error: "Failed to save your choice" }, { status: 500 });
  }
}

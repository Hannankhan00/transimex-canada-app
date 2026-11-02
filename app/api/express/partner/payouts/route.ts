import { NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { validationError } from "@/lib/express/access";
import { requireActivePartner } from "@/lib/express/partnerAccess";
import { payoutRequestSchema } from "@/lib/express/payoutDetails";
import { reconcilePartner, requestPayout } from "@/lib/express/partnerPayouts";
import { alertStaffPayoutRequested, notifyPartnerPayout } from "@/lib/express/partnerPayoutNotify";

/** The partner asks to be paid some or all of what they can withdraw. Every rule is checked here, not on the screen. */
export async function POST(req: Request) {
  try {
    const access = await requireActivePartner();
    if (access.error) return access.error;

    const parsed = payoutRequestSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return validationError(parsed.error);

    const accountId = String(access.account._id);
    await reconcilePartner(accountId);
    const result = await requestPayout({ account: access.account, amountCents: parsed.data.amount });
    if (!result.ok) return NextResponse.json({ error: result.message, code: result.code }, { status: result.code === "exceeds_balance" || result.code === "open_request" ? 409 : 422 });

    await logAudit({
      actor: access.actor,
      action: "EXPRESS_PARTNER_PAYOUT_REQUESTED",
      resourceType: "ExpressPartnerPayout",
      resourceId: String(result.payout._id),
      details: `Partner requested a payout of ${(result.payout.amountCents / 100).toFixed(2)} CAD`,
    });
    await Promise.all([
      notifyPartnerPayout({ partnerAccountId: accountId, kind: "requested", amountCents: result.payout.amountCents }),
      alertStaffPayoutRequested({ partnerAccountId: accountId, amountCents: result.payout.amountCents }),
    ]);
    return NextResponse.json({ success: true, id: String(result.payout._id) }, { status: 201 });
  } catch (error) {
    console.error("Express partner payout request error:", error);
    return NextResponse.json({ error: "Failed to request the payout" }, { status: 500 });
  }
}

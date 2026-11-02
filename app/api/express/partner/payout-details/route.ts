import { NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { validationError } from "@/lib/express/access";
import { requireActivePartner } from "@/lib/express/partnerAccess";
import { payoutDetailsSchema } from "@/lib/express/payoutDetails";
import { PayoutCryptoError } from "@/lib/express/payoutCrypto";
import { savePayoutDetails } from "@/lib/express/partnerPayouts";
import { notifyPartnerPayout } from "@/lib/express/partnerPayoutNotify";

/** Where the partner wants to be paid. Stored encrypted; changing it pauses payout requests for 24 hours. */
export async function PUT(req: Request) {
  try {
    const access = await requireActivePartner();
    if (access.error) return access.error;

    const parsed = payoutDetailsSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return validationError(parsed.error);

    const { masked } = await savePayoutDetails({ accountId: String(access.account._id), details: parsed.data });
    // The audit line carries only the masked label, never the account number.
    await logAudit({
      actor: access.actor,
      action: "EXPRESS_PARTNER_PAYOUT_DETAILS_CHANGED",
      resourceType: "ExpressAccount",
      resourceId: String(access.account._id),
      details: `Partner payout details set to: ${masked}`,
    });
    // Tell the owner, so a hijacked login cannot quietly redirect payouts.
    await notifyPartnerPayout({ partnerAccountId: String(access.account._id), kind: "details_changed" });
    return NextResponse.json({ success: true, payoutDetails: { method: parsed.data.method, masked, updatedAt: new Date().toISOString() } });
  } catch (error) {
    if (error instanceof PayoutCryptoError) {
      console.error("Express payout details encryption is not set up:", error.message);
      return NextResponse.json({ error: "Saving payout details is not available yet. Please contact us.", code: "crypto_not_configured" }, { status: 503 });
    }
    console.error("Express partner payout details error:", error);
    return NextResponse.json({ error: "Failed to save your payout details" }, { status: 500 });
  }
}

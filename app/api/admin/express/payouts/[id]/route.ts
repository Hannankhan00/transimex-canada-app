import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import connectDB from "@/lib/mongoose";
import ExpressPartnerPayout from "@/models/ExpressPartnerPayout";
import { logAudit, logAuditStrict } from "@/lib/audit";
import { requireExpressStaff, validationError } from "@/lib/express/access";
import { payoutResolveSchema } from "@/lib/express/payoutDetails";
import { decryptPayoutDetails, PayoutCryptoError } from "@/lib/express/payoutCrypto";
import { resolvePayout } from "@/lib/express/partnerPayouts";
import { notifyPartnerPayout } from "@/lib/express/partnerPayoutNotify";

type Ctx = { params: Promise<{ id: string }> };

/**
 * The real payout details of ONE request, so staff can send the money. Every look is written to the audit log, and
 * the answer is never cached.
 */
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const access = await requireExpressStaff();
    if (access.error) return access.error;
    const { id } = await params;
    if (!isValidObjectId(id)) return NextResponse.json({ error: "Payout request not found" }, { status: 404 });

    await connectDB();
    const payout = await ExpressPartnerPayout.findById(id).select("destinationCipher partnerAccountId amountCents status").lean();
    if (!payout) return NextResponse.json({ error: "Payout request not found" }, { status: 404 });
    // Only a request still waiting to be paid needs its details. Settled ones stay sealed.
    if (payout.status !== "requested") {
      return NextResponse.json({ error: "This request was already handled.", code: "not_open" }, { status: 409, headers: { "Cache-Control": "no-store" } });
    }

    // The look is recorded BEFORE the details leave the server, and no record means no details.
    try {
      await logAuditStrict({
        actor: access.actor,
        action: "EXPRESS_PARTNER_PAYOUT_DETAILS_VIEWED",
        resourceType: "ExpressPartnerPayout",
        resourceId: id,
        details: `Staff opened the payout details of a ${(payout.amountCents / 100).toFixed(2)} CAD request (partner account ${payout.partnerAccountId})`,
      });
    } catch (auditError) {
      console.error("Express payout details view not audited, so not shown:", auditError);
      return NextResponse.json({ error: "The access could not be recorded, so the details were not shown. Try again." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
    const details = decryptPayoutDetails(payout.destinationCipher);
    return NextResponse.json({ success: true, details }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof PayoutCryptoError) {
      console.error("Express payout details could not be read:", error.message);
      return NextResponse.json({ error: "The payout details could not be read (check PAYOUT_ENCRYPTION_KEY)." }, { status: 503 });
    }
    console.error("Express admin payout details error:", error);
    return NextResponse.json({ error: "Failed to load the payout details" }, { status: 500 });
  }
}

/** Staff mark a request paid (with the transfer's reference) or reject it (with a reason). */
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const access = await requireExpressStaff();
    if (access.error) return access.error;
    const { id } = await params;

    const parsed = payoutResolveSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return validationError(parsed.error);

    const result = await resolvePayout({
      payoutId: id,
      actorId: access.actor.userId,
      action: parsed.data.action,
      reference: parsed.data.action === "paid" ? parsed.data.reference : undefined,
      reason: parsed.data.action === "reject" ? parsed.data.reason : undefined,
    });
    if (!result.ok) return NextResponse.json({ error: result.message, code: result.code }, { status: result.code === "not_found" ? 404 : 409 });

    const p = result.payout;
    await logAudit({
      actor: access.actor,
      action: parsed.data.action === "paid" ? "EXPRESS_PARTNER_PAYOUT_PAID" : "EXPRESS_PARTNER_PAYOUT_REJECTED",
      resourceType: "ExpressPartnerPayout",
      resourceId: id,
      details: parsed.data.action === "paid" ? `Marked a partner payout of ${(p.amountCents / 100).toFixed(2)} CAD paid (ref ${parsed.data.reference})` : `Rejected a partner payout of ${(p.amountCents / 100).toFixed(2)} CAD: ${parsed.data.reason}`,
    });
    await notifyPartnerPayout({
      partnerAccountId: p.partnerAccountId,
      kind: parsed.data.action === "paid" ? "paid" : "rejected",
      amountCents: p.amountCents,
      reference: p.reference,
      reason: p.rejectedReason,
    });
    return NextResponse.json({ success: true, status: p.status });
  } catch (error) {
    console.error("Express admin payout resolve error:", error);
    return NextResponse.json({ error: "Failed to update the payout request" }, { status: 500 });
  }
}

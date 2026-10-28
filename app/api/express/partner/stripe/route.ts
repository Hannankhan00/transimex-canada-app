import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import { requireActivePartner } from "@/lib/express/partnerAccess";
import { getConnectClient, PaymentError } from "@/lib/express/payments";
import { refreshPartnerStripe, startPartnerOnboarding, toStripeStatus } from "@/lib/express/partnerStripe";

export const dynamic = "force-dynamic";

const baseUrlOf = (req: Request) => process.env.APP_URL || process.env.NEXTAUTH_URL || new URL(req.url).origin;

/** The partner's Stripe connection. ?refresh=1 asks Stripe for the latest first (used when they come back from setup). */
export async function GET(req: Request) {
  try {
    const access = await requireActivePartner();
    if (access.error) return access.error;

    if (new URL(req.url).searchParams.get("refresh") === "1" && access.account.partner?.stripe?.accountId) {
      const client = getConnectClient();
      if (client) return NextResponse.json({ success: true, stripe: await refreshPartnerStripe({ accountId: String(access.account._id), client }) });
    }
    return NextResponse.json({ success: true, stripe: toStripeStatus(access.account.partner?.stripe) });
  } catch (error) {
    console.error("Express partner Stripe status error:", error instanceof PaymentError ? error.detail || error.message : error);
    return NextResponse.json({ error: "Could not check your Stripe connection" }, { status: 502 });
  }
}

/** Starts (or resumes) connecting the partner's Stripe account and returns the Stripe page to open. */
export async function POST(req: Request) {
  try {
    const access = await requireActivePartner();
    if (access.error) return access.error;

    const client = getConnectClient();
    if (!client) return NextResponse.json({ error: "Card payments are not available right now.", code: "payments_off" }, { status: 503 });

    await connectDB();
    const user = await User.findById(access.actor.userId).select("email").lean<any>();
    const { url } = await startPartnerOnboarding({ account: access.account, email: user?.email, baseUrl: baseUrlOf(req), client });
    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error("Express partner Stripe connect error:", error instanceof PaymentError ? error.detail || error.message : error);
    return NextResponse.json({ error: "Could not open Stripe's setup page. Please try again." }, { status: 502 });
  }
}

import { isValidObjectId } from "mongoose";
import connectDB from "@/lib/mongoose";
import ExpressAccount, { type IExpressAccount, type IExpressPartnerStripe } from "@/models/ExpressAccount";
import type { ConnectClient } from "./payments/connect";

/** A partner can take their customers' card payments once Stripe says the account can accept charges. */
export const partnerCanCharge = (stripe: IExpressPartnerStripe | null | undefined): stripe is IExpressPartnerStripe => Boolean(stripe?.accountId && stripe.chargesEnabled);

/**
 * How a partner's customers can pay, or null when they cannot book yet.
 *  - "stripe": on the partner's own Stripe account (needs Stripe to allow charges).
 *  - "transimex": to Transimex, which tracks and pays out the partner's earnings (needs nothing more).
 * A partner who has not chosen yet is treated as "stripe", so nobody is switched into payouts by accident.
 */
export function customerBookingMode(partner: Pick<IExpressAccount, "partner"> | null | undefined): "stripe" | "transimex" | null {
  const mode = partner?.partner?.customerPayments ?? "stripe";
  if (mode === "transimex") return "transimex";
  return partnerCanCharge(partner?.partner?.stripe) ? "stripe" : null;
}

export interface PartnerStripeStatus {
  connected: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  /** Connected to Stripe but Stripe still needs details from the partner. */
  needsMoreInfo: boolean;
}

export const toStripeStatus = (stripe: IExpressPartnerStripe | null | undefined): PartnerStripeStatus => ({
  connected: Boolean(stripe?.accountId),
  chargesEnabled: Boolean(stripe?.chargesEnabled),
  payoutsEnabled: Boolean(stripe?.payoutsEnabled),
  needsMoreInfo: Boolean(stripe?.accountId) && !stripe?.chargesEnabled,
});

/**
 * Starts (or resumes) the partner's Stripe setup and returns the Stripe page to send them to. Creates the Standard
 * account the first time; later calls reuse it, so the partner can leave and come back to finish.
 */
export async function startPartnerOnboarding(params: { account: IExpressAccount; email?: string; baseUrl: string; client: ConnectClient }): Promise<{ url: string }> {
  await connectDB();
  const { account, client } = params;
  let accountId = account.partner?.stripe?.accountId;
  if (!accountId) {
    const created = await client.createAccount({ email: params.email, expressAccountId: String(account._id) });
    accountId = created.id;
    // Only the first request to get here keeps its account; a parallel one reuses it.
    const claimed = await ExpressAccount.findOneAndUpdate(
      { _id: account._id, "partner.stripe.accountId": { $exists: false } },
      { $set: { "partner.stripe": { accountId, chargesEnabled: false, payoutsEnabled: false, detailsSubmitted: false, updatedAt: new Date() } } },
      { returnDocument: "after" }
    ).lean<IExpressAccount>();
    if (!claimed) {
      const current = await ExpressAccount.findById(account._id).select("partner.stripe").lean<IExpressAccount>();
      accountId = current?.partner?.stripe?.accountId || accountId;
    }
  }
  const url = await client.createOnboardingLink(accountId, `${params.baseUrl}/express/partner?stripe=refresh`, `${params.baseUrl}/express/partner?stripe=return`);
  return { url };
}

/** Asks Stripe what the partner's account can do now and saves it. Returns the saved status. */
export async function refreshPartnerStripe(params: { accountId: string; client: ConnectClient }): Promise<PartnerStripeStatus> {
  await connectDB();
  if (!isValidObjectId(params.accountId)) return toStripeStatus(null);
  const account = await ExpressAccount.findById(params.accountId).select("partner").lean<IExpressAccount>();
  const stripeId = account?.partner?.stripe?.accountId;
  if (!stripeId) return toStripeStatus(null);
  const live = await params.client.retrieveAccount(stripeId);
  const next = { accountId: stripeId, ...live, updatedAt: new Date() };
  await ExpressAccount.updateOne({ _id: params.accountId }, { $set: { "partner.stripe": next } });
  return toStripeStatus(next);
}

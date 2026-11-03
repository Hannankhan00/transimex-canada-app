import Stripe from "stripe";
import { getPaymentsMode, getStripeConfig } from "./config";
import { PaymentError } from "./types";

/** What Express needs from Stripe to connect a partner's own (Standard) account. Kept small so tests can stand in for it. */
export interface ConnectClient {
  createAccount(params: { email?: string; expressAccountId: string }): Promise<{ id: string }>;
  /** A Stripe-hosted page where the partner creates or connects their account. */
  createOnboardingLink(accountId: string, refreshUrl: string, returnUrl: string): Promise<string>;
  retrieveAccount(accountId: string): Promise<{ chargesEnabled: boolean; payoutsEnabled: boolean; detailsSubmitted: boolean }>;
}

export class StripeConnectClient implements ConnectClient {
  private readonly stripe: Stripe;
  constructor(secretKey: string, stripe?: Stripe) {
    this.stripe = stripe ?? new Stripe(secretKey);
  }

  async createAccount(params: { email?: string; expressAccountId: string }) {
    try {
      // Accounts v2 (Stripe no longer accepts v1 `type: "standard"` for new integrations). A "full" dashboard with
      // Stripe collecting fees and covering losses is the v2 equivalent of a Standard account: the partner owns it,
      // is the merchant of record, and keeps their own Stripe dashboard.
      const account = await this.stripe.v2.core.accounts.create({
        contact_email: params.email,
        identity: { country: "CA" },
        dashboard: "full",
        configuration: { merchant: { capabilities: { card_payments: { requested: true } } } },
        defaults: { responsibilities: { fees_collector: "stripe", losses_collector: "stripe" } },
        metadata: { expressAccountId: params.expressAccountId },
      });
      return { id: account.id };
    } catch (error: any) {
      throw new PaymentError("provider", "Could not create the Stripe account.", error?.message);
    }
  }

  async createOnboardingLink(accountId: string, refreshUrl: string, returnUrl: string) {
    try {
      const link = await this.stripe.v2.core.accountLinks.create({
        account: accountId,
        use_case: {
          type: "account_onboarding",
          account_onboarding: { refresh_url: refreshUrl, return_url: returnUrl },
        },
      });
      return link.url;
    } catch (error: any) {
      throw new PaymentError("provider", "Could not open Stripe's setup page.", error?.message);
    }
  }

  async retrieveAccount(accountId: string) {
    try {
      const a = await this.stripe.accounts.retrieve(accountId);
      return { chargesEnabled: Boolean(a.charges_enabled), payoutsEnabled: Boolean(a.payouts_enabled), detailsSubmitted: Boolean(a.details_submitted) };
    } catch (error: any) {
      throw new PaymentError("provider", "Could not read the Stripe account.", error?.message);
    }
  }
}

/** The Stripe Connect client, or null when payments are off. Throws on a bad configuration. */
export function getConnectClient(): ConnectClient | null {
  if (getPaymentsMode() === "off") return null;
  return new StripeConnectClient(getStripeConfig().secretKey);
}

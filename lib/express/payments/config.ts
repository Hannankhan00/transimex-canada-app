import { PaymentError } from "./types";

type Env = Record<string, string | undefined>;

/**
 *   off    - payments unavailable (default). Clients can book but not pay.
 *   mock   - built-in test-mode stand-in. No real money. Refuses to run in production.
 *   stripe - real Stripe Checkout (use test keys until launch).
 */
export type PaymentsMode = "off" | "mock" | "stripe";

export function getPaymentsMode(env: Env = process.env): PaymentsMode {
  const raw = (env.PAYMENTS_MODE || "off").trim().toLowerCase();
  if (raw !== "off" && raw !== "mock" && raw !== "stripe") {
    throw new PaymentError("config", `PAYMENTS_MODE must be off, mock or stripe (got "${raw}").`);
  }
  if (raw === "mock" && env.NODE_ENV === "production") {
    throw new PaymentError("config", "PAYMENTS_MODE=mock is not allowed in production.");
  }
  return raw;
}

/** The mock signs its own webhooks with this when STRIPE_WEBHOOK_SECRET is not set. Dev only. */
export const MOCK_WEBHOOK_SECRET = "whsec_mock_dev_only";

export function getStripeConfig(env: Env = process.env): { secretKey: string; webhookSecret: string } {
  const secretKey = env.STRIPE_SECRET_KEY?.trim() || "";
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET?.trim() || "";
  const missing = [!secretKey && "STRIPE_SECRET_KEY", !webhookSecret && "STRIPE_WEBHOOK_SECRET"].filter(Boolean);
  if (missing.length > 0) throw new PaymentError("config", `PAYMENTS_MODE=stripe requires ${missing.join(" and ")}.`);
  return { secretKey, webhookSecret };
}

/** How long a hosted payment page stays open. Stripe allows 30 minutes to 24 hours. */
export const CHECKOUT_TTL_MINUTES = 120;

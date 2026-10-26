import { PaymentError } from "./types";

type Env = Record<string, string | undefined>;

/**
 *   off    - payments unavailable (default). Clients can book but not pay.
 *   stripe - real Stripe Checkout (use Stripe test keys until launch). There is no simulated payment.
 */
export type PaymentsMode = "off" | "stripe";

export function getPaymentsMode(env: Env = process.env): PaymentsMode {
  const raw = (env.PAYMENTS_MODE || "off").trim().toLowerCase();
  if (raw !== "off" && raw !== "stripe") {
    throw new PaymentError("config", `PAYMENTS_MODE must be off or stripe (got "${raw}").`);
  }
  return raw;
}

export function getStripeConfig(env: Env = process.env): { secretKey: string; webhookSecret: string } {
  const secretKey = env.STRIPE_SECRET_KEY?.trim() || "";
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET?.trim() || "";
  const missing = [!secretKey && "STRIPE_SECRET_KEY", !webhookSecret && "STRIPE_WEBHOOK_SECRET"].filter(Boolean);
  if (missing.length > 0) throw new PaymentError("config", `PAYMENTS_MODE=stripe requires ${missing.join(" and ")}.`);
  return { secretKey, webhookSecret };
}

/** How long a hosted payment page stays open. Stripe allows 30 minutes to 24 hours. */
export const CHECKOUT_TTL_MINUTES = 120;

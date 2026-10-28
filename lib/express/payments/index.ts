import { getPaymentsMode, getStripeConfig } from "./config";
import { StripePaymentProvider } from "./stripe";
import type { PaymentProvider } from "./types";

/** The configured provider, or null when payments are off. Throws on a bad configuration. */
export function getPaymentProvider(): PaymentProvider | null {
  const mode = getPaymentsMode();
  if (mode === "off") return null;
  const { secretKey, webhookSecret, connectWebhookSecret } = getStripeConfig();
  return new StripePaymentProvider(secretKey, webhookSecret, undefined, connectWebhookSecret);
}

export { getConnectClient } from "./connect";
export * from "./types";

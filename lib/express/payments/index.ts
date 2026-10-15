import { getPaymentsMode, getStripeConfig } from "./config";
import { MockPaymentProvider } from "./mock";
import { StripePaymentProvider } from "./stripe";
import type { PaymentProvider } from "./types";

/** The configured provider, or null when payments are off. Throws on a bad configuration. */
export function getPaymentProvider(): PaymentProvider | null {
  const mode = getPaymentsMode();
  if (mode === "off") return null;
  if (mode === "mock") return new MockPaymentProvider();
  const { secretKey, webhookSecret } = getStripeConfig();
  return new StripePaymentProvider(secretKey, webhookSecret);
}

export * from "./types";

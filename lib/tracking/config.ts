import { CarrierCode } from "./schema";

function numEnv(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return value !== undefined && Number.isFinite(n) && n > 0 ? n : fallback;
}

export interface CarrierRateLimitConfig {
  /** Requests allowed per rolling 24h window. */
  perDay: number;
  /** Requests allowed per rolling 1s window. */
  perSecond: number;
}

export interface CarrierConfig {
  carrier: CarrierCode;
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
  rateLimit: CarrierRateLimitConfig;
}

/**
 * Per-carrier config, entirely env-driven. Every carrier always calls its live
 * API; one without credentials fails with AdapterNotConfiguredError rather than
 * returning sample data. See INTEGRATION.md for what each carrier requires.
 */
export function getCarrierConfig(carrier: CarrierCode): CarrierConfig {
  switch (carrier) {
    case "MAERSK":
      return {
        carrier,
        baseUrl: process.env.MAERSK_API_BASE_URL || "https://api.maersk.com",
        apiKey: process.env.MAERSK_API_KEY || "",
        apiSecret: process.env.MAERSK_API_SECRET || "",
        rateLimit: {
          perDay: numEnv(process.env.MAERSK_RATE_LIMIT_PER_DAY, 100_000),
          perSecond: numEnv(process.env.MAERSK_RATE_LIMIT_PER_SECOND, 10),
        },
      };
    case "CMA_CGM":
      return {
        carrier,
        // API gateway host (api-portal.cma-cgm.com is only the developer portal).
        // The spec's server path `/operation/trackandtrace/v1` is appended by the adapter.
        baseUrl: process.env.CMACGM_API_BASE_URL || "https://apis.cma-cgm.net",
        apiKey: process.env.CMACGM_API_KEY || "",
        apiSecret: process.env.CMACGM_API_SECRET || "",
        rateLimit: {
          perDay: numEnv(process.env.CMACGM_RATE_LIMIT_PER_DAY, 50_000),
          perSecond: numEnv(process.env.CMACGM_RATE_LIMIT_PER_SECOND, 5),
        },
      };
    case "MSC":
      return {
        carrier,
        baseUrl: process.env.MSC_API_BASE_URL || "https://api.developerportal.msc.com",
        apiKey: process.env.MSC_API_KEY || "",
        apiSecret: process.env.MSC_API_SECRET || "",
        // Fixed by MSC, not negotiable — see DOCs/container tracking.docx §3.3.
        rateLimit: {
          perDay: numEnv(process.env.MSC_RATE_LIMIT_PER_DAY, 100_000),
          perSecond: numEnv(process.env.MSC_RATE_LIMIT_PER_SECOND, 4),
        },
      };
  }
}

/**
 * CMA CGM Track & Trace auth options, per its OpenAPI spec:
 * - Public connection: API key sent in the `keyId` header (CMACGM_API_KEY only).
 * - Private connection: OAuth2 client credentials (CMACGM_API_KEY = client id,
 *   CMACGM_API_SECRET = client secret). Unlocks rail/ramp moves and inland
 *   planned dates for bookings where we're a named party.
 * `behalfOf` is mandatory only when calling as a third party for an end customer.
 */
export function getCmaCgmAuthConfig() {
  return {
    tokenUrl: process.env.CMACGM_TOKEN_URL || "https://auth.cma-cgm.com/as/token.oauth2",
    scope: process.env.CMACGM_OAUTH_SCOPE || "tandtcommercial:read:be tandtpublic:read:be",
    behalfOf: process.env.CMACGM_BEHALF_OF || "",
  };
}

/**
 * Maersk Track & Trace Plus auth options:
 * - Consumer-Key header: always passed as Consumer-Key.
 * - OAuth 2.0 Bearer token: requested via client_credentials when MAERSK_API_SECRET is set.
 */
export function getMaerskAuthConfig() {
  return {
    tokenUrl:
      process.env.MAERSK_TOKEN_URL ||
      "https://api.maersk.com/customer-identity/oauth/v2/access_token",
    scope: process.env.MAERSK_OAUTH_SCOPE || "",
  };
}

/** Shared secret the cron trigger must present — set CRON_SECRET before exposing the route publicly. */
export const CRON_SECRET = process.env.TRACKING_CRON_SECRET || "";

/** Shared secret each carrier webhook receiver checks (per-carrier, since each carrier signs differently). */
export function getWebhookSecret(carrier: CarrierCode): string {
  switch (carrier) {
    case "MAERSK":
      return process.env.MAERSK_WEBHOOK_SECRET || "";
    case "CMA_CGM":
      return process.env.CMACGM_WEBHOOK_SECRET || "";
    case "MSC":
      return process.env.MSC_WEBHOOK_SECRET || "";
  }
}

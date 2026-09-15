import { CarrierCode } from "./schema";

function boolEnv(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") return fallback;
  return value === "true" || value === "1";
}

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
  /** When true, the adapter returns fixture data instead of calling the live endpoint. */
  useMock: boolean;
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
  rateLimit: CarrierRateLimitConfig;
}

/**
 * Global default for USE_MOCK_DATA. Every carrier falls back to this unless it
 * has its own `<CARRIER>_USE_MOCK_DATA` override. Defaults to `true` so the
 * system runs fully on fixtures until real credentials are supplied.
 */
const GLOBAL_USE_MOCK_DATA = boolEnv(process.env.TRACKING_USE_MOCK_DATA, true);

/**
 * Per-carrier config, entirely env-driven. To go live for a carrier: fill in
 * its base URL + key(s) in `.env` and flip its `<CARRIER>_USE_MOCK_DATA` flag
 * to `false` (or flip `TRACKING_USE_MOCK_DATA` globally) — no code changes.
 * See INTEGRATION.md for exactly what each carrier requires.
 */
export function getCarrierConfig(carrier: CarrierCode): CarrierConfig {
  switch (carrier) {
    case "MAERSK":
      return {
        carrier,
        useMock: boolEnv(process.env.MAERSK_USE_MOCK_DATA, GLOBAL_USE_MOCK_DATA),
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
        useMock: boolEnv(process.env.CMACGM_USE_MOCK_DATA, GLOBAL_USE_MOCK_DATA),
        baseUrl: process.env.CMACGM_API_BASE_URL || "https://api-portal.cma-cgm.com",
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
        useMock: boolEnv(process.env.MSC_USE_MOCK_DATA, GLOBAL_USE_MOCK_DATA),
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

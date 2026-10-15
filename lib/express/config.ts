import { CarrierError } from "@/lib/shipping/core/errors";

/** Master switch. Express is invisible to clients unless EXPRESS_ENABLED=true. */
export function isExpressEnabled(): boolean {
  return process.env.EXPRESS_ENABLED === "true";
}

export type DhlMode = "mock" | "sandbox" | "live";

export interface DhlConfig {
  mode: DhlMode;
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
  accountNumber: string;
}

const DEFAULT_BASE_URLS: Record<Exclude<DhlMode, "mock">, string> = {
  sandbox: "https://express.api.dhl.com/mydhlapi/test",
  live: "https://express.api.dhl.com/mydhlapi",
};

export function getDhlMode(env: Record<string, string | undefined> = process.env): DhlMode {
  const raw = (env.DHL_MODE || "mock").trim().toLowerCase();
  if (raw === "mock" || raw === "sandbox" || raw === "live") return raw;
  // A typo must never silently fall back to mock (or to live).
  throw new CarrierError("config", `DHL_MODE must be mock, sandbox or live (got "${raw}").`);
}

/**
 * Reads DHL settings from the environment. Credentials are only required for
 * sandbox and live; mock mode needs none.
 */
export function getDhlConfig(env: Record<string, string | undefined> = process.env): DhlConfig {
  const mode = getDhlMode(env);
  if (mode === "mock") {
    return { mode, baseUrl: "", apiKey: "", apiSecret: "", accountNumber: "" };
  }

  const apiKey = env.DHL_API_KEY?.trim() || "";
  const apiSecret = env.DHL_API_SECRET?.trim() || "";
  const accountNumber = env.DHL_ACCOUNT_NUMBER?.trim() || "";
  const missing = [
    !apiKey && "DHL_API_KEY",
    !apiSecret && "DHL_API_SECRET",
    !accountNumber && "DHL_ACCOUNT_NUMBER",
  ].filter(Boolean);
  if (missing.length > 0) {
    throw new CarrierError("config", `DHL_MODE=${mode} requires ${missing.join(", ")}.`);
  }

  return {
    mode,
    baseUrl: (env.DHL_API_BASE_URL?.trim() || DEFAULT_BASE_URLS[mode]).replace(/\/+$/, ""),
    apiKey,
    apiSecret,
    accountNumber,
  };
}

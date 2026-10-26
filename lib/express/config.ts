import { CarrierError } from "@/lib/shipping/core/errors";

/** Master switch. Express is invisible to clients unless EXPRESS_ENABLED=true. */
export function isExpressEnabled(): boolean {
  return process.env.EXPRESS_ENABLED === "true";
}

export type DhlMode = "sandbox" | "live";

export interface DhlConfig {
  mode: DhlMode;
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
  accountNumber: string;
  /**
   * DHL account for shipments that start OUTSIDE Canada (imports). DHL refuses the main account for those:
   * "8009: Account is not IMP enabled". Optional; only needed when clients ship from other countries.
   */
  importAccountNumber: string;
}

const DEFAULT_BASE_URLS: Record<DhlMode, string> = {
  sandbox: "https://express.api.dhl.com/mydhlapi/test",
  live: "https://express.api.dhl.com/mydhlapi",
};

export function getDhlMode(env: Record<string, string | undefined> = process.env): DhlMode {
  const raw = (env.DHL_MODE || "").trim().toLowerCase();
  if (raw === "sandbox" || raw === "live") return raw;
  // No guessing: a missing or mistyped mode must stop shipping, never fall back to anything made up.
  throw new CarrierError("config", raw ? `DHL_MODE must be sandbox or live (got "${raw}").` : "DHL_MODE is not set. Set it to sandbox or live.");
}

/** Reads DHL settings from the environment. Both modes need the API key, secret and account number. */
export function getDhlConfig(env: Record<string, string | undefined> = process.env): DhlConfig {
  const mode = getDhlMode(env);

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
    importAccountNumber: env.DHL_IMPORT_ACCOUNT_NUMBER?.trim() || "",
  };
}

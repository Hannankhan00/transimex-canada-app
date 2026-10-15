import { getDhlConfig, type DhlConfig } from "@/lib/express/config";
import type { CarrierAdapter } from "../../core/adapter";
import { DhlApiAdapter } from "./live";
import { MockDhlAdapter } from "./mock";

/**
 * Builds the DHL adapter for the configured mode. Mock needs no credentials;
 * sandbox and live use the same code with real credentials, so DHL approval
 * is only an environment change.
 */
export function createDhlAdapter(config: DhlConfig = getDhlConfig()): CarrierAdapter {
  return config.mode === "mock" ? new MockDhlAdapter({ omitPublicList: process.env.DHL_MOCK_OMIT_PUBLIC_PRICE === "true" }) : new DhlApiAdapter(config);
}

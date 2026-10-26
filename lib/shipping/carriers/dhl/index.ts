import { getDhlConfig, type DhlConfig } from "@/lib/express/config";
import type { CarrierAdapter } from "../../core/adapter";
import { DhlApiAdapter } from "./live";

/**
 * Builds the DHL adapter. It always talks to DHL: the sandbox or the live API, depending on DHL_MODE.
 * Missing or wrong settings are an error, never a quiet switch to made-up rates or labels.
 */
export function createDhlAdapter(config: DhlConfig = getDhlConfig()): CarrierAdapter {
  return new DhlApiAdapter(config);
}

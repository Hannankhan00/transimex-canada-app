import { AdapterFetchResult, CarrierCode } from "../schema";

/**
 * One adapter per carrier. Every adapter implements this same interface and
 * is solely responsible for (a) calling its carrier's endpoint (or returning
 * fixture data in mock mode) and (b) mapping that carrier's own field names
 * and event labels into the shared internal schema. Nothing outside the
 * adapter ever sees a carrier's raw response shape.
 */
export interface CarrierAdapter {
  carrier: CarrierCode;
  fetchTracking(containerNumber: string): Promise<AdapterFetchResult>;
  /** Normalizes an already-received webhook payload (Maersk/MSC push updates) using the same mapping as fetchTracking. */
  parseWebhookPayload(payload: unknown): AdapterFetchResult;
}

export class AdapterNotConfiguredError extends Error {
  constructor(carrier: CarrierCode) {
    super(
      `${carrier} adapter is set to live mode but is missing its API base URL / key. ` +
        `Set the required env vars (see INTEGRATION.md) or flip its USE_MOCK_DATA flag back to true.`
    );
    this.name = "AdapterNotConfiguredError";
  }
}

/** Thrown when a payload (typically a webhook body) doesn't match the shape a carrier's normalizer expects. */
export class InvalidPayloadError extends Error {
  constructor(carrier: CarrierCode, expectedField: string) {
    super(`${carrier} payload is missing or has an invalid "${expectedField}" field — cannot normalize it.`);
    this.name = "InvalidPayloadError";
  }
}

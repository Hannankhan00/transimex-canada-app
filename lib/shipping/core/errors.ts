export type CarrierErrorCode =
  | "timeout"
  | "unavailable"
  | "rate_limited"
  | "auth"
  | "rejected"
  | "not_serviced"
  | "not_found"
  | "config"
  | "unknown";

export interface CarrierErrorOptions {
  status?: number;
  /** Raw carrier message, for logs and staff only. Never show to clients. */
  detail?: string;
  /**
   * True when a booking call may or may not have reached the carrier (for
   * example a timeout). The shipment must be looked up before any retry so one
   * parcel never gets two labels.
   */
  outcomeUnknown?: boolean;
}

export class CarrierError extends Error {
  readonly code: CarrierErrorCode;
  readonly status?: number;
  readonly detail?: string;
  readonly outcomeUnknown: boolean;

  constructor(code: CarrierErrorCode, message: string, options: CarrierErrorOptions = {}) {
    super(message);
    this.name = "CarrierError";
    this.code = code;
    this.status = options.status;
    this.detail = options.detail;
    this.outcomeUnknown = options.outcomeUnknown ?? false;
  }

  /** Only timeouts, 5xx and 429 are safe to retry (for idempotent calls). */
  get retryable(): boolean {
    return this.code === "timeout" || this.code === "unavailable" || this.code === "rate_limited";
  }
}

export function carrierErrorFromStatus(status: number, detail?: string): CarrierError {
  if (status === 401 || status === 403) {
    return new CarrierError("auth", "Carrier rejected our credentials.", { status, detail });
  }
  if (status === 404) {
    return new CarrierError("not_found", "Carrier resource not found.", { status, detail });
  }
  if (status === 429) {
    return new CarrierError("rate_limited", "Carrier rate limit reached.", { status, detail });
  }
  if (status >= 500) {
    return new CarrierError("unavailable", "Carrier service unavailable.", { status, detail });
  }
  return new CarrierError("rejected", "Carrier rejected the request.", { status, detail });
}

import type { DhlConfig } from "@/lib/express/config";
import { CarrierError, carrierErrorFromStatus } from "../../core/errors";
import { withRetry } from "../../core/retry";

const REQUEST_TIMEOUT_MS = 15_000;

export interface DhlRequest {
  method: "GET" | "POST";
  path: string;
  query?: Record<string, string>;
  body?: unknown;
  /**
   * True for calls that create something at DHL (shipment, pickup). These are
   * never retried, and a timeout or 5xx marks the outcome as unknown so the
   * caller looks the parcel up before trying again.
   */
  mutating?: boolean;
}

/** Thin authenticated JSON client for the DHL Express API. */
export class DhlHttpClient {
  constructor(
    private readonly config: DhlConfig,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly sleep?: (ms: number) => Promise<void>
  ) {}

  async request<T>(req: DhlRequest): Promise<T> {
    const attempts = req.mutating ? 1 : 3;
    return withRetry(() => this.once<T>(req), { attempts, baseDelayMs: 500, sleep: this.sleep });
  }

  private async once<T>(req: DhlRequest): Promise<T> {
    const url = new URL(`${this.config.baseUrl}${req.path}`);
    for (const [key, value] of Object.entries(req.query ?? {})) url.searchParams.set(key, value);

    const authorization = Buffer.from(`${this.config.apiKey}:${this.config.apiSecret}`).toString("base64");
    const outcomeUnknown = Boolean(req.mutating);

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: req.method,
        headers: {
          Authorization: `Basic ${authorization}`,
          Accept: "application/json",
          // Required by the OpenAPI spec: the interface version, "do not change".
          "x-version": "3.3.4",
          ...(req.body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        body: req.body !== undefined ? JSON.stringify(req.body) : undefined,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
      throw new CarrierError(timedOut ? "timeout" : "unavailable", timedOut ? "DHL request timed out." : "Could not reach DHL.", {
        detail: error instanceof Error ? error.message : String(error),
        outcomeUnknown,
      });
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      const error = carrierErrorFromStatus(response.status, detail.slice(0, 2000));
      // A 5xx on a booking call may still have created the parcel.
      if (outcomeUnknown && error.code === "unavailable") {
        throw new CarrierError(error.code, error.message, {
          status: error.status,
          detail: error.detail,
          outcomeUnknown: true,
        });
      }
      throw error;
    }

    return (await response.json()) as T;
  }
}

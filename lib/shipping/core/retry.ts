import { CarrierError } from "./errors";

export interface RetryOptions {
  /** Total tries including the first. Use 1 for calls that must never repeat. */
  attempts: number;
  baseDelayMs: number;
  /** Injectable for tests. */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Retries only on timeouts, 5xx and 429 (CarrierError.retryable), with
 * exponential backoff. Any other error is thrown immediately.
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  const sleep = options.sleep ?? defaultSleep;
  let lastError: unknown;

  for (let attempt = 1; attempt <= options.attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const retryable = error instanceof CarrierError && error.retryable;
      if (!retryable || attempt === options.attempts) throw error;
      await sleep(options.baseDelayMs * 2 ** (attempt - 1));
    }
  }

  throw lastError;
}

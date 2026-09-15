import { CarrierCode, CARRIER_CODES } from "./schema";
import { getCarrierConfig, CarrierRateLimitConfig } from "./config";

export class RateLimitExceededError extends Error {
  constructor(public carrier: CarrierCode, public window: "day" | "second") {
    super(`${carrier} tracking API rate limit exceeded (per-${window} cap).`);
    this.name = "RateLimitExceededError";
  }
}

/**
 * In-memory per-carrier limiter (day cap + sliding 1s window). Only the live
 * adapter path consumes it — mock mode bypasses it entirely, since fixture
 * data isn't a real network call. Built now, ahead of credentials, per
 * DOCs/container tracking.docx §5.4 (MSC's 100k/day + 4/s cap is fixed).
 *
 * Caveat: in-memory state doesn't share across serverless instances. Fine for
 * a single scheduled-job runner; if this ever runs on multiple concurrent
 * instances, swap the counters below for a shared store (e.g. Redis).
 */
class CarrierRateLimiter {
  private dayCount = 0;
  private dayWindowStart = Date.now();
  private secondWindow: number[] = [];

  constructor(private carrier: CarrierCode, private config: CarrierRateLimitConfig) {}

  private rolloverDayWindow() {
    const elapsed = Date.now() - this.dayWindowStart;
    if (elapsed >= 24 * 60 * 60 * 1000) {
      this.dayCount = 0;
      this.dayWindowStart = Date.now();
    }
  }

  /** Reserves one call. Throws if the daily cap is already spent; waits out the per-second window otherwise. */
  async acquire(): Promise<void> {
    this.rolloverDayWindow();
    if (this.dayCount >= this.config.perDay) {
      throw new RateLimitExceededError(this.carrier, "day");
    }

    const now = Date.now();
    this.secondWindow = this.secondWindow.filter((t) => now - t < 1000);
    if (this.secondWindow.length >= this.config.perSecond) {
      const waitMs = 1000 - (now - this.secondWindow[0]);
      if (waitMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
      this.secondWindow = this.secondWindow.filter((t) => Date.now() - t < 1000);
    }

    this.secondWindow.push(Date.now());
    this.dayCount += 1;
  }

  usage() {
    this.rolloverDayWindow();
    return {
      carrier: this.carrier,
      callsToday: this.dayCount,
      dailyLimit: this.config.perDay,
      callsThisSecond: this.secondWindow.length,
      perSecondLimit: this.config.perSecond,
    };
  }

  reset() {
    this.dayCount = 0;
    this.dayWindowStart = Date.now();
    this.secondWindow = [];
  }
}

const limiters = new Map<CarrierCode, CarrierRateLimiter>();

function getLimiter(carrier: CarrierCode): CarrierRateLimiter {
  let limiter = limiters.get(carrier);
  if (!limiter) {
    limiter = new CarrierRateLimiter(carrier, getCarrierConfig(carrier).rateLimit);
    limiters.set(carrier, limiter);
  }
  return limiter;
}

export async function acquireRateLimit(carrier: CarrierCode): Promise<void> {
  return getLimiter(carrier).acquire();
}

export function getRateLimitUsage(carrier: CarrierCode) {
  return getLimiter(carrier).usage();
}

export function getAllRateLimitUsage() {
  return CARRIER_CODES.map((c) => getRateLimitUsage(c));
}

/** Test/demo helper — clears counters so specs don't bleed into each other. */
export function resetRateLimiters() {
  limiters.forEach((l) => l.reset());
}

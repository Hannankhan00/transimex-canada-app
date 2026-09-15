import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { acquireRateLimit, getRateLimitUsage, RateLimitExceededError, resetRateLimiters } from "../rateLimiter";

describe("rate limiter", () => {
  const originalDay = process.env.MSC_RATE_LIMIT_PER_DAY;
  const originalSecond = process.env.MSC_RATE_LIMIT_PER_SECOND;

  beforeAll(() => {
    // Small caps so the test doesn't need to make 100k calls to prove the day cap works.
    process.env.MSC_RATE_LIMIT_PER_DAY = "2";
    process.env.MSC_RATE_LIMIT_PER_SECOND = "50";
  });

  afterAll(() => {
    process.env.MSC_RATE_LIMIT_PER_DAY = originalDay;
    process.env.MSC_RATE_LIMIT_PER_SECOND = originalSecond;
    resetRateLimiters();
  });

  it("allows calls under the daily cap and throws once it's spent", async () => {
    await acquireRateLimit("MSC");
    await acquireRateLimit("MSC");

    await expect(acquireRateLimit("MSC")).rejects.toThrow(RateLimitExceededError);
  });

  it("reports usage against the configured limits", () => {
    const usage = getRateLimitUsage("MSC");
    expect(usage.dailyLimit).toBe(2);
    expect(usage.callsToday).toBe(2);
  });
});

import { describe, expect, it, vi } from "vitest";
import { buildRatePrice, formatCad, fromCents, toCents } from "../core/money";
import { CarrierError, carrierErrorFromStatus } from "../core/errors";
import { withRetry } from "../core/retry";
import { getDhlConfig, getDhlMode, isExpressEnabled } from "@/lib/express/config";

describe("money", () => {
  it("converts decimals to integer cents without float drift", () => {
    expect(toCents(19.99)).toBe(1999);
    expect(toCents("0.1")).toBe(10);
    expect(toCents(0.07 * 3)).toBe(21);
  });

  it("rejects non-finite amounts and fractional cents", () => {
    expect(() => toCents("abc")).toThrow();
    expect(() => fromCents(10.5)).toThrow();
  });

  it("builds a rate price whose total is base plus surcharges", () => {
    const price = buildRatePrice(10000, [
      { code: "FF", name: "Fuel", amountCents: 2200 },
      { code: "OO", name: "Remote", amountCents: 2800 },
    ]);
    expect(price.totalCents).toBe(15000);
  });

  it("formats CAD for both languages", () => {
    expect(formatCad(123456, "en")).toContain("1,234.56");
    expect(formatCad(123456, "fr")).toContain("1");
  });
});

describe("carrier errors", () => {
  it("marks only timeouts, 5xx and 429 as retryable", () => {
    expect(carrierErrorFromStatus(503).retryable).toBe(true);
    expect(carrierErrorFromStatus(429).retryable).toBe(true);
    expect(new CarrierError("timeout", "x").retryable).toBe(true);
    expect(carrierErrorFromStatus(400).retryable).toBe(false);
    expect(carrierErrorFromStatus(401).retryable).toBe(false);
    expect(carrierErrorFromStatus(404).retryable).toBe(false);
  });
});

describe("withRetry", () => {
  const sleep = vi.fn(async () => {});

  it("retries a retryable error then succeeds", async () => {
    const fn = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(carrierErrorFromStatus(503))
      .mockResolvedValueOnce("ok");
    await expect(withRetry(fn, { attempts: 3, baseDelayMs: 10, sleep })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not retry a 400", async () => {
    const fn = vi.fn<() => Promise<string>>().mockRejectedValue(carrierErrorFromStatus(400));
    await expect(withRetry(fn, { attempts: 3, baseDelayMs: 10, sleep })).rejects.toBeInstanceOf(CarrierError);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("gives up after the last attempt", async () => {
    const fn = vi.fn<() => Promise<string>>().mockRejectedValue(carrierErrorFromStatus(503));
    await expect(withRetry(fn, { attempts: 3, baseDelayMs: 10, sleep })).rejects.toBeInstanceOf(CarrierError);
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

describe("express config", () => {
  it("is off unless EXPRESS_ENABLED is exactly true", () => {
    const original = process.env.EXPRESS_ENABLED;
    delete process.env.EXPRESS_ENABLED;
    expect(isExpressEnabled()).toBe(false);
    process.env.EXPRESS_ENABLED = "1";
    expect(isExpressEnabled()).toBe(false);
    process.env.EXPRESS_ENABLED = "true";
    expect(isExpressEnabled()).toBe(true);
    if (original === undefined) delete process.env.EXPRESS_ENABLED;
    else process.env.EXPRESS_ENABLED = original;
  });

  it("defaults to mock and needs no credentials", () => {
    expect(getDhlMode({})).toBe("mock");
    expect(getDhlConfig({}).mode).toBe("mock");
  });

  it("rejects an unknown DHL_MODE instead of guessing", () => {
    expect(() => getDhlMode({ DHL_MODE: "prod" })).toThrow(/DHL_MODE/);
  });

  it("requires credentials for sandbox and live", () => {
    expect(() => getDhlConfig({ DHL_MODE: "sandbox" })).toThrow(/DHL_API_KEY/);
    const creds = { DHL_API_KEY: "k", DHL_API_SECRET: "s", DHL_ACCOUNT_NUMBER: "123" };
    expect(getDhlConfig({ DHL_MODE: "sandbox", ...creds }).baseUrl).toContain("/test");
    expect(getDhlConfig({ DHL_MODE: "live", ...creds }).baseUrl).not.toContain("/test");
  });
});

import { describe, it, expect, beforeAll } from "vitest";
import {
  consumeRecoveryCode,
  generateRecoveryCodes,
  generateTotpSecret,
  signChallenge,
  verifyChallenge,
  verifyTotp,
} from "../twoFactor";

// RFC 6238 test secret ("12345678901234567890") in base32
const RFC_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

beforeAll(() => {
  process.env.JWT_SECRET = "test-secret";
});

describe("verifyTotp", () => {
  it("accepts the RFC 6238 vector for t=59 (code 287082) and returns its step", () => {
    expect(verifyTotp(RFC_SECRET, "287082", 59_000)).toBe(1);
  });
  it("allows one step of drift but not two", () => {
    expect(verifyTotp(RFC_SECRET, "287082", 59_000 + 30_000)).toBe(1);
    expect(verifyTotp(RFC_SECRET, "287082", 59_000 + 90_000)).toBeNull();
  });
  it("rejects wrong or malformed codes", () => {
    expect(verifyTotp(RFC_SECRET, "000000", 59_000)).toBeNull();
    expect(verifyTotp(RFC_SECRET, "abc", 59_000)).toBeNull();
  });
  it("generates usable secrets", () => {
    expect(generateTotpSecret()).toMatch(/^[A-Z2-7]{32}$/);
  });
});

describe("recovery codes", () => {
  it("consumes a code once", () => {
    const { plain, hashed } = generateRecoveryCodes();
    const left = consumeRecoveryCode(hashed, plain[0])!;
    expect(left).toHaveLength(hashed.length - 1);
    expect(consumeRecoveryCode(left, plain[0])).toBeNull();
    expect(consumeRecoveryCode(hashed, "zzzzz-zzzzz")).toBeNull();
  });
});

describe("challenge token", () => {
  it("round-trips for the right purpose only", () => {
    const t = signChallenge("u1", "2fa-login", true);
    expect(verifyChallenge(t, "2fa-login")).toEqual({ userId: "u1", rememberMe: true });
    expect(verifyChallenge(t, "2fa-setup")).toBeNull();
    expect(verifyChallenge("junk", "2fa-login")).toBeNull();
  });
});

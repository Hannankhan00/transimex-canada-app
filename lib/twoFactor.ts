import crypto from "crypto";
import jwt from "jsonwebtoken";
import QRCode from "qrcode";
import { encryptPayoutDetails, decryptPayoutDetails } from "@/lib/express/payoutCrypto";

/**
 * Two-factor authentication (TOTP, RFC 6238) helpers: secret generation, code verification, recovery codes and the
 * short-lived "challenge" token that carries a half-finished login between the password step and the code step.
 */

const STEP_SECONDS = 30;
const DIGITS = 6;
const ISSUER = "Transimex";
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

// ---------------------------------------------------------------------------
// Base32 + TOTP
// ---------------------------------------------------------------------------

function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(str: string): Buffer {
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const ch of str.replace(/=+$/, "").toUpperCase()) {
    const idx = B32.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function generateTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

function hotp(secret: string, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", base32Decode(secret)).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const bin =
    ((hmac[offset] & 0x7f) << 24) |
    (hmac[offset + 1] << 16) |
    (hmac[offset + 2] << 8) |
    hmac[offset + 3];
  return String(bin % 10 ** DIGITS).padStart(DIGITS, "0");
}

const safeEqual = (a: string, b: string) =>
  a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

/**
 * Checks a 6-digit code against the secret, allowing one step of clock drift either way.
 * Returns the matched time step (so the caller can refuse to accept the same step twice) or null.
 */
export function verifyTotp(secret: string, code: string, now = Date.now()): number | null {
  const clean = String(code || "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(clean)) return null;
  const current = Math.floor(now / 1000 / STEP_SECONDS);
  for (const step of [current, current - 1, current + 1]) {
    if (safeEqual(hotp(secret, step), clean)) return step;
  }
  return null;
}

export function buildOtpAuthUri(secret: string, email: string): string {
  const label = encodeURIComponent(`${ISSUER}:${email}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${ISSUER}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;
}

export async function buildEnrollment(secret: string, email: string) {
  const otpauthUri = buildOtpAuthUri(secret, email);
  const qrDataUrl = await QRCode.toDataURL(otpauthUri, { margin: 1, width: 220 });
  return { secret, otpauthUri, qrDataUrl };
}

// ---------------------------------------------------------------------------
// Secret storage (encrypted at rest with the same key used for payout details)
// ---------------------------------------------------------------------------

export const encryptSecret = (secret: string) => encryptPayoutDetails({ s: secret });
export const decryptSecret = (stored: string) => decryptPayoutDetails<{ s: string }>(stored).s;

// ---------------------------------------------------------------------------
// Recovery codes
// ---------------------------------------------------------------------------

const hashCode = (code: string) =>
  crypto.createHash("sha256").update(code.replace(/[\s-]/g, "").toLowerCase()).digest("hex");

export function generateRecoveryCodes(count = 10): { plain: string[]; hashed: string[] } {
  const plain = Array.from({ length: count }, () => {
    const raw = crypto.randomBytes(5).toString("hex"); // 10 hex chars
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
  return { plain, hashed: plain.map(hashCode) };
}

/** Returns the remaining hashes if `input` matches one (that code is consumed), or null. */
export function consumeRecoveryCode(hashes: string[], input: string): string[] | null {
  const clean = String(input || "").replace(/[\s-]/g, "");
  if (!/^[0-9a-fA-F]{10}$/.test(clean)) return null;
  const target = hashCode(clean);
  const idx = hashes.findIndex((h) => safeEqual(h, target));
  if (idx === -1) return null;
  return hashes.filter((_, i) => i !== idx);
}

// ---------------------------------------------------------------------------
// Challenge token: proves the password step passed, lets the user finish with a code (or enrol first).
// Signed with a key derived from JWT_SECRET so it can NEVER be accepted as a session cookie.
// ---------------------------------------------------------------------------

export type ChallengePurpose = "2fa-login" | "2fa-setup";

function challengeKey(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is required but not set.");
  return crypto.createHmac("sha256", secret).update("2fa-challenge").digest("hex");
}

export function signChallenge(userId: string, purpose: ChallengePurpose, rememberMe: boolean): string {
  return jwt.sign({ uid: userId, purpose, rm: !!rememberMe }, challengeKey(), { expiresIn: "10m" });
}

export function verifyChallenge(
  token: unknown,
  purpose: ChallengePurpose
): { userId: string; rememberMe: boolean } | null {
  if (typeof token !== "string") return null;
  try {
    const p = jwt.verify(token, challengeKey()) as any;
    if (p.purpose !== purpose || !p.uid) return null;
    return { userId: String(p.uid), rememberMe: !!p.rm };
  } catch {
    return null;
  }
}

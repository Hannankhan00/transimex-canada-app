import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Encrypts a partner's payout details (bank account numbers, e-transfer email) before they are stored, with
 * AES-256-GCM. The key lives only in the environment (PAYOUT_ENCRYPTION_KEY: 32 random bytes as 64 hex characters or
 * base64), never in the database, so a database leak alone does not reveal anyone's bank details. GCM also detects
 * any tampering with the stored text. Stored form: "v1.<iv>.<tag>.<ciphertext>" (base64url).
 */
const PREFIX = "v1";

export class PayoutCryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PayoutCryptoError";
  }
}

function getKey(env: Record<string, string | undefined> = process.env): Buffer {
  const raw = env.PAYOUT_ENCRYPTION_KEY?.trim();
  if (!raw) throw new PayoutCryptoError("PAYOUT_ENCRYPTION_KEY is not set, so payout details cannot be saved.");
  const key = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (key.length !== 32) throw new PayoutCryptoError("PAYOUT_ENCRYPTION_KEY must be 32 bytes (64 hex characters or base64).");
  return key;
}

export const payoutCryptoConfigured = (env: Record<string, string | undefined> = process.env): boolean => {
  try {
    getKey(env);
    return true;
  } catch {
    return false;
  }
};

export function encryptPayoutDetails(value: unknown, env: Record<string, string | undefined> = process.env): string {
  const key = getKey(env);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return [PREFIX, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptPayoutDetails<T = unknown>(stored: string, env: Record<string, string | undefined> = process.env): T {
  const [prefix, iv, tag, ciphertext] = stored.split(".");
  if (prefix !== PREFIX || !iv || !tag || !ciphertext) throw new PayoutCryptoError("Stored payout details are not in a known format.");
  try {
    const decipher = createDecipheriv("aes-256-gcm", getKey(env), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    const plain = Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]);
    return JSON.parse(plain.toString("utf8")) as T;
  } catch (error) {
    if (error instanceof PayoutCryptoError) throw error;
    throw new PayoutCryptoError("Payout details could not be decrypted (wrong key or altered data).");
  }
}

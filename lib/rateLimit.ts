// ---------------------------------------------------------------------------
// Rate Limiter for Authentication & Sensitive API Endpoints (HIGH-05)
// In-memory sliding window counter per action bucket and IP/identifier.
// In high-traffic multi-region clusters, this can easily bridge to Redis/Upstash.
// ---------------------------------------------------------------------------

type RateLimitOptions = {
  windowMs?: number; // Window duration in milliseconds
  max?: number;      // Maximum requests allowed within window
};

interface RateLimitRecord {
  count: number;
  expiresAt: number;
}

const stores = new Map<string, Map<string, RateLimitRecord>>();

export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}

export function checkRateLimit(
  bucket: string,
  identifier: string,
  options: RateLimitOptions = {}
): { isRateLimited: boolean; retryAfterSeconds: number } {
  const windowMs = options.windowMs ?? 15 * 60 * 1000;
  const max = options.max ?? 10;

  if (!stores.has(bucket)) {
    stores.set(bucket, new Map());
  }
  const store = stores.get(bucket)!;

  const now = Date.now();

  // Prune expired entries periodically to prevent memory leak
  if (store.size > 2000) {
    for (const [key, record] of store.entries()) {
      if (now > record.expiresAt) {
        store.delete(key);
      }
    }
  }

  const record = store.get(identifier);

  if (!record || now > record.expiresAt) {
    store.set(identifier, { count: 1, expiresAt: now + windowMs });
    return { isRateLimited: false, retryAfterSeconds: 0 };
  }

  if (record.count >= max) {
    const retryAfterSeconds = Math.max(1, Math.ceil((record.expiresAt - now) / 1000));
    return { isRateLimited: true, retryAfterSeconds };
  }

  record.count += 1;
  return { isRateLimited: false, retryAfterSeconds: 0 };
}

import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { checkRateLimit, errorResponse, READ_LIMIT_PER_MINUTE } from "@/lib/blogPublicApi";

/**
 * Auth for /api/public/promotions. Server-to-server only, same scheme as the Blog API:
 * `x-api-key: <key>` or `Authorization: Bearer <key>`.
 * Uses the same BLOG_PUBLIC_API_KEY as the Blog API.
 */
const sha256 = (value: string) => createHash("sha256").update(value).digest();

function extractKey(req: Request): string | null {
  const direct = req.headers.get("x-api-key");
  if (direct) return direct;
  const match = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

export function guardPromotionsRequest(req: Request): NextResponse | null {
  const expected = process.env.BLOG_PUBLIC_API_KEY;
  if (!expected) {
    console.error("BLOG_PUBLIC_API_KEY is not configured; public promotions API is disabled.");
    return errorResponse(503, "API_DISABLED", "The promotions API is not configured on this server.");
  }

  const provided = extractKey(req);
  if (!provided || !timingSafeEqual(sha256(provided), sha256(expected))) {
    return errorResponse(401, "UNAUTHORIZED", "Missing or invalid API key.");
  }

  const retryAfter = checkRateLimit(`promo:key:${sha256(provided).toString("hex")}`, READ_LIMIT_PER_MINUTE);
  if (retryAfter > 0) {
    const res = errorResponse(429, "RATE_LIMITED", "Too many requests. Please slow down.", {
      retryAfterSeconds: retryAfter,
    });
    res.headers.set("Retry-After", String(retryAfter));
    return res;
  }
  return null;
}

/** Absolute origin used to build image/flag URLs: APP_URL when set, otherwise the request's own origin. */
export function publicOrigin(req: Request): string {
  const configured = process.env.APP_URL?.trim();
  return (configured || new URL(req.url).origin).replace(/\/$/, "");
}

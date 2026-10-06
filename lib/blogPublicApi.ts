import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import BlogComment from "@/models/BlogComment";

/**
 * Shared helpers for the public Blog API (/api/public/blog/*).
 *
 * Authentication is server-to-server only: every request must carry the
 * BLOG_PUBLIC_API_KEY, either as `x-api-key: <key>` or `Authorization: Bearer <key>`.
 * The key must never be shipped to a browser; the website calls this API from its backend.
 */

export type Lang = "en" | "fr";

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_ENTRIES = 5000;
export const READ_LIMIT_PER_MINUTE = 300; // per API key
export const WRITE_LIMIT_PER_MINUTE = 10; // per end-user (X-Client-IP) per API key

const rateLimitMap = new Map<string, { count: number; expiresAt: number }>();

/** Returns 0 when the request may proceed, otherwise the seconds until the window resets. */
export function checkRateLimit(bucket: string, max: number): number {
  const now = Date.now();
  if (rateLimitMap.size > RATE_LIMIT_MAX_ENTRIES) {
    rateLimitMap.forEach((v, k) => {
      if (now > v.expiresAt) rateLimitMap.delete(k);
    });
  }
  const record = rateLimitMap.get(bucket);
  if (!record || now > record.expiresAt) {
    rateLimitMap.set(bucket, { count: 1, expiresAt: now + RATE_LIMIT_WINDOW_MS });
    return 0;
  }
  if (record.count >= max) {
    return Math.max(1, Math.ceil((record.expiresAt - now) / 1000));
  }
  record.count += 1;
  return 0;
}

const sha256 = (value: string) => createHash("sha256").update(value).digest();

function extractKey(req: Request): string | null {
  const direct = req.headers.get("x-api-key");
  if (direct) return direct;
  const auth = req.headers.get("authorization");
  const match = auth?.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

export function errorResponse(
  status: number,
  code: string,
  message: string,
  extra: Record<string, unknown> = {}
) {
  const res = NextResponse.json({ success: false, error: { code, message, ...extra } }, { status });
  res.headers.set("Cache-Control", "no-store");
  return res;
}

/**
 * Validates the API key and applies the per-key read rate limit.
 * Returns a ready-made error response when the request must be rejected, otherwise null.
 */
export function guardRequest(req: Request): NextResponse | null {
  const expected = process.env.BLOG_PUBLIC_API_KEY;
  if (!expected) {
    console.error("BLOG_PUBLIC_API_KEY is not configured; public blog API is disabled.");
    return errorResponse(503, "API_DISABLED", "The blog API is not configured on this server.");
  }

  const provided = extractKey(req);
  if (!provided || !timingSafeEqual(sha256(provided), sha256(expected))) {
    return errorResponse(401, "UNAUTHORIZED", "Missing or invalid API key.");
  }

  const retryAfter = checkRateLimit(`blog:key:${sha256(provided).toString("hex")}`, READ_LIMIT_PER_MINUTE);
  if (retryAfter > 0) {
    const res = errorResponse(429, "RATE_LIMITED", "Too many requests. Please slow down.", {
      retryAfterSeconds: retryAfter,
    });
    res.headers.set("Retry-After", String(retryAfter));
    return res;
  }
  return null;
}

/** Per end-user write limit. The website should forward the visitor's IP in `X-Client-IP`. */
export function guardWrite(req: Request, action: string): NextResponse | null {
  const client = (req.headers.get("x-client-ip") || "unknown").trim().slice(0, 64);
  const retryAfter = checkRateLimit(`blog:${action}:${client}`, WRITE_LIMIT_PER_MINUTE);
  if (retryAfter > 0) {
    const res = errorResponse(429, "RATE_LIMITED", "Too many submissions. Please wait a moment.", {
      retryAfterSeconds: retryAfter,
    });
    res.headers.set("Retry-After", String(retryAfter));
    return res;
  }
  return null;
}

export function ok(body: Record<string, unknown>, cache: "no-store" | "short" = "no-store") {
  const res = NextResponse.json({ success: true, ...body });
  res.headers.set("Cache-Control", cache === "short" ? "private, max-age=30" : "no-store");
  return res;
}

export function parseLang(value: string | null): Lang | null {
  if (!value) return null;
  const v = value.toLowerCase();
  return v === "en" || v === "fr" ? v : null;
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parseIntParam(value: string | null, fallback: number, min: number, max: number): number {
  const n = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

const iso = (d: unknown): string | null => {
  if (!d) return null;
  const date = new Date(d as string);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

/** Rough reading time at 200 wpm from HTML content. */
function readingTimeMinutes(html: string): number {
  const words = html.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

/** Public post shape. With `lang`, bilingual fields collapse to a single string. */
export function serializePost(p: any, lang: Lang | null, opts: { includeContent: boolean }) {
  const pick = (field: any) => (lang ? field?.[lang] || field?.en || "" : { en: field?.en || "", fr: field?.fr || "" });
  const out: Record<string, unknown> = {
    id: String(p._id),
    slug: p.slug,
    title: pick(p.title),
    excerpt: pick(p.excerpt),
    metaTitle: pick(p.metaTitle),
    metaDescription: pick(p.metaDescription),
    author: p.author || "Transimex Logistics Editorial",
    category: p.category || "Industry Insights",
    tags: p.tags || [],
    featuredImage: p.featuredImage || "",
    publishedAt: iso(p.publishedAt ?? p.createdAt),
    updatedAt: iso(p.updatedAt),
    views: p.views || 0,
    allowComments: p.allowComments !== false,
    commentsCount: p.approvedCommentsCount ?? 0,
    readingTimeMinutes: {
      en: readingTimeMinutes(p.content?.en || ""),
      fr: readingTimeMinutes(p.content?.fr || ""),
    },
  };
  if (lang) out.readingTimeMinutes = (out.readingTimeMinutes as Record<Lang, number>)[lang];
  if (opts.includeContent) out.content = pick(p.content);
  return out;
}

export function serializeComment(c: any) {
  return {
    id: String(c._id),
    postSlug: c.postSlug,
    authorName: c.authorName,
    content: c.content,
    createdAt: iso(c.createdAt),
    adminReply: c.adminReply?.content
      ? {
          content: c.adminReply.content,
          repliedBy: c.adminReply.repliedBy || "Transimex Logistics Editorial",
          repliedAt: iso(c.adminReply.repliedAt),
        }
      : null,
  };
}

/** Number of Approved comments per post id (the stored commentsCount also counts hidden/pending ones). */
export async function approvedCountsByPost(postIds: unknown[]): Promise<Map<string, number>> {
  const rows = await BlogComment.aggregate([
    { $match: { postId: { $in: postIds }, status: "Approved" } },
    { $group: { _id: "$postId", n: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r: any) => [String(r._id), r.n as number]));
}

/** Published and not scheduled for the future. */
export function publishedFilter(): Record<string, any> {
  return {
    status: "Published",
    $or: [{ publishedAt: { $exists: false } }, { publishedAt: null }, { publishedAt: { $lte: new Date() } }],
  };
}

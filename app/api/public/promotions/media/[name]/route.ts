import { NextResponse } from "next/server";
import sharp from "sharp";
import connectDB from "@/lib/mongoose";
import PromotionMedia from "@/models/PromotionMedia";
import { isR2Configured, getFromR2, uploadToR2 } from "@/lib/r2";
import { PROMOTION_MEDIA_NAME, PROMOTION_MEDIA_PREFIX } from "@/lib/promotionsAdmin";

export const runtime = "nodejs";

const CACHE_HEADERS = {
  "Content-Type": "image/webp",
  // Content is immutable: replacing an image creates a new unique mediaId.
  // s-maxage and CDN-Cache-Control enable Vercel Edge CDN & Cloudflare caching (X-Vercel-Cache: HIT)
  "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
  "CDN-Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
  "Vercel-CDN-Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Cross-Origin-Resource-Policy": "cross-origin",
  "X-Content-Type-Options": "nosniff",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Max-Age": "86400",
    },
  });
}

// Public on purpose: the website loads these in <img>. Only files in the promotions/ folder with a
// generated name can be requested, so nothing else in the bucket is reachable through this route.
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await params;
    if (!PROMOTION_MEDIA_NAME.test(name)) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    let buffer: Buffer | null = null;

    // 1. Try Cloudflare R2 if configured
    if (isR2Configured()) {
      try {
        const object = await getFromR2(`${PROMOTION_MEDIA_PREFIX}${name}`);
        if (object?.buffer) {
          buffer = object.buffer;
        }
      } catch (err: any) {
        console.warn("[Cloudflare R2] Failed fetching promotion image from R2, checking database:", err.message);
      }
    }

    // 2. Fallback to MongoDB database
    if (!buffer) {
      await connectDB();
      const doc = await PromotionMedia.findOne({ mediaId: name }).lean<any>();
      if (doc?.data) {
        buffer = Buffer.isBuffer(doc.data) ? doc.data : Buffer.from(doc.data);
      }
    }

    if (!buffer) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Auto-compress legacy or oversized images (> 300 KB) down to max 1200px, lossy WebP quality 80 (< 200 KB)
    if (buffer.length > 300 * 1024) {
      try {
        const optimized = await sharp(buffer)
          .rotate()
          .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
          .webp({ quality: 80, effort: 6, smartSubsample: true })
          .toBuffer();

        if (optimized.length < buffer.length) {
          buffer = optimized;

          // Asynchronously write back optimized buffer to R2 so subsequent requests directly fetch the small version
          if (isR2Configured()) {
            uploadToR2({
              key: `${PROMOTION_MEDIA_PREFIX}${name}`,
              buffer: optimized,
              mimeType: "image/webp",
              cacheControl: "public, max-age=31536000, immutable",
            }).catch((r2Err: any) =>
              console.warn("[Cloudflare R2] Failed back-filling optimized image:", r2Err.message)
            );
          }
        }
      } catch (optErr: any) {
        console.warn("Failed auto-optimizing media image on the fly:", optErr.message);
      }
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        ...CACHE_HEADERS,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error) {
    console.error("Error serving promotion media:", error);
    return NextResponse.json({ error: "Failed to serve media" }, { status: 500 });
  }
}

export async function HEAD(req: Request, ctx: { params: Promise<{ name: string }> }) {
  const res = await GET(req, ctx);
  return new NextResponse(null, {
    status: res.status,
    headers: res.headers,
  });
}

import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import PromotionMedia from "@/models/PromotionMedia";
import { isR2Configured, getFromR2 } from "@/lib/r2";
import { PROMOTION_MEDIA_NAME, PROMOTION_MEDIA_PREFIX } from "@/lib/promotionsAdmin";

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

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
        "Content-Length": String(buffer.length),
        // Content is immutable: replacing an image creates a new name.
        "Cache-Control": "public, max-age=31536000, immutable",
        "Cross-Origin-Resource-Policy": "cross-origin",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Error serving promotion media:", error);
    return NextResponse.json({ error: "Failed to serve media" }, { status: 500 });
  }
}

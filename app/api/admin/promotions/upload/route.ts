import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { isR2Configured, uploadToR2 } from "@/lib/r2";
import {
  ImageMode,
  ImageProcessingError,
  MAX_UPLOAD_BYTES,
  processPromotionImage,
} from "@/lib/promotionImage";
import { PROMOTION_MEDIA_PREFIX, purgeOrphanedMedia, requirePromotionsAccess } from "@/lib/promotionsAdmin";

// sharp needs the Node.js runtime.
export const runtime = "nodejs";

const r2PublicUrl = () => (process.env.CLOUDFLARE_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL || "").trim();

/**
 * POST multipart/form-data { file, mode?: "lossless" | "near-lossless" }
 * Converts the upload to WebP (no visible quality loss), stores it in Cloudflare R2 and returns the
 * image reference that the promotion form then saves. Images are never stored in the database.
 */
export async function POST(req: Request) {
  try {
    const access = await requirePromotionsAccess();
    if (access.error) return access.error;

    if (!isR2Configured()) {
      return NextResponse.json({ error: "Image storage (Cloudflare R2) is not configured on the server." }, { status: 503 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "The file is empty" }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "Image size must not exceed 10MB" }, { status: 413 });
    }

    const mode: ImageMode = form.get("mode") === "near-lossless" ? "near-lossless" : "lossless";

    let processed;
    try {
      processed = await processPromotionImage(Buffer.from(await file.arrayBuffer()), mode);
    } catch (err) {
      if (err instanceof ImageProcessingError) {
        return NextResponse.json({ error: err.message }, { status: 415 });
      }
      throw err;
    }

    // mediaId is the file name inside the promotions/ folder; it is also what the media route serves.
    const mediaId = `${Date.now()}-${randomBytes(4).toString("hex")}.webp`;
    try {
      await uploadToR2({
        key: `${PROMOTION_MEDIA_PREFIX}${mediaId}`,
        buffer: processed.buffer,
        mimeType: "image/webp",
        metadata: { originalName: encodeURIComponent(file.name.slice(0, 120)), uploadedAt: new Date().toISOString() },
      });
    } catch (r2Err: any) {
      console.error("[Cloudflare R2] Promotion image upload failed:", r2Err.message);
      return NextResponse.json({ error: "Could not store the image. Please try again." }, { status: 502 });
    }

    void purgeOrphanedMedia();

    // With a public R2 domain configured the site loads straight from it; otherwise this app streams it from R2.
    const base = r2PublicUrl().replace(/\/$/, "");
    const url = base ? `${base}/${PROMOTION_MEDIA_PREFIX}${mediaId}` : `/api/public/promotions/media/${mediaId}`;

    return NextResponse.json({
      success: true,
      image: {
        url,
        width: processed.width,
        height: processed.height,
        bytes: processed.bytes,
        originalBytes: processed.originalBytes,
        mediaId,
      },
      conversion: {
        sourceFormat: processed.sourceFormat,
        method: processed.method,
        resized: processed.resized,
      },
    });
  } catch (error) {
    console.error("Error uploading promotion image:", error);
    return NextResponse.json({ error: "Failed to process image" }, { status: 500 });
  }
}

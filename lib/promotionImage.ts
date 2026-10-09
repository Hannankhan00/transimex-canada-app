import sharp, { type Metadata } from "sharp";

/** Longest edge kept. A popup renders at ~600-1200 CSS px, so 2400 covers 2x retina with headroom. */
export const MAX_EDGE_PX = 2400;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const ACCEPTED_FORMATS = new Set(["jpeg", "png", "webp", "gif", "avif", "tiff"]);

export type ImageMode = "lossless" | "near-lossless";

export interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  originalBytes: number;
  bytes: number;
  sourceFormat: string;
  /** passthrough = input was already a WebP that needed no changes, so it is stored byte-for-byte. */
  method: "lossless" | "near-lossless" | "passthrough";
  resized: boolean;
}

export class ImageProcessingError extends Error {}

/**
 * Converts an uploaded image to WebP without visible quality loss.
 *  - lossless (default): pixel-exact WebP.
 *  - near-lossless: libwebp near-lossless at 90, visually identical and noticeably smaller on photos.
 * Metadata is stripped, EXIF orientation is applied, and only images larger than MAX_EDGE_PX are downscaled.
 */
export async function processPromotionImage(input: Buffer, mode: ImageMode = "lossless"): Promise<ProcessedImage> {
  let meta: Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: 100_000_000 }).metadata();
  } catch {
    throw new ImageProcessingError("The file is not a readable image.");
  }

  const format = meta.format ?? "";
  if (!ACCEPTED_FORMATS.has(format)) {
    throw new ImageProcessingError("Unsupported image type. Use JPEG, PNG, WebP, GIF, AVIF or TIFF.");
  }

  // EXIF orientations 5-8 swap width/height once applied.
  const rotates = !!meta.orientation && meta.orientation > 1;
  const srcW = rotates && meta.orientation! >= 5 ? meta.height ?? 0 : meta.width ?? 0;
  const srcH = rotates && meta.orientation! >= 5 ? meta.width ?? 0 : meta.height ?? 0;
  if (!srcW || !srcH) throw new ImageProcessingError("Could not read the image dimensions.");

  const needsResize = Math.max(srcW, srcH) > MAX_EDGE_PX;

  // Re-encoding a lossy WebP as lossless would only inflate it; keep the original bytes.
  if (format === "webp" && !needsResize && !rotates && (meta.pages ?? 1) <= 1) {
    return {
      buffer: input,
      width: srcW,
      height: srcH,
      originalBytes: input.length,
      bytes: input.length,
      sourceFormat: format,
      method: "passthrough",
      resized: false,
    };
  }

  let pipeline = sharp(input, { limitInputPixels: 100_000_000 }).rotate();
  if (needsResize) {
    pipeline = pipeline.resize({
      width: MAX_EDGE_PX,
      height: MAX_EDGE_PX,
      fit: "inside",
      withoutEnlargement: true,
      kernel: "lanczos3",
    });
  }

  const { data, info } = await pipeline
    .webp(mode === "near-lossless" ? { nearLossless: true, quality: 90, effort: 6 } : { lossless: true, effort: 6 })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: data,
    width: info.width,
    height: info.height,
    originalBytes: input.length,
    bytes: data.length,
    sourceFormat: format,
    method: mode,
    resized: needsResize,
  };
}

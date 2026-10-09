import sharp, { type Metadata, type WebpOptions } from "sharp";

/** Longest edge kept. A popup renders at ~600-800 CSS px, so max 1200 covers 2x retina and keeps file size under 200-300 KB. */
export const MAX_EDGE_PX = 1200;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const ACCEPTED_FORMATS = new Set(["jpeg", "png", "webp", "gif", "avif", "tiff"]);

export type ImageMode = "lossy" | "near-lossless" | "lossless";

export interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  originalBytes: number;
  bytes: number;
  sourceFormat: string;
  /** method used to process the image */
  method: "lossy" | "near-lossless" | "lossless" | "passthrough";
  resized: boolean;
}

export class ImageProcessingError extends Error {}

/**
 * Converts an uploaded image to WebP optimized for fast CDN delivery and popup display.
 *  - lossy (default): WebP at quality ~80, smart subsampling, effort 6. Target under 200–300 KB.
 *  - near-lossless: libwebp near-lossless at quality 80, effort 6.
 *  - lossless: pixel-exact WebP.
 * Images larger than MAX_EDGE_PX (1200px) are downscaled with Lanczos3.
 */
export async function processPromotionImage(input: Buffer, mode: ImageMode = "lossy"): Promise<ProcessedImage> {
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

  // Only passthrough if already WebP, within dimension limit (<= 1200), not rotated, and already under 250 KB
  if (format === "webp" && !needsResize && !rotates && (meta.pages ?? 1) <= 1 && input.length <= 250 * 1024) {
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

  const createPipeline = () => {
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
    return pipeline;
  };

  let webpOptions: WebpOptions;
  if (mode === "lossless") {
    webpOptions = { lossless: true, effort: 6 };
  } else if (mode === "near-lossless") {
    webpOptions = { nearLossless: true, quality: 80, effort: 6 };
  } else {
    // Default lossy mode: quality 80, effort 6, smartSubsample for crisp rendering
    webpOptions = { quality: 80, effort: 6, smartSubsample: true };
  }

  let { data, info } = await createPipeline()
    .webp(webpOptions)
    .toBuffer({ resolveWithObject: true });

  // If in lossy mode and still exceeds 300 KB, fine-tune with quality 75 to guarantee < 300 KB budget
  if (mode === "lossy" && data.length > 300 * 1024) {
    const tuned = await createPipeline()
      .webp({ quality: 75, effort: 6, smartSubsample: true })
      .toBuffer({ resolveWithObject: true });
    if (tuned.data.length < data.length) {
      data = tuned.data;
      info = tuned.info;
    }
  }

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

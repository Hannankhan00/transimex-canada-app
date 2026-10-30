import sharp, { type Metadata } from "sharp";

/** Longest edge kept for blog images (covers cover images and in-article images on 2x screens). */
export const BLOG_MAX_EDGE_PX = 1600;

export class BlogImageError extends Error {}

export interface BlogImage {
  buffer: Buffer;
  mimeType: string;
  extension: string;
}

/**
 * Optimizes an uploaded blog image: resized to at most 1600px on the longest edge and converted to WebP (quality 80).
 * SVGs and animated images are stored untouched so they keep their sharpness and animation.
 */
export async function processBlogImage(input: Buffer, declaredType: string): Promise<BlogImage> {
  if (declaredType === "image/svg+xml") {
    return { buffer: input, mimeType: "image/svg+xml", extension: "svg" };
  }

  let meta: Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: 100_000_000 }).metadata();
  } catch {
    throw new BlogImageError("The file is not a readable image.");
  }

  if ((meta.pages ?? 1) > 1) {
    const ext = meta.format === "webp" ? "webp" : "gif";
    return { buffer: input, mimeType: `image/${ext}`, extension: ext };
  }

  const buffer = await sharp(input, { limitInputPixels: 100_000_000 })
    .rotate()
    .resize({
      width: BLOG_MAX_EDGE_PX,
      height: BLOG_MAX_EDGE_PX,
      fit: "inside",
      withoutEnlargement: true,
      kernel: "lanczos3",
    })
    .webp({ quality: 80, effort: 6, smartSubsample: true })
    .toBuffer();

  return { buffer, mimeType: "image/webp", extension: "webp" };
}

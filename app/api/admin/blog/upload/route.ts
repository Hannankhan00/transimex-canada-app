import { NextResponse } from "next/server";
import { uploadToR2 } from "@/lib/r2";
import { BlogImageError, processBlogImage } from "@/lib/blogImage";

// sharp needs the Node.js runtime.
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image files (JPEG, PNG, WEBP, GIF, SVG) are supported" },
        { status: 400 }
      );
    }

    // Limit to 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Image size must not exceed 10MB" },
        { status: 400 }
      );
    }

    let image;
    try {
      image = await processBlogImage(Buffer.from(await file.arrayBuffer()), file.type);
    } catch (err) {
      if (err instanceof BlogImageError) {
        return NextResponse.json({ error: err.message }, { status: 415 });
      }
      throw err;
    }

    const baseName = file.name.replace(/\.[^.]*$/, "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || "image";
    const r2Key = `blog/${Date.now()}-${baseName}.${image.extension}`;

    const blogBucket = process.env.BLOG_R2_BUCKET_NAME?.trim();
    const blogPublicUrl = process.env.BLOG_R2_PUBLIC_URL?.trim();

    // Blog images must be publicly reachable by the website, so they live in their own public bucket,
    // never in the private vault used for documents and invoices.
    const blogAccessKeyId = process.env.BLOG_R2_ACCESS_KEY_ID?.trim();
    const blogSecretAccessKey = process.env.BLOG_R2_SECRET_ACCESS_KEY?.trim();

    if (!blogBucket || !blogPublicUrl || !blogAccessKeyId || !blogSecretAccessKey) {
      return NextResponse.json(
        {
          error:
            "Blog image storage is not configured (BLOG_R2_BUCKET_NAME, BLOG_R2_PUBLIC_URL, BLOG_R2_ACCESS_KEY_ID, BLOG_R2_SECRET_ACCESS_KEY).",
        },
        { status: 503 }
      );
    }

    try {
      const r2Result = await uploadToR2({
        bucket: blogBucket,
        publicUrl: blogPublicUrl,
        credentials: { accessKeyId: blogAccessKeyId, secretAccessKey: blogSecretAccessKey },
        key: r2Key,
        buffer: image.buffer,
        mimeType: image.mimeType,
        metadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
        },
      });

      return NextResponse.json({
        success: true,
        url: r2Result.url,
        fileName: file.name,
        storageProvider: "r2",
      });
    } catch (r2Err: any) {
      console.error("[Cloudflare R2] Blog image upload failed:", r2Err.message);
      return NextResponse.json({ error: "Failed to upload image to storage." }, { status: 502 });
    }
  } catch (error: any) {
    console.error("Error uploading blog image:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload image" },
      { status: 500 }
    );
  }
}

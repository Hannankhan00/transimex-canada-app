import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import BlogMedia from "@/models/BlogMedia";
import { isR2Configured, uploadToR2 } from "@/lib/r2";

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

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const r2Key = `blog/${Date.now()}-${sanitizedFileName}`;

    if (isR2Configured()) {
      try {
        const r2Result = await uploadToR2({
          key: r2Key,
          buffer,
          mimeType: file.type || "image/jpeg",
          metadata: {
            originalName: file.name,
            uploadedAt: new Date().toISOString(),
          },
        });

        if (r2Result.url) {
          return NextResponse.json({
            success: true,
            url: r2Result.url,
            fileName: file.name,
            storageProvider: "r2",
          });
        }
      } catch (r2Err: any) {
        console.warn("[Cloudflare R2] Blog image upload failed, falling back to database storage:", r2Err.message);
      }
    }

    // Database fallback (works on any deployment environment including Vercel)
    await connectDB();
    const media = await BlogMedia.create({
      fileName: file.name,
      mimeType: file.type || "image/jpeg",
      fileSize: file.size,
      fileData: buffer,
      storageProvider: "mongodb",
    });

    const fileUrl = `/api/admin/blog/media/${media._id.toString()}`;

    return NextResponse.json({
      success: true,
      url: fileUrl,
      fileName: file.name,
      storageProvider: "mongodb",
    });
  } catch (error: any) {
    console.error("Error uploading blog image:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload image" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import BlogMedia from "@/models/BlogMedia";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();

    const media = await BlogMedia.findById(id).lean();
    if (!media) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    if (media.storageProvider === "r2" && media.fileUrl) {
      return NextResponse.redirect(media.fileUrl);
    }

    if (!media.fileData) {
      return NextResponse.json({ error: "Image data missing" }, { status: 404 });
    }

    const buffer = Buffer.isBuffer(media.fileData)
      ? media.fileData
      : Buffer.from((media.fileData as any).buffer || media.fileData);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": media.mimeType || "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error: any) {
    console.error("Error serving blog media:", error);
    return NextResponse.json({ error: "Failed to serve media" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Resource from "@/models/Resource";
import { getFromR2 } from "@/lib/r2";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();
    const resource = await Resource.findById(id);
    if (!resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    // Increment downloads count asynchronously
    resource.downloadsCount = (resource.downloadsCount || 0) + 1;
    await resource.save();

    const safeFilename = resource.fileName.replace(/[^a-zA-Z0-9_.-]/g, "_");

    // 1. Try serving from Cloudflare R2 if fileKey exists
    if (resource.fileKey) {
      const r2File = await getFromR2(resource.fileKey);
      if (r2File) {
        return new NextResponse(new Uint8Array(r2File.buffer), {
          status: 200,
          headers: {
            "Content-Type": r2File.contentType || resource.mimeType || "application/octet-stream",
            "Content-Disposition": `attachment; filename="${safeFilename}"`,
            "Content-Length": String(r2File.contentLength),
            "X-Storage-Provider": "cloudflare-r2",
          },
        });
      }
    }

    // 2. Fallback to database buffer
    if (resource.fileData) {
      return new NextResponse(new Uint8Array(resource.fileData), {
        status: 200,
        headers: {
          "Content-Type": resource.mimeType || "application/octet-stream",
          "Content-Disposition": `attachment; filename="${safeFilename}"`,
          "X-Storage-Provider": "mongodb-buffer",
        },
      });
    }

    return NextResponse.json(
      { error: "Resource file data not found" },
      { status: 404 }
    );
  } catch (error: any) {
    console.error("Error downloading resource:", error);
    return NextResponse.json(
      { error: error.message || "Failed to download resource" },
      { status: 500 }
    );
  }
}


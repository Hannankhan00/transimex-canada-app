import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import PortalDocument from "@/models/PortalDocument";
import { getFromR2 } from "@/lib/r2";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { docId } = await params;
    await connectDB();
    const doc = await PortalDocument.findById(docId);
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const safeFilename = doc.name.replace(/[^a-zA-Z0-9_.-]/g, "_");

    // 1. Try serving from Cloudflare R2 if a storage key exists
    if (doc.fileKey) {
      const r2File = await getFromR2(doc.fileKey);
      if (r2File) {
        return new NextResponse(new Uint8Array(r2File.buffer), {
          status: 200,
          headers: {
            "Content-Type": r2File.contentType || doc.mimeType || "application/pdf",
            "Content-Disposition": `inline; filename="${safeFilename}"`,
            "Content-Length": String(r2File.contentLength),
            "X-Storage-Provider": "cloudflare-r2",
          },
        });
      }
    }

    // 2. Serve from database buffer if available
    if (doc.fileData) {
      return new NextResponse(new Uint8Array(doc.fileData), {
        status: 200,
        headers: {
          "Content-Type": doc.mimeType || "application/pdf",
          "Content-Disposition": `inline; filename="${safeFilename}"`,
          "X-Storage-Provider": "mongodb-buffer",
        },
      });
    }

    return NextResponse.json(
      { error: "Document content is unavailable or has not been uploaded yet" },
      { status: 404 }
    );
  } catch (error: any) {
    console.error("Error downloading document:", error);
    return NextResponse.json(
      { error: error.message || "Failed to download document" },
      { status: 500 }
    );
  }
}


import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Resource from "@/models/Resource";
import { isR2Configured, uploadToR2 } from "@/lib/r2";

function toResourceMeta(doc: any) {
  return {
    id: doc._id.toString(),
    titleEn: doc.titleEn,
    titleFr: doc.titleFr,
    category: doc.category,
    fileName: doc.fileName,
    mimeType: doc.mimeType,
    fileSize: doc.fileSize,
    storageProvider: doc.storageProvider || "mongodb",
    fileUrl: doc.fileUrl || "",
    downloadsCount: doc.downloadsCount,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : "",
  };
}

export async function GET() {
  try {
    await connectDB();
    const docs = await Resource.find({})
      .select("titleEn titleFr category fileName mimeType fileSize storageProvider fileUrl downloadsCount createdAt")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      resources: docs.map(toResourceMeta),
    });
  } catch (error: any) {
    console.error("Error fetching resources:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch resources" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const titleEn = formData.get("titleEn");
    const titleFr = formData.get("titleFr");
    const category = formData.get("category");
    const file = formData.get("file");

    if (!titleEn || typeof titleEn !== "string") {
      return NextResponse.json({ error: "titleEn is required" }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const r2Key = `resources/${Date.now()}-${sanitizedFileName}`;

    let fileKey = "";
    let fileUrl = "";
    let storageProvider: "r2" | "mongodb" = "mongodb";
    let fileDataBuffer: Buffer | undefined = undefined;

    if (isR2Configured()) {
      try {
        const r2Result = await uploadToR2({
          key: r2Key,
          buffer,
          mimeType: file.type || "application/octet-stream",
          metadata: {
            titleEn,
            originalName: file.name,
            category: typeof category === "string" ? category : "General",
          },
        });
        fileKey = r2Result.key;
        fileUrl = r2Result.url || "";
        storageProvider = "r2";
      } catch (r2Err: any) {
        console.warn("[Cloudflare R2] Resource upload failed, falling back to database buffer:", r2Err.message);
        fileDataBuffer = buffer;
        storageProvider = "mongodb";
      }
    } else {
      // Graceful fallback when Cloudflare R2 credentials are not yet entered in .env.local
      fileDataBuffer = buffer;
      storageProvider = "mongodb";
    }

    await connectDB();
    const resource = await Resource.create({
      titleEn,
      titleFr: typeof titleFr === "string" && titleFr.trim() ? titleFr : titleEn,
      category: typeof category === "string" && category.trim() ? category : "General",
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      fileSize: file.size,
      fileKey,
      fileUrl,
      storageProvider,
      fileData: fileDataBuffer,
      downloadsCount: 0,
    });

    return NextResponse.json({
      success: true,
      resource: toResourceMeta(resource),
      storageProvider,
    });
  } catch (error: any) {
    console.error("Error creating resource:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create resource" },
      { status: 500 }
    );
  }
}


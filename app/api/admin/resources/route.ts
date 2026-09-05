import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Resource from "@/models/Resource";

function toResourceMeta(doc: any) {
  return {
    id: doc._id.toString(),
    titleEn: doc.titleEn,
    titleFr: doc.titleFr,
    category: doc.category,
    fileName: doc.fileName,
    mimeType: doc.mimeType,
    fileSize: doc.fileSize,
    downloadsCount: doc.downloadsCount,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : "",
  };
}

export async function GET() {
  try {
    await connectDB();
    const docs = await Resource.find({})
      .select("titleEn titleFr category fileName mimeType fileSize downloadsCount createdAt")
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

    await connectDB();
    const resource = await Resource.create({
      titleEn,
      titleFr: typeof titleFr === "string" && titleFr.trim() ? titleFr : titleEn,
      category: typeof category === "string" && category.trim() ? category : "General",
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      fileSize: file.size,
      fileData: buffer,
      downloadsCount: 0,
    });

    return NextResponse.json({
      success: true,
      resource: toResourceMeta(resource),
    });
  } catch (error: any) {
    console.error("Error creating resource:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create resource" },
      { status: 500 }
    );
  }
}

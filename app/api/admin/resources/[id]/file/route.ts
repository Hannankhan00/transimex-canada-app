import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Resource from "@/models/Resource";

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

    resource.downloadsCount = (resource.downloadsCount || 0) + 1;
    await resource.save();

    return new NextResponse(new Uint8Array(resource.fileData), {
      status: 200,
      headers: {
        "Content-Type": resource.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${resource.fileName}"`,
      },
    });
  } catch (error: any) {
    console.error("Error downloading resource:", error);
    return NextResponse.json(
      { error: error.message || "Failed to download resource" },
      { status: 500 }
    );
  }
}

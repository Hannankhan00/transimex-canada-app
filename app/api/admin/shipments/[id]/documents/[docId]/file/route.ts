import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import PortalDocument from "@/models/PortalDocument";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { docId } = await params;
    await connectDB();
    const doc = await PortalDocument.findById(docId);
    if (!doc || !doc.fileData) {
      return NextResponse.json({ error: "Document file not found" }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(doc.fileData), {
      status: 200,
      headers: {
        "Content-Type": doc.mimeType || "application/pdf",
        "Content-Disposition": `attachment; filename="${doc.name}"`,
      },
    });
  } catch (error: any) {
    console.error("Error downloading document:", error);
    return NextResponse.json(
      { error: error.message || "Failed to download document" },
      { status: 500 }
    );
  }
}

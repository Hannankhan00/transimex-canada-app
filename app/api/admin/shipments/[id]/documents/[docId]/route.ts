import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import PortalDocument from "@/models/PortalDocument";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { docId } = await params;
    const body = await req.json().catch(() => ({}));
    const { isClientVisible } = body;

    await connectDB();
    const doc = await PortalDocument.findById(docId);
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    doc.isClientVisible = typeof isClientVisible === "boolean" ? isClientVisible : !doc.isClientVisible;
    await doc.save();

    return NextResponse.json({
      success: true,
      message: `Document ${docId} visibility updated to ${doc.isClientVisible ? "Public in Client Vault" : "Internal Confidential"}`,
      document: { ...doc.toObject(), id: doc._id.toString() },
    });
  } catch (error: any) {
    console.error("Error updating document visibility:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update document visibility" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { toggleDocumentVisibility, getStoredDocuments, saveStoredDocuments } from "@/lib/mockData";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id, docId } = await params;
    const body = await req.json().catch(() => ({}));
    const { isClientVisible } = body;

    const allDocs = getStoredDocuments();
    const index = allDocs.findIndex((d) => d.id === docId);

    if (index === -1) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const newVisibility =
      typeof isClientVisible === "boolean"
        ? isClientVisible
        : !allDocs[index].isClientVisible;

    allDocs[index] = {
      ...allDocs[index],
      isClientVisible: newVisibility,
    };

    saveStoredDocuments(allDocs);

    return NextResponse.json({
      success: true,
      message: `Document ${docId} visibility updated to ${newVisibility ? "Public in Client Vault" : "Internal Confidential"}`,
      document: allDocs[index],
    });
  } catch (error: any) {
    console.error("Error updating document visibility:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update document visibility" },
      { status: 500 }
    );
  }
}

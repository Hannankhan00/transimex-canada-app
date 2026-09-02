import { NextResponse } from "next/server";
import { VaultDocument, addDocumentToStore, getStoredDocuments } from "@/lib/mockData";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const allDocs = getStoredDocuments();
    // Filter docs for this shipment (or generic docs if matching)
    const shipmentDocs = allDocs.filter(
      (d) => d.shipmentId.toLowerCase() === id.toLowerCase()
    );

    return NextResponse.json({
      success: true,
      documents: shipmentDocs,
    });
  } catch (error: any) {
    console.error("Error fetching shipment documents:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, type, size, isClientVisible, statusText, downloadUrl, customsPars } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: "Document name and document type are required" },
        { status: 400 }
      );
    }

    const docId = `DOC-${Math.floor(10000 + Math.random() * 90000)}`;
    const now = new Date();
    const formattedDate = now.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });

    const newDoc: VaultDocument = {
      id: docId,
      name,
      type,
      shipmentId: id,
      dateUploaded: formattedDate,
      size: size || "250 KB",
      isClientVisible: isClientVisible === true, // Default to false (strictly internal)
      fileFormat: "PDF",
      downloadUrl: downloadUrl || "",
      statusText: statusText || "Staff Uploaded - Broker Verified",
      ...(customsPars && { customsPars }),
    };

    addDocumentToStore(newDoc);

    return NextResponse.json({
      success: true,
      message: `Document ${name} successfully registered to shipment ${id}`,
      document: newDoc,
    });
  } catch (error: any) {
    console.error("Error uploading shipment document:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload document" },
      { status: 500 }
    );
  }
}

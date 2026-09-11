import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import PortalDocument from "@/models/PortalDocument";
import { getCurrentUser } from "@/lib/session";
import { formatDateLabel } from "@/lib/formatDate";
import { buildSimplePdf } from "@/lib/pdf";
import { getFromR2 } from "@/lib/r2";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await connectDB();
    const doc = await PortalDocument.findOne({
      _id: id,
      userId: currentUser.userId,
      isClientVisible: true,
    }).lean<any>();

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const safeFilename = doc.name.replace(/[^a-zA-Z0-9_.-]/g, "_");

    // 1. Try serving from Cloudflare R2 if a storage key is present
    if (doc.fileKey) {
      const r2File = await getFromR2(doc.fileKey);
      if (r2File) {
        return new NextResponse(new Uint8Array(r2File.buffer), {
          headers: {
            "Content-Type": r2File.contentType || doc.mimeType || "application/pdf",
            "Content-Disposition": `attachment; filename="${safeFilename}"`,
            "Content-Length": String(r2File.contentLength),
            "X-Storage-Provider": "cloudflare-r2",
          },
        });
      }
    }

    // 2. Serve from database buffer if available (fallback or pre-R2 upload)
    if (doc.fileData) {
      return new NextResponse(new Uint8Array(doc.fileData), {
        headers: {
          "Content-Type": doc.mimeType || "application/pdf",
          "Content-Disposition": `attachment; filename="${safeFilename}"`,
          "X-Storage-Provider": "mongodb-buffer",
        },
      });
    }

    // 3. Fallback for legacy records with no stored file bytes.
    const pdf = buildSimplePdf("Transimex Canada Logistics - Official Shipping Document", [
      `Document ID: ${doc._id.toString()}`,
      `Shipment ID: ${doc.shipmentId}`,
      `Document Type: ${doc.type}`,
      `Date Uploaded: ${formatDateLabel(doc.createdAt)}`,
      `Verification: ${doc.statusText}`,
      doc.customsPars ? `CBSA PARS: ${doc.customsPars}` : "",
      "",
      "Certified under Canadian Freight & Customs Regulations.",
    ].filter(Boolean));

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeFilename}"`,
        "X-Storage-Provider": "generated-pdf",
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


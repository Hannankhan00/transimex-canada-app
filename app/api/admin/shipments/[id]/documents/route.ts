import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongoose";
import Shipment from "@/models/Shipment";
import PortalDocument, { PortalDocumentType } from "@/models/PortalDocument";
import { verifyToken } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notifications";
import { isR2Configured, uploadToR2 } from "@/lib/r2";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();
    const documents = await PortalDocument.find({ shipmentId: id })
      .select("-fileData")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      documents: documents.map((d: any) => ({ ...d, id: d._id.toString() })),
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

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null;
    const isClientVisible = formData.get("isClientVisible") === "true";
    const statusText = (formData.get("statusText") as string) || "Staff Uploaded - Broker Verified";
    const customsPars = (formData.get("customsPars") as string) || "";

    if (!file || !type) {
      return NextResponse.json(
        { error: "Document file and document type are required" },
        { status: 400 }
      );
    }

    await connectDB();
    const shipment = await Shipment.findOne({ trackingNumber: id });
    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const r2Key = `documents/${encodeURIComponent(id)}/${Date.now()}-${sanitizedFileName}`;

    let fileKey = "";
    let fileUrl = "";
    let storageProvider: "r2" | "mongodb" = "mongodb";
    let fileDataBuffer: Buffer | undefined = undefined;

    if (isR2Configured()) {
      try {
        const r2Result = await uploadToR2({
          key: r2Key,
          buffer,
          mimeType: file.type || "application/pdf",
          metadata: {
            shipmentId: id,
            documentType: type,
            originalName: file.name,
          },
        });
        fileKey = r2Result.key;
        fileUrl = r2Result.url || "";
        storageProvider = "r2";
      } catch (r2Err: any) {
        console.warn("[Cloudflare R2] Upload failed, falling back to database buffer:", r2Err.message);
        fileDataBuffer = buffer;
        storageProvider = "mongodb";
      }
    } else {
      // Graceful fallback when user has not yet entered Cloudflare R2 envs in .env.local
      fileDataBuffer = buffer;
      storageProvider = "mongodb";
    }

    const doc = await PortalDocument.create({
      userId: shipment.client?.userId || "",
      shipmentId: id,
      name: file.name,
      type: type as PortalDocumentType,
      isClientVisible,
      statusText,
      customsPars,
      mimeType: file.type || "application/pdf",
      fileSize: file.size,
      fileKey,
      fileUrl,
      storageProvider,
      fileData: fileDataBuffer,
    });

    // Best-effort audit trail entry — never blocks the response
    const actor = verifyToken((await cookies()).get("token")?.value || "");
    if (actor) {
      await logAudit({
        actor,
        action: "DOCUMENT_UPLOAD",
        resourceType: "Document",
        resourceId: id,
        details: `Uploaded document "${file.name}" (${type}) to shipment ${id} via ${storageProvider.toUpperCase()}.`,
      });
    }

    if (isClientVisible) {
      await notifyUser({
        userId: doc.userId,
        category: "document",
        shipmentId: doc.shipmentId,
        title: `New Document Available — ${id}`,
        titleFr: `Nouveau Document Disponible — ${id}`,
        desc: `${type} "${file.name}" has been uploaded and is ready for download for shipment ${id}.`,
        descFr: `${type} « ${file.name} » a été téléversé et est prêt à être téléchargé pour l'expédition ${id}.`,
        link: `/dashboard/documents`,
      });
    }

    const docObj: any = doc.toObject();
    delete docObj.fileData;

    return NextResponse.json({
      success: true,
      message: `Document ${file.name} successfully registered to shipment ${id} using ${storageProvider.toUpperCase()}`,
      document: { ...docObj, id: doc._id.toString() },
      storageProvider,
    });
  } catch (error: any) {
    console.error("Error uploading shipment document:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload document" },
      { status: 500 }
    );
  }
}

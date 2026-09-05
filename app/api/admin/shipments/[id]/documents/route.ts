import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongoose";
import Shipment from "@/models/Shipment";
import PortalDocument, { PortalDocumentType } from "@/models/PortalDocument";
import { verifyToken } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

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
      fileData: buffer,
    });

    // Best-effort audit trail entry — never blocks the response
    const actor = verifyToken((await cookies()).get("token")?.value || "");
    if (actor) {
      await logAudit({
        actor,
        action: "DOCUMENT_UPLOAD",
        resourceType: "Document",
        resourceId: id,
        details: `Uploaded document "${file.name}" (${type}) to shipment ${id}.`,
      });
    }

    const docObj: any = doc.toObject();
    delete docObj.fileData;

    return NextResponse.json({
      success: true,
      message: `Document ${file.name} successfully registered to shipment ${id}`,
      document: { ...docObj, id: doc._id.toString() },
    });
  } catch (error: any) {
    console.error("Error uploading shipment document:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload document" },
      { status: 500 }
    );
  }
}

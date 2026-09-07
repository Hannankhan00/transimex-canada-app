import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import PortalDocument from "@/models/PortalDocument";
import { notifyUser } from "@/lib/notifications";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { docId } = await params;
    const body = await req.json();
    const { isClientVisible } = body;

    await connectDB();
    const doc = await PortalDocument.findById(docId);
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const wasVisible = doc.isClientVisible;
    if (typeof isClientVisible === "boolean") {
      doc.isClientVisible = isClientVisible;
    }
    await doc.save();

    if (isClientVisible === true && !wasVisible) {
      await notifyUser({
        userId: doc.userId,
        category: "document",
        shipmentId: doc.shipmentId,
        title: `New Document Available — ${doc.shipmentId}`,
        titleFr: `Nouveau Document Disponible — ${doc.shipmentId}`,
        desc: `${doc.type} "${doc.name}" is now available for download for shipment ${doc.shipmentId}.`,
        descFr: `${doc.type} « ${doc.name} » est maintenant disponible pour l'expédition ${doc.shipmentId}.`,
        link: `/dashboard/documents`,
      });
    }

    const docObj: any = doc.toObject();
    delete docObj.fileData;

    return NextResponse.json({
      success: true,
      message: `Document ${doc.name} visibility updated`,
      document: { ...docObj, id: doc._id.toString() },
    });
  } catch (error: any) {
    console.error("Error updating document visibility:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update document" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Shipment from "@/models/Shipment";
import PortalDocument from "@/models/PortalDocument";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();
    const documents = await PortalDocument.find({ shipmentId: id }).sort({ createdAt: -1 }).lean();

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
    const body = await req.json();
    const { name, type, isClientVisible, statusText, customsPars } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: "Document name and document type are required" },
        { status: 400 }
      );
    }

    await connectDB();
    const shipment = await Shipment.findOne({ trackingNumber: id });
    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }

    const doc = await PortalDocument.create({
      userId: shipment.client?.userId || "",
      shipmentId: id,
      name,
      type,
      isClientVisible: isClientVisible === true,
      statusText: statusText || "Staff Uploaded - Broker Verified",
      customsPars: customsPars || "",
    });

    return NextResponse.json({
      success: true,
      message: `Document ${name} successfully registered to shipment ${id}`,
      document: { ...doc.toObject(), id: doc._id.toString() },
    });
  } catch (error: any) {
    console.error("Error uploading shipment document:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload document" },
      { status: 500 }
    );
  }
}

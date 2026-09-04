import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import PortalDocument from "@/models/PortalDocument";
import { getCurrentUser } from "@/lib/session";
import { formatDateLabel } from "@/lib/formatDate";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    await connectDB();
    const documents = await PortalDocument.find({
      userId: currentUser.userId,
      isClientVisible: true,
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      documents: documents.map((d: any) => ({
        id: d._id.toString(),
        name: d.name,
        type: d.type,
        shipmentId: d.shipmentId,
        dateUploaded: formatDateLabel(d.createdAt),
        statusText: d.statusText,
        customsPars: d.customsPars || "",
      })),
    });
  } catch (error: any) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

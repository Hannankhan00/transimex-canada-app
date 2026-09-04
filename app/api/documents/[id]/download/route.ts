import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import PortalDocument from "@/models/PortalDocument";
import { getCurrentUser } from "@/lib/session";
import { formatDateLabel } from "@/lib/formatDate";
import { buildSimplePdf } from "@/lib/pdf";

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
        "Content-Disposition": `attachment; filename="${doc.name.replace(/[^a-zA-Z0-9_.-]/g, "_")}"`,
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

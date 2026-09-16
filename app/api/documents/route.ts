import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import PortalDocument from "@/models/PortalDocument";
import Invoice from "@/models/Invoice";
import { getCurrentUser } from "@/lib/session";
import { formatDateLabel } from "@/lib/formatDate";

const INVOICE_STATUS_TEXT: Record<string, string> = {
  paid: "Verified & Paid",
  pending_verification: "Pending Verification",
  unpaid: "Awaiting Payment",
};

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    await connectDB();
    const [documents, invoices] = await Promise.all([
      PortalDocument.find({
        userId: currentUser.userId,
        isClientVisible: true,
      })
        .sort({ createdAt: -1 })
        .lean(),
      Invoice.find({
        $or: [{ "client.userId": currentUser.userId }, { "client.email": currentUser.email }],
      })
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    const documentItems = documents.map((d: any) => ({
      id: d._id.toString(),
      name: d.name,
      type: d.type,
      shipmentId: d.shipmentId,
      dateUploaded: formatDateLabel(d.createdAt),
      statusText: d.statusText,
      customsPars: d.customsPars || "",
      mimeType: d.mimeType || "application/pdf",
      fileSize: d.fileSize || 0,
      storageProvider: d.storageProvider || "mongodb",
    }));

    const invoiceItems = invoices.map((inv: any) => ({
      id: `inv_${inv._id.toString()}`,
      name: `Invoice ${inv.invoiceNumber}`,
      type: inv.kind === "duties" ? "Customs Entry" : "Commercial Invoice",
      shipmentId: inv.shipmentTrackingNumber,
      dateUploaded: formatDateLabel(inv.issueDate),
      statusText: INVOICE_STATUS_TEXT[inv.status] || "Issued",
      mimeType: "application/pdf",
      fileSize: 0,
      storageProvider: inv.pdfFile?.storageProvider || "mongodb",
    }));

    return NextResponse.json({
      success: true,
      documents: [...documentItems, ...invoiceItems],
    });
  } catch (error: any) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

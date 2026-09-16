import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { findInvoiceByIdOrNumber, getInvoicePdfBuffer } from "@/lib/invoice";

function isOwner(invoice: any, currentUser: { userId: string; email: string }) {
  return (
    (invoice.client?.userId && invoice.client.userId === currentUser.userId) ||
    (invoice.client?.email && invoice.client.email.toLowerCase() === currentUser.email.toLowerCase())
  );
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const invoice = await findInvoiceByIdOrNumber(id);
    if (!invoice || !isOwner(invoice, currentUser)) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const pdf = await getInvoicePdfBuffer(invoice);
    const { searchParams } = new URL(req.url);
    const disposition = searchParams.get("inline") === "true" ? "inline" : "attachment";

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="${invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("Error generating invoice PDF:", error);
    return NextResponse.json({ error: error.message || "Failed to generate invoice PDF" }, { status: 500 });
  }
}

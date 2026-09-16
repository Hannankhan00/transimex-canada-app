import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { findInvoiceByIdOrNumber, stripInvoiceBuffers } from "@/lib/invoice";

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

    const invoiceObj: any = stripInvoiceBuffers(invoice.toObject());

    return NextResponse.json({ success: true, invoice: { ...invoiceObj, id: invoice._id.toString() } });
  } catch (error: any) {
    console.error("Error fetching invoice:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch invoice" }, { status: 500 });
  }
}

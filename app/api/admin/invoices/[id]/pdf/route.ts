import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import { verifyToken } from "@/lib/auth";
import { hasModulePermission } from "@/lib/rbac";
import { findInvoiceByIdOrNumber, getInvoicePdfBuffer } from "@/lib/invoice";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const actor = verifyToken(token);
    if (!actor) return NextResponse.json({ error: "Invalid session token" }, { status: 401 });

    await connectDB();
    const actorUser = await User.findById(actor.userId).lean<any>();
    if (!actorUser || !hasModulePermission(actorUser, "invoices")) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to access invoices." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const invoice = await findInvoiceByIdOrNumber(id);
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

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

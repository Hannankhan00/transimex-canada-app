import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import { verifyToken } from "@/lib/auth";
import { hasModulePermission } from "@/lib/rbac";
import { findInvoiceByIdOrNumber } from "@/lib/invoice";

async function requireInvoicesAccess() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const actor = verifyToken(token);
  if (!actor) {
    return { error: NextResponse.json({ error: "Invalid session token" }, { status: 401 }) };
  }

  await connectDB();
  const actorUser = await User.findById(actor.userId).lean<any>();
  if (!actorUser || !hasModulePermission(actorUser, "invoices")) {
    return {
      error: NextResponse.json(
        { error: "Forbidden: You do not have permission to access invoices." },
        { status: 403 }
      ),
    };
  }

  return { actor, actorUser };
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await requireInvoicesAccess();
    if (access.error) return access.error;

    const { id } = await params;
    const invoice = await findInvoiceByIdOrNumber(id);
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    const invoiceObj: any = invoice.toObject();
    if (invoiceObj.paymentProof) delete invoiceObj.paymentProof.fileData;

    return NextResponse.json({ success: true, invoice: { ...invoiceObj, id: invoice._id.toString() } });
  } catch (error: any) {
    console.error("Error fetching invoice:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch invoice" }, { status: 500 });
  }
}

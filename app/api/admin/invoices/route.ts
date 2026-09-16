import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongoose";
import Invoice from "@/models/Invoice";
import User from "@/models/User";
import { verifyToken } from "@/lib/auth";
import { hasModulePermission } from "@/lib/rbac";

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

export async function GET(req: Request) {
  try {
    const access = await requireInvoicesAccess();
    if (access.error) return access.error;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("q")?.toLowerCase() || "";

    await connectDB();
    const query: any = {};
    if (status && status !== "all") query.status = status;

    const invoices = await Invoice.find(query)
      .select("-paymentProof.fileData -pdfFile.fileData")
      .sort({ createdAt: -1 })
      .lean();

    let filtered = invoices;
    if (search) {
      filtered = filtered.filter(
        (inv: any) =>
          inv.invoiceNumber.toLowerCase().includes(search) ||
          inv.quoteRefNumber.toLowerCase().includes(search) ||
          inv.shipmentTrackingNumber.toLowerCase().includes(search) ||
          inv.client?.name?.toLowerCase().includes(search) ||
          inv.client?.companyName?.toLowerCase().includes(search)
      );
    }

    const counts = {
      all: invoices.length,
      unpaid: invoices.filter((i: any) => i.status === "unpaid").length,
      pending_verification: invoices.filter((i: any) => i.status === "pending_verification").length,
      paid: invoices.filter((i: any) => i.status === "paid").length,
    };

    return NextResponse.json({
      success: true,
      invoices: filtered.map((i: any) => ({ ...i, id: i._id.toString() })),
      counts,
    });
  } catch (error: any) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch invoices" }, { status: 500 });
  }
}

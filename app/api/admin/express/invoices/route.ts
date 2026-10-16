import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import ExpressInvoice from "@/models/ExpressInvoice";
import { requireExpressStaff } from "@/lib/express/access";
import { toAdminInvoiceDTO } from "@/lib/express/invoiceDto";

const FILTERS = ["issued", "overdue", "paid", "void"] as const;

export async function GET(req: Request) {
  try {
    const access = await requireExpressStaff();
    if (access.error) return access.error;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const q = (searchParams.get("q") || "").trim().toLowerCase();
    const now = new Date();

    const filter: Record<string, unknown> = {};
    if (status === "overdue") Object.assign(filter, { status: "issued", dueAt: { $lt: now } });
    else if (status === "issued") Object.assign(filter, { status: "issued", dueAt: { $gte: now } });
    else if (status && (FILTERS as readonly string[]).includes(status)) filter.status = status;

    await connectDB();
    const [docs, issued, overdue, paid, voided] = await Promise.all([
      ExpressInvoice.find(filter).sort({ issuedAt: -1 }).limit(500).lean(),
      ExpressInvoice.aggregate([{ $match: { status: "issued", dueAt: { $gte: now } } }, { $group: { _id: null, count: { $sum: 1 }, total: { $sum: "$totalCents" } } }]),
      ExpressInvoice.aggregate([{ $match: { status: "issued", dueAt: { $lt: now } } }, { $group: { _id: null, count: { $sum: 1 }, total: { $sum: "$totalCents" } } }]),
      ExpressInvoice.countDocuments({ status: "paid" }),
      ExpressInvoice.countDocuments({ status: "void" }),
    ]);

    const userIds = Array.from(new Set(docs.map((d) => d.userId))).filter((id) => isValidObjectId(id));
    const users = await User.find({ _id: { $in: userIds } }).select("name email companyName").lean<any[]>();
    const byId = new Map(users.map((u) => [String(u._id), u]));

    let invoices = docs.map((d) => toAdminInvoiceDTO(d as any, byId.get(d.userId), now));
    if (q) {
      invoices = invoices.filter((i) => [i.number, i.owner.name, i.owner.email, i.owner.companyName].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)));
    }

    return NextResponse.json({
      success: true,
      invoices,
      counts: {
        issued: issued[0]?.count ?? 0,
        issuedCents: issued[0]?.total ?? 0,
        overdue: overdue[0]?.count ?? 0,
        overdueCents: overdue[0]?.total ?? 0,
        paid,
        void: voided,
      },
    });
  } catch (error) {
    console.error("Error listing Express invoices:", error);
    return NextResponse.json({ error: "Failed to load invoices" }, { status: 500 });
  }
}

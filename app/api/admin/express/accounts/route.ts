import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import ExpressAccount from "@/models/ExpressAccount";
import { requireExpressStaff } from "@/lib/express/access";
import { toAdminAccountDTO } from "@/lib/express/accountDto";

const STATUSES = ["pending", "active", "rejected", "suspended"] as const;
const TYPES = ["b2c", "b2b"] as const;

export async function GET(req: Request) {
  try {
    const access = await requireExpressStaff();
    if (access.error) return access.error;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const q = (searchParams.get("q") || "").trim().toLowerCase();

    // Customer logins created by partners are not applications; staff reach them through their partner.
    const filter: Record<string, unknown> = { type: { $ne: "customer" } };
    if (status && (STATUSES as readonly string[]).includes(status)) filter.status = status;
    if (type && (TYPES as readonly string[]).includes(type)) filter.type = type;

    await connectDB();
    const [docs, grouped] = await Promise.all([
      ExpressAccount.find(filter).sort({ createdAt: -1 }).limit(500).lean(),
      ExpressAccount.aggregate([{ $match: { type: { $ne: "customer" } } }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    ]);

    const userIds = docs.map((d) => d.userId).filter((id) => isValidObjectId(id));
    const users = await User.find({ _id: { $in: userIds } })
      .select("name email companyName")
      .lean<any[]>();
    const userById = new Map(users.map((u) => [String(u._id), u]));

    let accounts = docs.map((d) => toAdminAccountDTO(d, userById.get(d.userId)));
    if (q) {
      accounts = accounts.filter((a) =>
        [a.contactName, a.company?.name, a.user.name, a.user.email, a.user.companyName, a.country]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      );
    }

    const counts: Record<string, number> = { pending: 0, active: 0, rejected: 0, suspended: 0 };
    for (const g of grouped) counts[g._id] = g.count;

    return NextResponse.json({ success: true, accounts, counts });
  } catch (error) {
    console.error("Error listing Express accounts:", error);
    return NextResponse.json({ error: "Failed to load Express accounts" }, { status: 500 });
  }
}

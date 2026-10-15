import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import ExpressShipment from "@/models/ExpressShipment";
import { requireExpressStaff } from "@/lib/express/access";
import { toAdminShipmentDTO } from "@/lib/express/shipmentDto";

const STATUSES = ["awaiting_payment", "paid", "label_ready", "cancelled"] as const;

export async function GET(req: Request) {
  try {
    const access = await requireExpressStaff();
    if (access.error) return access.error;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const q = (searchParams.get("q") || "").trim().toLowerCase();

    const filter: Record<string, unknown> = {};
    if (status && (STATUSES as readonly string[]).includes(status)) filter.status = status;

    await connectDB();
    const [docs, grouped] = await Promise.all([
      ExpressShipment.find(filter).sort({ createdAt: -1 }).limit(500).lean(),
      ExpressShipment.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    ]);

    const userIds = Array.from(new Set(docs.map((d) => d.userId))).filter((id) => isValidObjectId(id));
    const users = await User.find({ _id: { $in: userIds } }).select("name email companyName").lean<any[]>();
    const userById = new Map(users.map((u) => [String(u._id), u]));

    let shipments = docs.map((d) => toAdminShipmentDTO(d as any, userById.get(d.userId)));
    if (q) {
      shipments = shipments.filter((s) =>
        [s.reference, s.recipient.name, s.recipient.city, s.recipient.countryCode, s.user.name, s.user.email, s.trackingNumber]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      );
    }

    const counts: Record<string, number> = { awaiting_payment: 0, paid: 0, label_ready: 0, cancelled: 0 };
    for (const g of grouped) counts[g._id] = g.count;

    return NextResponse.json({ success: true, shipments, counts });
  } catch (error) {
    console.error("Error listing Express shipments:", error);
    return NextResponse.json({ error: "Failed to load Express shipments" }, { status: 500 });
  }
}

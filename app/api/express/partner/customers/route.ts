import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import ExpressPartnerCustomer from "@/models/ExpressPartnerCustomer";
import ExpressShipment from "@/models/ExpressShipment";
import { validationError } from "@/lib/express/access";
import { partnerCustomerCreateSchema } from "@/lib/express/partner";
import { requireActivePartner } from "@/lib/express/partnerAccess";
import { createOrResetCustomerLogin } from "@/lib/express/partnerLogin";
import { EMPTY_STATS, toPartnerCustomerDTO, type CustomerStats } from "@/lib/express/partnerDto";

/** Bookings that count towards a partner's earnings: paid, and not cancelled. */
const COUNTED = ["paid", "label_ready"];

/** Counts both what the partner booked for a customer and what the customer booked and paid for themselves. */
async function statsBy(customerIds: string[], since?: Date): Promise<Map<string, CustomerStats>> {
  const rows = await ExpressShipment.aggregate([
    { $match: { partnerCustomerId: { $in: customerIds }, status: { $in: COUNTED }, ...(since ? { createdAt: { $gte: since } } : {}) } },
    { $group: { _id: "$partnerCustomerId", shipments: { $sum: 1 }, partnerCents: { $sum: "$totalCents" }, customerCents: { $sum: "$customerTotalCents" }, markupCents: { $sum: "$markupCents" } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), { shipments: r.shipments, partnerCents: r.partnerCents, customerCents: r.customerCents, markupCents: r.markupCents }]));
}

const sum = (m: Map<string, CustomerStats>): CustomerStats => {
  const total = { ...EMPTY_STATS };
  for (const s of m.values()) {
    total.shipments += s.shipments;
    total.partnerCents += s.partnerCents;
    total.customerCents += s.customerCents;
    total.markupCents += s.markupCents;
  }
  return total;
};

/** The partner's customers with what each has earned, plus this month's and all-time totals. */
export async function GET() {
  try {
    const access = await requireActivePartner();
    if (access.error) return access.error;
    const { actor, account } = access;

    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const docs = await ExpressPartnerCustomer.find({ partnerAccountId: String(account._id) }).sort({ archived: 1, createdAt: -1 }).limit(500).lean();
    const ids = docs.map((d) => String(d._id));
    const [allTime, thisMonth] = await Promise.all([statsBy(ids), statsBy(ids, monthStart)]);

    return NextResponse.json({
      success: true,
      defaultMarkupPct: account.partner?.defaultMarkupPct ?? 0,
      customers: docs.map((d) => toPartnerCustomerDTO(d as any, account, allTime.get(String(d._id)))),
      summary: { allTime: sum(allTime), thisMonth: sum(thisMonth), customers: docs.filter((d) => !d.archived).length },
    });
  } catch (error) {
    console.error("Express partner customers error:", error);
    return NextResponse.json({ error: "Failed to load customers" }, { status: 500 });
  }
}

/** Adds a customer, and optionally creates their login in the same step. The password is returned once. */
export async function POST(req: Request) {
  try {
    const access = await requireActivePartner();
    if (access.error) return access.error;
    const { actor, account } = access;

    const parsed = partnerCustomerCreateSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return validationError(parsed.error);
    const { createLogin, ...fields } = parsed.data;

    await connectDB();
    // The unique index is the backstop for two simultaneous requests; this check gives the normal, friendly answer.
    if (await ExpressPartnerCustomer.exists({ partnerAccountId: String(account._id), email: fields.email })) {
      return NextResponse.json({ error: "You already have a customer with this email.", code: "duplicate" }, { status: 409 });
    }
    let customer;
    try {
      customer = await ExpressPartnerCustomer.create({ ...fields, partnerAccountId: String(account._id), partnerUserId: actor.userId });
    } catch (error: any) {
      if (error?.code === 11000) return NextResponse.json({ error: "You already have a customer with this email.", code: "duplicate" }, { status: 409 });
      throw error;
    }

    if (!createLogin) {
      return NextResponse.json({ success: true, customer: toPartnerCustomerDTO(customer.toObject() as any, account) }, { status: 201 });
    }

    const login = await createOrResetCustomerLogin(account, customer.toObject() as any);
    const fresh = await ExpressPartnerCustomer.findById(customer._id).lean();
    // The customer exists even when the login could not be made; the partner is told why.
    return NextResponse.json(
      {
        success: true,
        customer: toPartnerCustomerDTO(fresh as any, account),
        credentials: login.ok ? { email: login.email, password: login.password } : null,
        loginError: login.ok ? null : { code: login.code, message: login.error },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Express partner customer create error:", error);
    return NextResponse.json({ error: "Failed to add the customer" }, { status: 500 });
  }
}

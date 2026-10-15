import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import connectDB from "@/lib/mongoose";
import ExpressPartnerCustomer from "@/models/ExpressPartnerCustomer";
import { requireActivePartner } from "@/lib/express/partnerAccess";
import { createOrResetCustomerLogin } from "@/lib/express/partnerLogin";
import { toPartnerCustomerDTO } from "@/lib/express/partnerDto";

type Ctx = { params: Promise<{ id: string }> };

/** Creates the customer's login, or gives the existing one a new password. The password is shown once. */
export async function POST(_req: Request, { params }: Ctx) {
  try {
    const access = await requireActivePartner();
    if (access.error) return access.error;
    const { account } = access;

    const { id } = await params;
    if (!isValidObjectId(id)) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    await connectDB();
    const customer = await ExpressPartnerCustomer.findOne({ _id: id, partnerAccountId: String(account._id) }).lean();
    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    if (customer.archived) return NextResponse.json({ error: "Restore this customer before creating a login.", code: "archived" }, { status: 409 });

    const login = await createOrResetCustomerLogin(account, customer as any);
    if (!login.ok) return NextResponse.json({ error: login.error, code: login.code }, { status: 409 });

    const fresh = await ExpressPartnerCustomer.findById(id).lean();
    return NextResponse.json({
      success: true,
      created: login.created,
      customer: toPartnerCustomerDTO(fresh as any, account),
      credentials: { email: login.email, password: login.password },
    });
  } catch (error) {
    console.error("Express partner customer login error:", error);
    return NextResponse.json({ error: "Failed to create the login" }, { status: 500 });
  }
}

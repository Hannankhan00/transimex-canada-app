import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import connectDB from "@/lib/mongoose";
import ExpressAccount from "@/models/ExpressAccount";
import ExpressPartnerCustomer from "@/models/ExpressPartnerCustomer";
import { validationError } from "@/lib/express/access";
import { partnerCustomerUpdateSchema } from "@/lib/express/partner";
import { requireActivePartner } from "@/lib/express/partnerAccess";
import { toPartnerCustomerDTO } from "@/lib/express/partnerDto";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Edits a customer: details, their own markup (null = partner default), or archive.
 * A new markup only affects NEW quotes; saved quotes and existing bookings keep their price.
 */
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const access = await requireActivePartner();
    if (access.error) return access.error;
    const { account } = access;

    const { id } = await params;
    if (!isValidObjectId(id)) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    const parsed = partnerCustomerUpdateSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return validationError(parsed.error);

    await connectDB();
    // Scoped to this partner: someone else's customer is a 404.
    const updated = await ExpressPartnerCustomer.findOneAndUpdate({ _id: id, partnerAccountId: String(account._id) }, { $set: parsed.data }, { returnDocument: "after", runValidators: true }).lean();
    if (!updated) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    // Archiving also switches the customer's login off; restoring switches it back on.
    if (parsed.data.archived !== undefined && updated.loginAccountId && isValidObjectId(updated.loginAccountId)) {
      await ExpressAccount.updateOne({ _id: updated.loginAccountId, type: "customer" }, { $set: { status: parsed.data.archived ? "suspended" : "active" } });
    }

    return NextResponse.json({ success: true, customer: toPartnerCustomerDTO(updated as any, account) });
  } catch (error) {
    console.error("Express partner customer update error:", error);
    return NextResponse.json({ error: "Failed to update the customer" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import ExpressAccount from "@/models/ExpressAccount";
import { requireExpressClient, validationError } from "@/lib/express/access";
import { applySchema } from "@/lib/express/validation";
import { getCurrentTerms } from "@/lib/express/termsStore";
import { toClientAccountDTO } from "@/lib/express/accountDto";
import { sendExpressApplicationAdminAlert } from "@/lib/expressEmail";

/**
 * Apply for an Express account. B2C becomes active at once; B2B waits for staff.
 * The server alone decides status, discount and billing: anything the browser
 * sends for those is stripped by the schema.
 */
export async function POST(req: Request) {
  try {
    const access = await requireExpressClient();
    if (access.error) return access.error;

    const body = await req.json().catch(() => null);
    const parsed = applySchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);
    const input = parsed.data;

    await connectDB();

    // The client must have accepted the terms that are in force right now.
    const currentTerms = await getCurrentTerms();
    if (input.termsVersion !== currentTerms.version) {
      return NextResponse.json(
        { error: "The terms of service were updated. Please review them and try again.", code: "terms_changed" },
        { status: 409 }
      );
    }

    const existing = await ExpressAccount.exists({ userId: access.actor.userId });
    if (existing) {
      return NextResponse.json({ error: "You already have an Express application." }, { status: 409 });
    }

    let account;
    try {
      account = await ExpressAccount.create({
        userId: access.actor.userId,
        type: input.type,
        status: input.type === "b2c" ? "active" : "pending",
        language: input.language,
        contactName: input.contactName,
        phone: input.phone,
        country: input.country,
        company: input.type === "b2b" ? input.company : undefined,
        shippingProfile: input.type === "b2b" ? input.shippingProfile : undefined,
        terms: { version: currentTerms.version, acceptedAt: new Date() },
      });
    } catch (error: any) {
      // Two simultaneous submits: the unique userId index lets only one through.
      if (error?.code === 11000) {
        return NextResponse.json({ error: "You already have an Express application." }, { status: 409 });
      }
      throw error;
    }

    if (input.type === "b2b") {
      // Best effort: a mail failure must not lose the application.
      sendExpressApplicationAdminAlert({
        companyName: input.company.name,
        contactName: input.contactName,
        phone: input.phone,
        country: input.country,
        businessType: input.company.businessType,
        expectedMonthlyVolume: input.company.expectedMonthlyVolume,
        shipsFor: input.shippingProfile.shipsFor,
        categories: input.shippingProfile.categories,
        restrictedGoods: input.shippingProfile.restrictedGoods,
        paymentPreference: input.shippingProfile.paymentPreference,
        accountId: String(account._id),
      }).catch((err) => console.warn("[Express] Admin alert email failed:", err));
    }

    return NextResponse.json({ success: true, account: toClientAccountDTO(account.toObject()) }, { status: 201 });
  } catch (error) {
    console.error("Express apply error:", error);
    return NextResponse.json({ error: "Failed to submit application" }, { status: 500 });
  }
}

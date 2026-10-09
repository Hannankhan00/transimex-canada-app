import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Promotion from "@/models/Promotion";
import { logAudit } from "@/lib/audit";
import { computeStatus } from "@/lib/promotionTypes";
import { promotionInputSchema } from "@/lib/validations/promotion";
import { requirePromotionsAccess, toPromotionDTO, validationError } from "@/lib/promotionsAdmin";

export async function GET() {
  try {
    const access = await requirePromotionsAccess();
    if (access.error) return access.error;

    await connectDB();
    const docs = await Promotion.find().sort({ priority: 1, updatedAt: -1 }).lean();
    const promotions = docs.map((d) => {
      const dto = toPromotionDTO(d);
      return { ...dto, status: computeStatus(dto) };
    });

    const counts = {
      all: promotions.length,
      live: promotions.filter((p) => p.status === "live").length,
      scheduled: promotions.filter((p) => p.status === "scheduled").length,
      expired: promotions.filter((p) => p.status === "expired").length,
      inactive: promotions.filter((p) => p.status === "inactive").length,
    };

    return NextResponse.json({ success: true, promotions, counts });
  } catch (error: any) {
    console.error("Error fetching promotions:", error);
    return NextResponse.json({ error: "Failed to fetch promotions" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const access = await requirePromotionsAccess();
    if (access.error) return access.error;

    const body = await req.json().catch(() => null);
    const parsed = promotionInputSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    await connectDB();
    const created = await Promotion.create({
      ...parsed.data,
      startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : null,
      endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
      createdBy: access.actor.userId,
      updatedBy: access.actor.userId,
    });

    await logAudit({
      actor: access.actor,
      action: "PROMOTION_CREATED",
      resourceType: "Promotion",
      resourceId: String(created._id),
      details: `Created promotion "${created.name}"`,
    });

    const dto = toPromotionDTO(created.toObject());
    return NextResponse.json({ success: true, promotion: { ...dto, status: computeStatus(dto) } }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating promotion:", error);
    return NextResponse.json({ error: "Failed to create promotion" }, { status: 500 });
  }
}

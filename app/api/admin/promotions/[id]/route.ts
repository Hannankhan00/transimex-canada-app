import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import connectDB from "@/lib/mongoose";
import Promotion from "@/models/Promotion";
import { logAudit } from "@/lib/audit";
import { computeStatus } from "@/lib/promotionTypes";
import { promotionInputSchema } from "@/lib/validations/promotion";
import {
  mediaIdsOf,
  releaseMedia,
  requirePromotionsAccess,
  toPromotionDTO,
  validationError,
} from "@/lib/promotionsAdmin";

type Ctx = { params: Promise<{ id: string }> };

const withStatus = (doc: any) => {
  const dto = toPromotionDTO(doc);
  return { ...dto, status: computeStatus(dto) };
};

const notFound = () => NextResponse.json({ error: "Promotion not found" }, { status: 404 });

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const access = await requirePromotionsAccess();
    if (access.error) return access.error;

    const { id } = await params;
    if (!isValidObjectId(id)) return notFound();

    await connectDB();
    const doc = await Promotion.findById(id).lean();
    if (!doc) return notFound();
    return NextResponse.json({ success: true, promotion: withStatus(doc) });
  } catch (error) {
    console.error("Error fetching promotion:", error);
    return NextResponse.json({ error: "Failed to fetch promotion" }, { status: 500 });
  }
}

/** Full replace of the editable fields. */
export async function PUT(req: Request, { params }: Ctx) {
  try {
    const access = await requirePromotionsAccess();
    if (access.error) return access.error;

    const { id } = await params;
    if (!isValidObjectId(id)) return notFound();

    const parsed = promotionInputSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return validationError(parsed.error);

    await connectDB();
    const existing = await Promotion.findById(id);
    if (!existing) return notFound();

    const previousMedia = mediaIdsOf(toPromotionDTO(existing.toObject()));

    existing.set({
      ...parsed.data,
      startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : null,
      endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
      updatedBy: access.actor.userId,
    });
    await existing.save();

    const dto = toPromotionDTO(existing.toObject());
    const keep = new Set(mediaIdsOf(dto));
    await releaseMedia(previousMedia.filter((m) => !keep.has(m)));

    await logAudit({
      actor: access.actor,
      action: "PROMOTION_UPDATED",
      resourceType: "Promotion",
      resourceId: id,
      details: `Updated promotion "${existing.name}"`,
    });

    return NextResponse.json({ success: true, promotion: withStatus(existing.toObject()) });
  } catch (error) {
    console.error("Error updating promotion:", error);
    return NextResponse.json({ error: "Failed to update promotion" }, { status: 500 });
  }
}

const patchSchema = z.object({ isActive: z.boolean() });

/** Quick activate / deactivate. */
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const access = await requirePromotionsAccess();
    if (access.error) return access.error;

    const { id } = await params;
    if (!isValidObjectId(id)) return notFound();

    const parsed = patchSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return validationError(parsed.error);

    await connectDB();
    const doc = await Promotion.findByIdAndUpdate(
      id,
      { isActive: parsed.data.isActive, updatedBy: access.actor.userId },
      { returnDocument: "after" }
    ).lean();
    if (!doc) return notFound();

    await logAudit({
      actor: access.actor,
      action: "PROMOTION_UPDATED",
      resourceType: "Promotion",
      resourceId: id,
      details: `${parsed.data.isActive ? "Activated" : "Deactivated"} promotion "${(doc as any).name}"`,
    });

    return NextResponse.json({ success: true, promotion: withStatus(doc) });
  } catch (error) {
    console.error("Error toggling promotion:", error);
    return NextResponse.json({ error: "Failed to update promotion" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const access = await requirePromotionsAccess();
    if (access.error) return access.error;

    const { id } = await params;
    if (!isValidObjectId(id)) return notFound();

    await connectDB();
    const doc = await Promotion.findByIdAndDelete(id).lean();
    if (!doc) return notFound();

    await releaseMedia(mediaIdsOf(toPromotionDTO(doc)));

    await logAudit({
      actor: access.actor,
      action: "PROMOTION_DELETED",
      resourceType: "Promotion",
      resourceId: id,
      details: `Deleted promotion "${(doc as any).name}"`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting promotion:", error);
    return NextResponse.json({ error: "Failed to delete promotion" }, { status: 500 });
  }
}

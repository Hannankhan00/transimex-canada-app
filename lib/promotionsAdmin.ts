import { NextResponse } from "next/server";
import type { ZodError } from "zod";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import Promotion, { IPromotion } from "@/models/Promotion";
import { TokenPayload, verifyToken } from "@/lib/auth";
import { hasModulePermission } from "@/lib/rbac";
import { deleteFromR2, listR2Objects } from "@/lib/r2";
import type { PromotionDTO } from "@/lib/promotionTypes";

/** Same checks the other admin routes use (token, then live permission lookup), for the "promotions" module. */
export async function requirePromotionsAccess(): Promise<
  { error: NextResponse; actor?: undefined } | { error?: undefined; actor: TokenPayload }
> {
  const token = (await cookies()).get("token")?.value;
  if (!token) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const actor = verifyToken(token);
  if (!actor) return { error: NextResponse.json({ error: "Invalid session token" }, { status: 401 }) };

  await connectDB();
  const user = await User.findById(actor.userId).lean<any>();
  if (!user || !hasModulePermission(user, "promotions")) {
    return {
      error: NextResponse.json(
        { error: "Forbidden: You do not have permission to manage promotions." },
        { status: 403 }
      ),
    };
  }
  return { actor };
}

export function validationError(error: ZodError) {
  return NextResponse.json(
    {
      error: "Validation failed",
      fields: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    },
    { status: 422 }
  );
}

const iso = (d: unknown): string | null => {
  if (!d) return null;
  const date = new Date(d as string);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const img = (i: any) =>
  i?.url
    ? {
        url: i.url as string,
        width: i.width as number,
        height: i.height as number,
        bytes: i.bytes as number | undefined,
        originalBytes: i.originalBytes as number | undefined,
        mediaId: i.mediaId as string | undefined,
      }
    : null;

const txt = (t: any) => ({
  title: t?.title || "",
  description: t?.description || "",
  badge: t?.badge || "",
  ctaLabel: t?.ctaLabel || "",
  footer: t?.footer || "",
  imageAlt: t?.imageAlt || "",
});

/** Mongo document (lean or hydrated) -> the DTO shared with the UI and the public builder. */
export function toPromotionDTO(doc: any): PromotionDTO {
  return {
    id: String(doc._id),
    name: doc.name,
    isActive: !!doc.isActive,
    priority: doc.priority ?? 1,
    delaySeconds: doc.delaySeconds ?? 0,
    startsAt: iso(doc.startsAt),
    endsAt: iso(doc.endsAt),
    departureDate: doc.departureDate || null,
    destination: { city: doc.destination?.city || "", countryCode: doc.destination?.countryCode || "" },
    ports: (doc.ports || []).map((p: any) => ({ label: p.label, countryCode: p.countryCode || "" })),
    showFlags: doc.showFlags !== false,
    cta: { url: doc.cta?.url || "" },
    image: { en: img(doc.image?.en), fr: img(doc.image?.fr) },
    content: { en: txt(doc.content?.en), fr: txt(doc.content?.fr) },
    createdAt: iso(doc.createdAt) ?? undefined,
    updatedAt: iso(doc.updatedAt) ?? undefined,
  };
}

export function mediaIdsOf(p: Pick<PromotionDTO, "image">): string[] {
  return [p.image.en?.mediaId, p.image.fr?.mediaId].filter((x): x is string => !!x);
}

/** mediaId is the file name inside the promotions/ folder of the R2 bucket. */
export const PROMOTION_MEDIA_PREFIX = "promotions/";
export const PROMOTION_MEDIA_NAME = /^\d{10,}-[a-f0-9]{8}\.webp$/;

/** Removes uploaded images that a promotion no longer references (replaced, removed or promotion deleted). */
export async function releaseMedia(ids: string[]): Promise<void> {
  const names = ids.filter((id) => PROMOTION_MEDIA_NAME.test(id));
  await Promise.allSettled([
    ...names.map((name) => deleteFromR2(`${PROMOTION_MEDIA_PREFIX}${name}`)),
    (async () => {
      try {
        const PromotionMedia = (await import("@/models/PromotionMedia")).default;
        await PromotionMedia.deleteMany({ mediaId: { $in: names } });
      } catch {
        /* ignore */
      }
    })(),
  ]);
}

/** Best-effort: drops uploads older than 24h that no promotion references (abandoned editor sessions). */
export async function purgeOrphanedMedia(): Promise<void> {
  try {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const [objects, promos] = await Promise.all([
      listR2Objects(PROMOTION_MEDIA_PREFIX),
      Promotion.find().select("image").lean<IPromotion[]>(),
    ]);
    const used = new Set(promos.flatMap((p: any) => [p.image?.en?.mediaId, p.image?.fr?.mediaId].filter(Boolean)));
    const orphans = objects
      .filter((o) => o.lastModified && o.lastModified.getTime() < cutoff)
      .map((o) => o.key.slice(PROMOTION_MEDIA_PREFIX.length))
      .filter((name) => PROMOTION_MEDIA_NAME.test(name) && !used.has(name));
    await releaseMedia(orphans);
  } catch (err) {
    console.error("Failed to purge orphaned promotion media:", err);
  }
}

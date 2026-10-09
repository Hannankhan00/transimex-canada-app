import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Promotion from "@/models/Promotion";
import { errorResponse, parseIntParam, parseLang } from "@/lib/blogPublicApi";
import { guardPromotionsRequest, publicOrigin } from "@/lib/promotionsPublicApi";
import { toPromotionDTO } from "@/lib/promotionsAdmin";
import { buildBilingualPromotion, buildPublicPromotion } from "@/lib/promotionTypes";

// GET /api/public/promotions?lang=en|fr&limit=1
// Returns the promotions that are active right now (isActive, inside the start/end window),
// ordered by priority (lowest number first). The website normally shows the first one.
export async function GET(req: Request) {
  const denied = guardPromotionsRequest(req);
  if (denied) return denied;

  try {
    const sp = new URL(req.url).searchParams;
    const lang = parseLang(sp.get("lang"));
    if (sp.get("lang") && !lang) {
      return errorResponse(400, "INVALID_PARAM", 'Query parameter "lang" must be "en" or "fr".');
    }
    const limit = parseIntParam(sp.get("limit"), 10, 1, 50);

    const now = new Date();
    await connectDB();
    const docs = await Promotion.find({
      isActive: true,
      $and: [
        { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
      ],
    })
      .sort({ priority: 1, updatedAt: -1 })
      .limit(limit)
      .lean();

    const origin = publicOrigin(req);
    const promotions = docs.map((d) => {
      const dto = toPromotionDTO(d);
      return lang ? buildPublicPromotion(dto, lang, origin) : buildBilingualPromotion(dto, origin);
    });

    const res = NextResponse.json({ success: true, promotions });
    // Short cache so activating/deactivating in the CRM reaches the site within a minute.
    res.headers.set("Cache-Control", "private, max-age=30");
    return res;
  } catch (error) {
    console.error("Public promotions error:", error);
    return errorResponse(500, "INTERNAL_ERROR", "Failed to load promotions.");
  }
}

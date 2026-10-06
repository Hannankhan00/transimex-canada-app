import connectDB from "@/lib/mongoose";
import BlogPost from "@/models/BlogPost";
import {
  approvedCountsByPost,
  errorResponse,
  guardRequest,
  ok,
  parseLang,
  publishedFilter,
  serializePost,
} from "@/lib/blogPublicApi";

// GET /api/public/blog/posts/:slug?lang=en
// Returns the full article plus previous/next/related navigation. Does NOT count a view (see POST .../views).
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const denied = guardRequest(req);
  if (denied) return denied;

  try {
    const { slug } = await params;
    const rawLang = new URL(req.url).searchParams.get("lang");
    const lang = parseLang(rawLang);
    if (rawLang && !lang) {
      return errorResponse(400, "INVALID_PARAM", 'Query parameter "lang" must be "en" or "fr".');
    }

    await connectDB();
    const post: any = await BlogPost.findOne({ $and: [{ slug } as Record<string, any>, publishedFilter()] }).lean();
    if (!post) return errorResponse(404, "NOT_FOUND", "Article not found.");

    const when = post.publishedAt ?? post.createdAt;
    const nav = "slug title featuredImage category publishedAt createdAt";
    const [prev, next, related] = await Promise.all([
      BlogPost.findOne({ $and: [publishedFilter(), { publishedAt: { $lt: when } }] }).sort({ publishedAt: -1 }).select(nav).lean(),
      BlogPost.findOne({ $and: [publishedFilter(), { publishedAt: { $gt: when } }] }).sort({ publishedAt: 1 }).select(nav).lean(),
      BlogPost.find({
        $and: [publishedFilter(), { _id: { $ne: post._id } }, { $or: [{ category: post.category }, { tags: { $in: post.tags || [] } }] }],
      })
        .sort({ publishedAt: -1 })
        .limit(3)
        .select("-content")
        .lean(),
    ]);

    const counts = await approvedCountsByPost([post._id, ...related.map((r: any) => r._id)]);
    const withCount = (p: any) => ({ ...p, approvedCommentsCount: counts.get(String(p._id)) ?? 0 });
    const brief = (p: any) =>
      p && {
        slug: p.slug,
        title: lang ? p.title?.[lang] || p.title?.en : p.title,
        featuredImage: p.featuredImage || "",
        category: p.category,
      };

    return ok({
      post: serializePost(withCount(post), lang, { includeContent: true }),
      previous: brief(prev) ?? null,
      next: brief(next) ?? null,
      related: related.map((r: any) => serializePost(withCount(r), lang, { includeContent: false })),
    });
  } catch (error) {
    console.error("Public blog detail error:", error);
    return errorResponse(500, "INTERNAL_ERROR", "Failed to load the article.");
  }
}

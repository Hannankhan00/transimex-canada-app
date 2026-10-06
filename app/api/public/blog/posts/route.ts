import connectDB from "@/lib/mongoose";
import BlogPost from "@/models/BlogPost";
import {
  approvedCountsByPost,
  errorResponse,
  escapeRegex,
  guardRequest,
  ok,
  parseIntParam,
  parseLang,
  publishedFilter,
  serializePost,
} from "@/lib/blogPublicApi";

// GET /api/public/blog/posts?page=1&limit=10&lang=en&category=&tag=&q=&sort=newest
export async function GET(req: Request) {
  const denied = guardRequest(req);
  if (denied) return denied;

  try {
    const sp = new URL(req.url).searchParams;
    const lang = parseLang(sp.get("lang"));
    if (sp.get("lang") && !lang) {
      return errorResponse(400, "INVALID_PARAM", 'Query parameter "lang" must be "en" or "fr".');
    }

    const page = parseIntParam(sp.get("page"), 1, 1, 100000);
    const limit = parseIntParam(sp.get("limit"), 10, 1, 50);
    const category = sp.get("category")?.trim();
    const tag = sp.get("tag")?.trim();
    const q = sp.get("q")?.trim().slice(0, 100);
    const sort = sp.get("sort") === "oldest" ? 1 : sp.get("sort") === "popular" ? "popular" : -1;

    const and: any[] = [publishedFilter()];
    if (category) and.push({ category: new RegExp(`^${escapeRegex(category)}$`, "i") });
    if (tag) and.push({ tags: new RegExp(`^${escapeRegex(tag)}$`, "i") });
    if (q) {
      const rx = new RegExp(escapeRegex(q), "i");
      and.push({ $or: [{ "title.en": rx }, { "title.fr": rx }, { "excerpt.en": rx }, { "excerpt.fr": rx }, { tags: rx }] });
    }
    const filter = { $and: and };

    const sortSpec: Record<string, 1 | -1> =
      sort === "popular" ? { views: -1, publishedAt: -1 } : { publishedAt: sort, createdAt: sort };

    await connectDB();
    const [total, docs] = await Promise.all([
      BlogPost.countDocuments(filter),
      BlogPost.find(filter)
        .select("-content") // list view never ships the full article body
        .sort(sortSpec)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    const counts = await approvedCountsByPost(docs.map((d: any) => d._id));
    const posts = docs.map((d: any) =>
      serializePost({ ...d, approvedCommentsCount: counts.get(String(d._id)) ?? 0 }, lang, { includeContent: false })
    );

    return ok(
      {
        posts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1,
        },
      },
      "short"
    );
  } catch (error) {
    console.error("Public blog list error:", error);
    return errorResponse(500, "INTERNAL_ERROR", "Failed to load articles.");
  }
}

import connectDB from "@/lib/mongoose";
import BlogPost from "@/models/BlogPost";
import { errorResponse, guardRequest, ok, publishedFilter } from "@/lib/blogPublicApi";

// GET /api/public/blog/categories — categories and tags in use by published articles, with counts.
export async function GET(req: Request) {
  const denied = guardRequest(req);
  if (denied) return denied;

  try {
    await connectDB();
    const match = { $match: publishedFilter() };
    const [categories, tags] = await Promise.all([
      BlogPost.aggregate([match, { $group: { _id: "$category", count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }]),
      BlogPost.aggregate([
        match,
        { $unwind: "$tags" },
        { $group: { _id: "$tags", count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
      ]),
    ]);

    return ok(
      {
        categories: categories.map((c: any) => ({ name: c._id, count: c.count })),
        tags: tags.map((t: any) => ({ name: t._id, count: t.count })),
      },
      "short"
    );
  } catch (error) {
    console.error("Public blog categories error:", error);
    return errorResponse(500, "INTERNAL_ERROR", "Failed to load categories.");
  }
}

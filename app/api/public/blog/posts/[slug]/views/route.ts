import connectDB from "@/lib/mongoose";
import BlogPost from "@/models/BlogPost";
import { errorResponse, guardRequest, guardWrite, ok, publishedFilter } from "@/lib/blogPublicApi";

// POST /api/public/blog/posts/:slug/views — call once per article page view from the website backend.
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const denied = guardRequest(req) ?? guardWrite(req, "view");
  if (denied) return denied;

  try {
    const { slug } = await params;
    await connectDB();
    const post: any = await BlogPost.findOneAndUpdate(
      { $and: [{ slug } as Record<string, any>, publishedFilter()] },
      { $inc: { views: 1 } },
      { new: true, projection: { views: 1 }, timestamps: false }
    ).lean();
    if (!post) return errorResponse(404, "NOT_FOUND", "Article not found.");
    return ok({ views: post.views });
  } catch (error) {
    console.error("Public blog view error:", error);
    return errorResponse(500, "INTERNAL_ERROR", "Failed to record the view.");
  }
}

import connectDB from "@/lib/mongoose";
import BlogPost from "@/models/BlogPost";
import BlogComment from "@/models/BlogComment";
import {
  errorResponse,
  guardRequest,
  guardWrite,
  ok,
  parseIntParam,
  publishedFilter,
  serializeComment,
} from "@/lib/blogPublicApi";

const MAX_NAME = 80;
const MAX_EMAIL = 120;
const MAX_CONTENT = 2000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// New comments go live immediately (admins can hide or delete them afterwards).
// Set BLOG_COMMENTS_AUTO_APPROVE=false to hold them for moderation instead.
const autoApprove = () => process.env.BLOG_COMMENTS_AUTO_APPROVE !== "false";

async function findPost(slug: string) {
  return BlogPost.findOne({ $and: [{ slug } as Record<string, any>, publishedFilter()] }).select(
    "slug title allowComments"
  );
}

// GET /api/public/blog/posts/:slug/comments?page=1&limit=20&order=oldest|newest
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const denied = guardRequest(req);
  if (denied) return denied;

  try {
    const { slug } = await params;
    const sp = new URL(req.url).searchParams;
    const page = parseIntParam(sp.get("page"), 1, 1, 100000);
    const limit = parseIntParam(sp.get("limit"), 20, 1, 100);
    const order = sp.get("order") === "newest" ? -1 : 1;

    await connectDB();
    const post: any = await findPost(slug);
    if (!post) return errorResponse(404, "NOT_FOUND", "Article not found.");

    const filter = { postId: post._id, status: "Approved" as const };
    const [total, docs] = await Promise.all([
      BlogComment.countDocuments(filter),
      BlogComment.find(filter)
        .sort({ createdAt: order })
        .skip((page - 1) * limit)
        .limit(limit)
        .select("postSlug authorName content adminReply createdAt") // never expose emails
        .lean(),
    ]);

    return ok({
      allowComments: post.allowComments !== false,
      comments: docs.map(serializeComment),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Public blog comments list error:", error);
    return errorResponse(500, "INTERNAL_ERROR", "Failed to load comments.");
  }
}

// POST /api/public/blog/posts/:slug/comments  { authorName, authorEmail?, content, website? }
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const denied = guardRequest(req) ?? guardWrite(req, "comment");
  if (denied) return denied;

  try {
    const { slug } = await params;
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON.");
    }

    // Honeypot: real visitors never fill the hidden "website" field. Pretend success so bots learn nothing.
    if (typeof body.website === "string" && body.website.trim() !== "") {
      return ok({ status: "Pending", message: "Thank you! Your comment is awaiting moderation.", comment: null });
    }

    const authorName = typeof body.authorName === "string" ? body.authorName.trim() : "";
    const authorEmail = typeof body.authorEmail === "string" ? body.authorEmail.trim() : "";
    const content = typeof body.content === "string" ? body.content.trim() : "";

    const fields: Record<string, string> = {};
    if (!authorName) fields.authorName = "Name is required.";
    else if (authorName.length > MAX_NAME) fields.authorName = `Name must be at most ${MAX_NAME} characters.`;
    if (authorEmail && (authorEmail.length > MAX_EMAIL || !EMAIL_RE.test(authorEmail))) {
      fields.authorEmail = "Email address is not valid.";
    }
    if (!content) fields.content = "Comment cannot be empty.";
    else if (content.length > MAX_CONTENT) fields.content = `Comment must be at most ${MAX_CONTENT} characters.`;
    if (Object.keys(fields).length) {
      return errorResponse(422, "VALIDATION_FAILED", "Please correct the highlighted fields.", { fields });
    }

    await connectDB();
    const post: any = await findPost(slug);
    if (!post) return errorResponse(404, "NOT_FOUND", "Article not found.");
    if (post.allowComments === false) {
      return errorResponse(403, "COMMENTS_DISABLED", "Commenting is disabled for this article.");
    }

    const status = autoApprove() ? "Approved" : "Pending";
    const comment = await BlogComment.create({
      postId: post._id,
      postSlug: post.slug,
      postTitle: { en: post.title.en, fr: post.title.fr },
      authorName,
      authorEmail,
      content,
      status,
    });

    if (status === "Approved") {
      await BlogPost.updateOne({ _id: post._id }, { $inc: { commentsCount: 1 } }, { timestamps: false });
    }

    const res = ok({
      status,
      message:
        status === "Approved"
          ? "Comment published."
          : "Thank you! Your comment is awaiting moderation.",
      comment: serializeComment(comment),
    });
    return new Response(res.body, { status: 201, headers: res.headers });
  } catch (error) {
    console.error("Public blog comment submit error:", error);
    return errorResponse(500, "INTERNAL_ERROR", "Failed to submit the comment.");
  }
}

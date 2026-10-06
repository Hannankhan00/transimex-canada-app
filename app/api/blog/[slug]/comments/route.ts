import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import BlogPost from "@/models/BlogPost";
import BlogComment from "@/models/BlogComment";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    await connectDB();

    const post = await BlogPost.findOne({ slug }).select("allowComments title").lean();
    if (!post) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    const comments = await BlogComment.find({
      postSlug: slug,
      status: "Approved",
    })
      .sort({ createdAt: 1 })
      .lean();

    const formattedComments = comments.map((c: any) => ({
      id: c._id.toString(),
      postId: c.postId?.toString(),
      postSlug: c.postSlug,
      authorName: c.authorName,
      content: c.content,
      adminReply: c.adminReply?.content
        ? {
            content: c.adminReply.content,
            repliedBy: c.adminReply.repliedBy || "Transimex Logistics Editorial",
            repliedAt: c.adminReply.repliedAt
              ? new Date(c.adminReply.repliedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "",
          }
        : null,
      createdAt: new Date(c.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    }));

    return NextResponse.json({
      success: true,
      allowComments: post.allowComments !== false,
      totalCount: formattedComments.length,
      comments: formattedComments,
    });
  } catch (error: any) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await req.json();
    const { authorName, authorEmail, content } = body;

    if (!authorName?.trim()) {
      return NextResponse.json(
        { error: "Author name is required" },
        { status: 400 }
      );
    }

    if (!content?.trim()) {
      return NextResponse.json(
        { error: "Comment message cannot be empty" },
        { status: 400 }
      );
    }

    await connectDB();
    const post = await BlogPost.findOne({ slug });

    if (!post) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    // Check if commenting is turned off for this post
    if (post.allowComments === false) {
      return NextResponse.json(
        {
          error:
            "Commenting has been disabled for this article by the editorial team.",
        },
        { status: 403 }
      );
    }

    const comment = await BlogComment.create({
      postId: post._id,
      postSlug: post.slug,
      postTitle: {
        en: post.title.en,
        fr: post.title.fr,
      },
      authorName: authorName.trim(),
      authorEmail: authorEmail?.trim() || "",
      content: content.trim(),
      status: "Approved",
    });

    // Increment comments count on post
    post.commentsCount = (post.commentsCount || 0) + 1;
    await post.save();

    return NextResponse.json({
      success: true,
      message: "Comment submitted successfully",
      comment: {
        id: comment._id.toString(),
        postId: comment.postId.toString(),
        postSlug: comment.postSlug,
        authorName: comment.authorName,
        content: comment.content,
        adminReply: null,
        createdAt: "Just now",
      },
    });
  } catch (error: any) {
    console.error("Error submitting blog comment:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit comment" },
      { status: 500 }
    );
  }
}

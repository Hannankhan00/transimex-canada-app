import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import BlogComment from "@/models/BlogComment";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const postSlug = searchParams.get("slug");
    const status = searchParams.get("status"); // "Approved" | "Pending" | "Hidden" | "all"
    const search = searchParams.get("q")?.toLowerCase() || "";

    await connectDB();

    const query: any = {};
    if (postSlug) {
      query.postSlug = postSlug;
    }
    if (status && status !== "all") {
      query.status = status;
    }

    const comments = await BlogComment.find(query)
      .sort({ createdAt: -1 })
      .lean();

    let formatted = comments.map((c: any) => ({
      id: c._id.toString(),
      postId: c.postId?.toString(),
      postSlug: c.postSlug,
      postTitle: c.postTitle || { en: c.postSlug, fr: c.postSlug },
      authorName: c.authorName,
      authorEmail: c.authorEmail || "",
      content: c.content,
      status: c.status,
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

    if (search) {
      formatted = formatted.filter(
        (c) =>
          c.authorName.toLowerCase().includes(search) ||
          c.authorEmail.toLowerCase().includes(search) ||
          c.content.toLowerCase().includes(search) ||
          c.postSlug.toLowerCase().includes(search) ||
          (c.postTitle?.en && c.postTitle.en.toLowerCase().includes(search))
      );
    }

    const counts = {
      all: comments.length,
      answered: comments.filter((c: any) => Boolean(c.adminReply?.content)).length,
      unanswered: comments.filter((c: any) => !c.adminReply?.content).length,
    };

    return NextResponse.json({
      success: true,
      comments: formatted,
      counts,
    });
  } catch (error: any) {
    console.error("Error fetching admin blog comments:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch blog comments" },
      { status: 500 }
    );
  }
}

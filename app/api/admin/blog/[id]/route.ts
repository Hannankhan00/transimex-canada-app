import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import BlogPost from "@/models/BlogPost";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    await connectDB();
    const dbPost = await BlogPost.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { slug: id }],
    });

    if (!dbPost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (body.title) dbPost.title = body.title;
    if (body.excerpt) dbPost.excerpt = body.excerpt;
    if (body.content) dbPost.content = body.content;
    if (body.author) dbPost.author = body.author;
    if (body.category) dbPost.category = body.category;
    if (body.featuredImage) dbPost.featuredImage = body.featuredImage;
    if (body.status) {
      dbPost.status = body.status;
      if (body.status === "Published" && !dbPost.publishedAt) {
        dbPost.publishedAt = new Date();
      }
    }
    if (body.tags) dbPost.tags = body.tags;
    await dbPost.save();

    return NextResponse.json({
      success: true,
      message: `Post updated successfully`,
      post: dbPost.toObject(),
    });
  } catch (error: any) {
    console.error("Error updating blog post:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update blog post" },
      { status: 500 }
    );
  }
}

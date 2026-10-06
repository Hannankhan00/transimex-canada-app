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
    if (body.metaTitle) dbPost.metaTitle = body.metaTitle;
    if (body.metaDescription) dbPost.metaDescription = body.metaDescription;
    if (body.author) dbPost.author = body.author;
    if (body.category) dbPost.category = body.category;
    if (body.featuredImage !== undefined) dbPost.featuredImage = body.featuredImage;
    if (body.slug) dbPost.slug = body.slug;
    if (body.tags) dbPost.tags = body.tags;

    if (body.status) {
      dbPost.status = body.status;
      if (body.status === "Published" && !dbPost.publishedAt) {
        dbPost.publishedAt = body.publishedDate ? new Date(body.publishedDate) : new Date();
      }
    }

    if (body.publishedDate) {
      dbPost.publishedAt = new Date(body.publishedDate);
    }

    await dbPost.save();

    return NextResponse.json({
      success: true,
      message: "Post updated successfully",
      post: {
        id: dbPost._id.toString(),
        slug: dbPost.slug,
        title: dbPost.title,
        excerpt: dbPost.excerpt,
        content: dbPost.content,
        metaTitle: dbPost.metaTitle,
        metaDescription: dbPost.metaDescription,
        author: dbPost.author,
        category: dbPost.category,
        status: dbPost.status,
        publishedDate: dbPost.publishedAt
          ? new Date(dbPost.publishedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "2-digit",
              year: "numeric",
            })
          : "Draft",
        views: dbPost.views || 0,
        featuredImage: dbPost.featuredImage || "",
        tags: dbPost.tags || [],
      },
    });
  } catch (error: any) {
    console.error("Error updating blog post:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update blog post" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();

    const deleted = await BlogPost.findOneAndDelete({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { slug: id }],
    });

    if (!deleted) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting blog post:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete post" },
      { status: 500 }
    );
  }
}

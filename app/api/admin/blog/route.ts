import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import BlogPost from "@/models/BlogPost";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // "Draft" | "Published" | "all"
    const search = searchParams.get("q")?.toLowerCase() || "";

    await connectDB();
    const dbPosts = await BlogPost.find().sort({ createdAt: -1 }).lean();

    let posts = dbPosts.map((dp: any) => ({
      id: dp._id.toString(),
      slug: dp.slug,
      title: dp.title,
      excerpt: dp.excerpt,
      content: dp.content,
      author: dp.author,
      category: dp.category,
      status: dp.status,
      publishedDate: dp.publishedAt
        ? new Date(dp.publishedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "2-digit",
            year: "numeric",
          })
        : "Draft",
      views: dp.views || 0,
      featuredImage: dp.featuredImage || "",
      tags: dp.tags || [],
    }));

    const allPosts = posts;

    if (status && status !== "all") {
      posts = posts.filter(
        (p) => p.status.toLowerCase() === status.toLowerCase()
      );
    }

    if (search) {
      posts = posts.filter(
        (p) =>
          p.title.en.toLowerCase().includes(search) ||
          p.title.fr.toLowerCase().includes(search) ||
          p.category.toLowerCase().includes(search) ||
          p.author.toLowerCase().includes(search)
      );
    }

    const counts = {
      all: allPosts.length,
      published: allPosts.filter((p) => p.status === "Published").length,
      draft: allPosts.filter((p) => p.status === "Draft").length,
    };

    return NextResponse.json({
      success: true,
      posts,
      counts,
    });
  } catch (error: any) {
    console.error("Error fetching blog posts:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch blog posts" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, excerpt, content, slug, author, category, featuredImage, status, tags } = body;

    if (!title?.en || !title?.fr) {
      return NextResponse.json(
        { error: "Both English and French titles are required" },
        { status: 400 }
      );
    }

    const generatedSlug =
      slug ||
      title.en
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");

    await connectDB();

    const existingSlug = await BlogPost.findOne({ slug: generatedSlug });
    if (existingSlug) {
      return NextResponse.json(
        { error: `A blog post with slug "${generatedSlug}" already exists` },
        { status: 409 }
      );
    }

    const newPost = await BlogPost.create({
      slug: generatedSlug,
      title: { en: title.en, fr: title.fr },
      excerpt: { en: excerpt?.en || "", fr: excerpt?.fr || "" },
      content: { en: content?.en || "", fr: content?.fr || "" },
      author: author || "Transimex Logistics Editorial",
      category: category || "Logistics Operations",
      status: status || "Draft",
      publishedAt: status === "Published" ? new Date() : undefined,
      views: 0,
      featuredImage: featuredImage || "",
      tags: tags || [],
    });

    return NextResponse.json({
      success: true,
      message: `Article "${title.en}" created successfully`,
      post: newPost,
    });
  } catch (error: any) {
    console.error("Error creating blog post:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create blog post" },
      { status: 500 }
    );
  }
}

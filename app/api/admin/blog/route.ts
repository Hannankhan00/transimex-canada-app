import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import BlogPost from "@/models/BlogPost";
import { getStoredBlogPosts, addBlogPostToStore, BlogPostItem } from "@/lib/mockData";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // "Draft" | "Published" | "all"
    const search = searchParams.get("q")?.toLowerCase() || "";

    let posts: BlogPostItem[] = getStoredBlogPosts();

    try {
      await connectDB();
      const dbPosts = await BlogPost.find().lean();
      if (dbPosts && dbPosts.length > 0) {
        for (const dp of dbPosts) {
          if (!posts.find((p) => p.slug === dp.slug)) {
            posts.unshift({
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
            });
          }
        }
      }
    } catch (dbErr) {
      console.warn("[Admin Blog API] DB read fallback:", dbErr);
    }

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

    const allPosts = getStoredBlogPosts();
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

    const newPost: BlogPostItem = {
      id: `POST-${Date.now()}`,
      slug: generatedSlug,
      title: {
        en: title.en,
        fr: title.fr,
      },
      excerpt: {
        en: excerpt?.en || "",
        fr: excerpt?.fr || "",
      },
      content: {
        en: content?.en || "",
        fr: content?.fr || "",
      },
      author: author || "Transimex Logistics Editorial",
      category: category || "Logistics Operations",
      status: status || "Draft",
      publishedDate: status === "Published" ? "Today" : "Draft",
      views: 0,
      featuredImage: featuredImage || "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1200",
      tags: tags || ["Logistics", "Freight"],
    };

    // Save in DB if available
    try {
      await connectDB();
      await BlogPost.create({
        ...newPost,
        publishedAt: status === "Published" ? new Date() : undefined,
      });
    } catch (dbErr) {
      console.warn("[Admin Blog API] DB write fallback:", dbErr);
    }

    addBlogPostToStore(newPost);

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

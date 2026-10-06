import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import BlogComment from "@/models/BlogComment";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { reply, repliedBy } = body;

    if (!reply || typeof reply !== "string" || !reply.trim()) {
      return NextResponse.json(
        { error: "Reply content cannot be empty" },
        { status: 400 }
      );
    }

    await connectDB();
    const comment = await BlogComment.findById(id);
    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    comment.adminReply = {
      content: reply.trim(),
      repliedBy: repliedBy?.trim() || "Transimex Logistics Editorial",
      repliedAt: new Date(),
    };

    // Ensure comment is approved when admin replies
    comment.status = "Approved";
    await comment.save();

    return NextResponse.json({
      success: true,
      message: "Admin response saved successfully",
      comment: {
        id: comment._id.toString(),
        adminReply: {
          content: comment.adminReply.content,
          repliedBy: comment.adminReply.repliedBy,
          repliedAt: new Date(comment.adminReply.repliedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
        },
      },
    });
  } catch (error: any) {
    console.error("Error submitting admin reply:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit response" },
      { status: 500 }
    );
  }
}

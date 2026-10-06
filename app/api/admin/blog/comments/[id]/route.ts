import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import BlogComment from "@/models/BlogComment";
import BlogPost from "@/models/BlogPost";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    await connectDB();
    const comment = await BlogComment.findById(id);
    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (body.status && ["Approved", "Pending", "Hidden"].includes(body.status)) {
      comment.status = body.status;
    }

    await comment.save();

    return NextResponse.json({
      success: true,
      message: "Comment updated successfully",
      comment: {
        id: comment._id.toString(),
        status: comment.status,
      },
    });
  } catch (error: any) {
    console.error("Error updating comment:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update comment" },
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

    const deleted = await BlogComment.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Decrement comments count on post
    if (deleted.postId) {
      await BlogPost.findByIdAndUpdate(deleted.postId, {
        $inc: { commentsCount: -1 },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting comment:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete comment" },
      { status: 500 }
    );
  }
}

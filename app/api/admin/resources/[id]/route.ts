import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Resource from "@/models/Resource";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();
    const deleted = await Resource.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting resource:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete resource" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import { updateClientStatus, getStoredClients } from "@/lib/mockData";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    if (status !== "Active" && status !== "Deactivated") {
      return NextResponse.json(
        { error: "Invalid status. Must be 'Active' or 'Deactivated'" },
        { status: 400 }
      );
    }

    // 1. Update in MongoDB if exists
    try {
      await connectDB();
      const user = await User.findOne({
        $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { email: id.toLowerCase() }],
      });

      if (user) {
        user.isVerified = status === "Active";
        await user.save();
      }
    } catch (dbErr) {
      console.warn("[Client Status API] DB status update fallback:", dbErr);
    }

    // 2. Update in storage/mock layer
    const updatedClient = updateClientStatus(id, status);

    return NextResponse.json({
      success: true,
      message: `Client account status updated to ${status}`,
      client: updatedClient,
      status,
    });
  } catch (error: any) {
    console.error("Error updating client status:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update client status" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import Session from "@/models/Session";
import { getCurrentUser } from "@/lib/session";

export async function POST() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    await connectDB();

    // Bumping tokenVersion immediately invalidates every previously-issued
    // token for this user — including the one making this request.
    await User.updateOne(
      { _id: currentUser.userId },
      { $inc: { tokenVersion: 1 } }
    );
    await Session.deleteMany({ userId: currentUser.userId });

    const response = NextResponse.json({
      success: true,
      message: "Logged out of all devices",
    });
    response.cookies.set("token", "", {
      httpOnly: true,
      expires: new Date(0),
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Error logging out all sessions:", error);
    return NextResponse.json(
      { error: error.message || "Failed to log out all devices" },
      { status: 500 }
    );
  }
}

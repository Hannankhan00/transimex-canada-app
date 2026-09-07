import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Session from "@/models/Session";
import { getCurrentUser } from "@/lib/session";

export async function POST() {
  try {
    const currentUser = await getCurrentUser();
    if (currentUser?.sessionId) {
      await connectDB();
      await Session.deleteOne({ sessionId: currentUser.sessionId });
    }
  } catch (err) {
    console.warn("[Logout] Failed to clean up session record:", err);
  }

  const response = NextResponse.json({ success: true, message: "Logged out" });
  response.cookies.set("token", "", {
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  });
  return response;
}

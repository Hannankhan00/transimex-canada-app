import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Session from "@/models/Session";
import { getCurrentUser } from "@/lib/session";
import { timeAgo, formatDateTimeLabel } from "@/lib/formatDate";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    await connectDB();
    const sessions = await Session.find({ userId: currentUser.userId })
      .sort({ lastActiveAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      sessions: sessions.map((s: any) => ({
        id: s._id.toString(),
        device: s.device,
        browser: s.browser,
        os: s.os,
        ip: s.ip || "",
        createdAt: formatDateTimeLabel(s.createdAt),
        lastActive: timeAgo(s.lastActiveAt),
        isCurrent: s.sessionId === currentUser.sessionId,
      })),
    });
  } catch (error: any) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch active sessions" },
      { status: 500 }
    );
  }
}

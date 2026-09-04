import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Notification from "@/models/Notification";
import { getCurrentUser } from "@/lib/session";
import { timeAgo } from "@/lib/formatDate";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    await connectDB();
    const notifications = await Notification.find({ userId: currentUser.userId })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      notifications: notifications.map((n: any) => ({
        id: n._id.toString(),
        title: n.title,
        titleFr: n.titleFr || n.title,
        desc: n.desc,
        descFr: n.descFr || n.desc,
        time: timeAgo(n.createdAt),
        category: n.category,
        link: n.link || "",
        unread: !n.read,
        timestamp: n.createdAt,
      })),
    });
  } catch (error: any) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

export async function PATCH() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    await connectDB();
    await Notification.updateMany({ userId: currentUser.userId, read: false }, { $set: { read: true } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error marking all notifications read:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update notifications" },
      { status: 500 }
    );
  }
}

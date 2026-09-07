import connectDB from "@/lib/mongoose";
import Notification, { NotificationCategory } from "@/models/Notification";

interface CreateNotificationParams {
  userId?: string;
  title: string;
  titleFr: string;
  desc: string;
  descFr: string;
  category: NotificationCategory;
  link?: string;
  shipmentId?: string;
}

/**
 * Best-effort in-app notification creation. Never throws — a failure here
 * must not block the caller's primary action (email already carries the
 * critical alert path).
 */
export async function notifyUser(params: CreateNotificationParams): Promise<void> {
  if (!params.userId) return;

  try {
    await connectDB();
    await Notification.create({
      userId: params.userId,
      title: params.title,
      titleFr: params.titleFr,
      desc: params.desc,
      descFr: params.descFr,
      category: params.category,
      link: params.link || "",
      shipmentId: params.shipmentId || "",
    });
  } catch (err) {
    console.warn("[Notification] Failed to create in-app notification:", err);
  }
}

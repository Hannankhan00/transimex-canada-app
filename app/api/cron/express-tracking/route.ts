import { NextResponse } from "next/server";
import { isExpressEnabled } from "@/lib/express/config";
import { syncExpressTracking } from "@/lib/express/trackingService";

/**
 * Scheduled job: refreshes DHL tracking for every Express parcel that has a
 * label and is not yet delivered, and sends the status messages that are due.
 * Point a scheduler at it every 15 to 30 minutes with
 * `Authorization: Bearer <EXPRESS_CRON_SECRET>`. Without the secret the route
 * is open in development only; in production it refuses to run.
 */
export async function GET(req: Request) {
  const secret = process.env.EXPRESS_CRON_SECRET?.trim();
  if (!secret && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "EXPRESS_CRON_SECRET is not set" }, { status: 503 });
  }
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isExpressEnabled()) return NextResponse.json({ success: true, skipped: "Express is disabled" });

  try {
    const summary = await syncExpressTracking();
    return NextResponse.json({ success: true, ...summary });
  } catch (error) {
    console.error("Express tracking job failed:", error);
    return NextResponse.json({ error: "Tracking job failed" }, { status: 500 });
  }
}

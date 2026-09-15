import { NextResponse } from "next/server";
import { CRON_SECRET } from "@/lib/tracking/config";
import { syncAllInTransit } from "@/lib/tracking/sync";

/**
 * Scheduled job entry point (requirement 5). Point a scheduler (Vercel Cron,
 * an external cron service, or a manual curl during a demo) at this route —
 * it refreshes every tracked container still in transit and skips delivered
 * ones. Protect it by setting TRACKING_CRON_SECRET and sending it back as
 * `Authorization: Bearer <secret>`; if the secret isn't set yet (e.g. during
 * local development) the route stays open so it can be tested without setup.
 */
export async function GET(req: Request) {
  if (CRON_SECRET) {
    const auth = req.headers.get("authorization") || "";
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await syncAllInTransit();
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("Error running tracking sync job:", error);
    return NextResponse.json({ error: error.message || "Sync job failed" }, { status: 500 });
  }
}

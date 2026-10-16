import { NextResponse } from "next/server";
import { isExpressEnabled } from "@/lib/express/config";
import { runInvoicing, sendOverdueReminders } from "@/lib/express/invoicing";

/**
 * Scheduled job. Point a scheduler at it once a week (for example Monday
 * morning) with `Authorization: Bearer <EXPRESS_CRON_SECRET>`: it issues each
 * credit account's invoice for everything booked since the last one, so the
 * schedule IS the billing cycle (a daily schedule would invoice daily). It
 * also sends overdue reminders, at most one per invoice per week. Without the
 * secret the route is open in development only; in production it refuses to run.
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
    const invoicing = await runInvoicing();
    const reminders = await sendOverdueReminders();
    return NextResponse.json({ success: invoicing.failed === 0, ...invoicing, reminders });
  } catch (error) {
    console.error("Express invoice job failed:", error);
    return NextResponse.json({ error: "Invoice job failed" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { logAudit } from "@/lib/audit";
import { requireExpressStaff } from "@/lib/express/access";
import { runInvoicing } from "@/lib/express/invoicing";
import { formatCad } from "@/lib/shipping/core/money";

/** Staff run the invoice job now (all accounts, or one with accountId). Safe to repeat: billed bookings are never billed twice. */
export async function POST(req: Request) {
  try {
    const access = await requireExpressStaff();
    if (access.error) return access.error;

    const body = (await req.json().catch(() => ({}))) as { accountId?: string };
    if (body.accountId && !isValidObjectId(body.accountId)) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    const summary = await runInvoicing({ accountId: body.accountId });
    await logAudit({
      actor: access.actor,
      action: "EXPRESS_INVOICE_RUN",
      resourceType: "ExpressInvoice",
      resourceId: body.accountId || "all",
      details: `Invoice run by staff: ${summary.issued} issued (${formatCad(summary.totalCents)}), ${summary.failed} failed.`,
    });
    return NextResponse.json({ success: summary.failed === 0, ...summary });
  } catch (error) {
    console.error("Express invoice run error:", error);
    return NextResponse.json({ error: "The invoice run failed" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { requireActivePartner } from "@/lib/express/partnerAccess";
import { cancelPayout } from "@/lib/express/partnerPayouts";

type Ctx = { params: Promise<{ id: string }> };

/** The partner withdraws their own waiting request. Someone else's request is simply not found. */
export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const access = await requireActivePartner();
    if (access.error) return access.error;
    const { id } = await params;
    const ok = await cancelPayout({ accountId: String(access.account._id), payoutId: id });
    if (!ok) return NextResponse.json({ error: "No waiting request to cancel.", code: "not_open" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Express partner payout cancel error:", error);
    return NextResponse.json({ error: "Failed to cancel the request" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { isExpressEnabled } from "@/lib/express/config";

/** Tells the signed-in client portal whether to show the Express button. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ success: true, enabled: isExpressEnabled() });
}

import { NextResponse } from "next/server";
import { requireExpressClient } from "@/lib/express/access";
import { getCurrentTerms } from "@/lib/express/termsStore";

/** The terms of service a new applicant must accept right now. */
export async function GET() {
  try {
    const access = await requireExpressClient();
    if (access.error) return access.error;
    const terms = await getCurrentTerms();
    return NextResponse.json({ success: true, version: terms.version, content: terms.content });
  } catch (error) {
    console.error("Express terms fetch error:", error);
    return NextResponse.json({ error: "Failed to load terms" }, { status: 500 });
  }
}

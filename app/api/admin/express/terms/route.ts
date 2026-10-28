import { NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { requireExpressStaff, validationError } from "@/lib/express/access";
import { termsContentSchema } from "@/lib/express/validation";
import { listTermsVersions, publishTerms } from "@/lib/express/termsStore";
import { notifyTermsPublished } from "@/lib/express/termsNotify";

export async function GET() {
  try {
    const access = await requireExpressStaff();
    if (access.error) return access.error;
    const versions = await listTermsVersions();
    return NextResponse.json({ success: true, current: versions[0], versions });
  } catch (error) {
    console.error("Error loading Express terms:", error);
    return NextResponse.json({ error: "Failed to load Express terms" }, { status: 500 });
  }
}

/** Publishes a new version. Earlier versions are kept; accounts keep the version they accepted. */
export async function POST(req: Request) {
  try {
    const access = await requireExpressStaff();
    if (access.error) return access.error;

    const body = await req.json().catch(() => null);
    const parsed = termsContentSchema.safeParse(body?.content);
    if (!parsed.success) return validationError(parsed.error);

    const published = await publishTerms(parsed.data, { userId: access.actor.userId, name: access.actor.name });

    await logAudit({
      actor: access.actor,
      action: "EXPRESS_TERMS_PUBLISHED",
      resourceType: "ExpressTerms",
      resourceId: published.version,
      details: `Published Express terms ${published.version}`,
    });

    // Every active client is told automatically; they must still accept the new version at their next booking.
    const notified = await notifyTermsPublished(published.version);

    return NextResponse.json({ success: true, current: published, versions: await listTermsVersions(), notified }, { status: 201 });
  } catch (error) {
    console.error("Error publishing Express terms:", error);
    return NextResponse.json({ error: "Failed to publish Express terms" }, { status: 500 });
  }
}

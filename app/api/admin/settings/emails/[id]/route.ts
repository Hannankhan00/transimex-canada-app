import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongoose";
import EmailTemplate from "@/models/EmailTemplate";
import { verifyToken } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    await connectDB();

    const existing = await EmailTemplate.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { slug: id }],
    });

    if (!existing) {
      return NextResponse.json({ error: "Email template not found" }, { status: 404 });
    }

    const { name, description, category, subject, heading, body: templateBody, placeholders } = body;

    if (name !== undefined) existing.name = name;
    if (description !== undefined) existing.description = description;
    if (category !== undefined) existing.category = category;
    if (subject !== undefined) existing.subject = subject;
    if (heading !== undefined) existing.heading = heading;
    if (templateBody !== undefined) existing.body = templateBody;
    if (placeholders !== undefined) existing.placeholders = placeholders;

    await existing.save();

    // Best-effort audit trail entry — never blocks the response
    const actor = verifyToken((await cookies()).get("token")?.value || "");
    if (actor) {
      await logAudit({
        actor,
        action: "EMAIL_TEMPLATE_UPDATED",
        resourceType: "EmailTemplate",
        resourceId: existing.slug,
        details: `Updated bilingual email template copy for "${existing.name}".`,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Template "${existing.name}" updated successfully`,
      template: { ...existing.toObject(), id: existing._id.toString() },
    });
  } catch (error: any) {
    console.error("Error updating email template:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update email template" },
      { status: 500 }
    );
  }
}

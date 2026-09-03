import { NextResponse } from "next/server";
import { updateEmailTemplate, getStoredEmailTemplates, addAuditLogEntry } from "@/lib/mockData";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const templates = getStoredEmailTemplates();
    const existing = templates.find((t) => t.id === id);

    if (!existing) {
      return NextResponse.json({ error: "Email template not found" }, { status: 404 });
    }

    const updated = updateEmailTemplate(id, body);

    // Audit log
    addAuditLogEntry(
      "Jean-Philippe Tremblay",
      "jptremblay@transimex.ca",
      "Super Admin",
      "DOCUMENT_UPLOAD",
      "Document",
      existing.id,
      `Updated bilingual email template copy for "${existing.name}".`
    );

    return NextResponse.json({
      success: true,
      message: `Template "${existing.name}" updated successfully`,
      template: updated,
    });
  } catch (error: any) {
    console.error("Error updating email template:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update email template" },
      { status: 500 }
    );
  }
}

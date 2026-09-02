import { NextResponse } from "next/server";
import { replyToInquiry, getStoredInquiries } from "@/lib/mockData";
import { sendInquiryReplyEmail } from "@/lib/email";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { replyText, responderName } = body;

    if (!replyText || !replyText.trim()) {
      return NextResponse.json(
        { error: "Reply message content is required" },
        { status: 400 }
      );
    }

    const inquiries = getStoredInquiries();
    const originalInquiry = inquiries.find((inq) => inq.id === id);

    if (!originalInquiry) {
      return NextResponse.json({ error: "Inquiry not found" }, { status: 404 });
    }

    const updated = replyToInquiry(
      id,
      replyText,
      responderName || "Transimex Operations Dispatch"
    );

    // Trigger transactional email to prospect
    try {
      await sendInquiryReplyEmail({
        to: originalInquiry.email,
        name: originalInquiry.name,
        subject: originalInquiry.subject,
        originalMessage: originalInquiry.message,
        replyContent: replyText,
        responderName: responderName || "Transimex Operations Dispatch",
      });
    } catch (mailErr) {
      console.warn("[Email Notification] Could not send inquiry reply email:", mailErr);
    }

    return NextResponse.json({
      success: true,
      message: `Reply delivered to ${originalInquiry.email}`,
      inquiry: updated,
    });
  } catch (error: any) {
    console.error("Error replying to inquiry:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reply to inquiry" },
      { status: 500 }
    );
  }
}

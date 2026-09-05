import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Inquiry from "@/models/Inquiry";
import { toContactInquiry } from "@/lib/inquiryTypes";
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

    await connectDB();
    const originalInquiry = await Inquiry.findById(id);

    if (!originalInquiry) {
      return NextResponse.json({ error: "Inquiry not found" }, { status: 404 });
    }

    const repliedBy = responderName || "Transimex Operations Dispatch";

    originalInquiry.reply = {
      text: replyText,
      repliedAt: new Date(),
      repliedBy,
    };
    originalInquiry.replied = true;
    originalInquiry.unread = false;
    await originalInquiry.save();

    // Trigger transactional email to prospect
    try {
      await sendInquiryReplyEmail({
        to: originalInquiry.email,
        name: originalInquiry.name,
        subject: originalInquiry.subject,
        originalMessage: originalInquiry.message,
        replyContent: replyText,
        responderName: repliedBy,
      });
    } catch (mailErr) {
      console.warn("[Email Notification] Could not send inquiry reply email:", mailErr);
    }

    return NextResponse.json({
      success: true,
      message: `Reply delivered to ${originalInquiry.email}`,
      inquiry: toContactInquiry(originalInquiry),
    });
  } catch (error: any) {
    console.error("Error replying to inquiry:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reply to inquiry" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { sendEmail, emailTemplateWrapper } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { to, templateId, lang, subject, heading, content } = body;

    const targetEmail = to || process.env.ADMIN_EMAIL || "dispatch@transimex.ca";

    // Inject realistic preview replacements
    const previewSubject = (subject || "Transimex Logistics Notification")
      .replace(/\{\{clientName\}\}/g, "Marc Tremblay")
      .replace(/\{\{quoteId\}\}/g, "QT-2026-00124")
      .replace(/\{\{trackingId\}\}/g, "TMX-2026-00847")
      .replace(/\{\{origin\}\}/g, "Montreal, QC")
      .replace(/\{\{destination\}\}/g, "Chicago, IL")
      .replace(/\{\{rate\}\}/g, "$4,850.00 CAD")
      .replace(/\{\{eta\}\}/g, "Tomorrow, 04:15 PM")
      .replace(/\{\{totalOwed\}\}/g, "$1,410.00 CAD");

    const previewHeading = (heading || "Transimex Logistics Dispatch Update")
      .replace(/\{\{clientName\}\}/g, "Marc Tremblay")
      .replace(/\{\{trackingId\}\}/g, "TMX-2026-00847");

    const previewBody = (content || "Test transactional message content.")
      .replace(/\{\{clientName\}\}/g, "Marc Tremblay")
      .replace(/\{\{quoteId\}\}/g, "QT-2026-00124")
      .replace(/\{\{trackingId\}\}/g, "TMX-2026-00847")
      .replace(/\{\{origin\}\}/g, "Montreal, QC")
      .replace(/\{\{destination\}\}/g, "Chicago, IL")
      .replace(/\{\{rate\}\}/g, "$4,850.00 CAD")
      .replace(/\{\{eta\}\}/g, "Tomorrow, 04:15 PM")
      .replace(/\{\{totalOwed\}\}/g, "$1,410.00 CAD")
      .replace(/\{\{rejectionReason\}\}/g, "equipment unavailability in the Detroit corridor")
      .replace(/\{\{deliveryTime\}\}/g, "Today at 14:22 EST")
      .replace(/\{\{ticketId\}\}/g, "SUP-2026-0042")
      .replace(/\{\{subject\}\}/g, "CBSA PARS Customs Verification")
      .replace(/\{\{latestMessage\}\}/g, "Livingston broker has cleared B3 entry and released cargo at port terminal.")
      .replace(/\{\{portalUrl\}\}/g, "https://transimex.ca/dashboard");

    const html = emailTemplateWrapper(
      `
      <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 10px; border-radius: 6px; margin-bottom: 20px; font-size: 11px; color: #991b1b;">
        <strong>TEST EMAIL DISPATCH PREVIEW [${lang === "fr" ? "FRANÇAIS" : "ENGLISH"}]:</strong> This is a rendered demonstration of transactional template <code>${templateId}</code>.
      </div>
      <h1 class="h1">${previewHeading}</h1>
      <div style="color: #334155; font-size: 14px; line-height: 1.7; white-space: pre-wrap;">${previewBody}</div>
      `,
      previewSubject
    );

    const result = await sendEmail({
      to: targetEmail,
      subject: `[TEST PREVIEW] ${previewSubject}`,
      html,
      text: previewBody,
    });

    return NextResponse.json({
      success: true,
      message: `Test email successfully dispatched to ${targetEmail}`,
      result,
    });
  } catch (error: any) {
    console.error("Error sending test email:", error);
    return NextResponse.json(
      { error: error.message || "Failed to dispatch test email" },
      { status: 500 }
    );
  }
}

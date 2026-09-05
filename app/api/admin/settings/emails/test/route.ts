import { NextResponse } from "next/server";
import { sendEmail, emailTemplateWrapper } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { to, templateId, lang, subject, heading, content } = body;

    const targetEmail = to || process.env.ADMIN_EMAIL || "dispatch@transimex.ca";

    // Inject generic, clearly-labeled sample data for previewing — never a
    // specific-looking real client name, email, or dollar figure.
    const SAMPLE_VALUES: Record<string, string> = {
      "{{clientName}}": "Sample Client Inc.",
      "{{quoteId}}": "QT-SAMPLE-0001",
      "{{trackingId}}": "TMX-SAMPLE-0001",
      "{{origin}}": "Sample Origin City",
      "{{destination}}": "Sample Destination City",
      "{{rate}}": "$0.00 CAD (sample)",
      "{{eta}}": "Sample ETA",
      "{{totalOwed}}": "$0.00 CAD (sample)",
      "{{rejectionReason}}": "sample capacity constraint reason",
      "{{deliveryTime}}": "Sample delivery time",
      "{{ticketId}}": "SUP-SAMPLE-0001",
      "{{subject}}": "Sample Inquiry Subject",
      "{{latestMessage}}": "Sample dispatcher response message.",
      "{{portalUrl}}": "https://transimex.ca/dashboard",
      "{{portOfEntry}}": "Sample Port of Entry",
    };

    const applySampleTokens = (text: string) =>
      Object.entries(SAMPLE_VALUES).reduce(
        (acc, [token, value]) => acc.replace(new RegExp(token.replace(/[{}]/g, "\\$&"), "g"), value),
        text
      );

    const previewSubject = applySampleTokens(subject || "Transimex Logistics Notification");
    const previewHeading = applySampleTokens(heading || "Transimex Logistics Dispatch Update");
    const previewBody = applySampleTokens(content || "Test transactional message content.");

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

import nodemailer from "nodemailer";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const getAppUrl = () => {
  return (
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
};

// Create reusable SMTP Transporter
export function getTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  if (!host || !user || !pass) {
    return null;
  }

  const isGmail = host.toLowerCase().includes("gmail.com");

  // For Gmail, using service: 'gmail' automatically uses port 465 with SSL,
  // preventing port 587 ISP/firewall timeout blocks.
  if (isGmail) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user,
        pass,
      },
      connectionTimeout: 6000,
      greetingTimeout: 6000,
      socketTimeout: 8000,
    });
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === "production",
    },
    connectionTimeout: 6000,
    greetingTimeout: 6000,
    socketTimeout: 8000,
  });
}

export async function sendEmail({ to, subject, html, text }: SendEmailParams): Promise<{ success: boolean; messageId?: string }> {
  const from = process.env.SMTP_FROM || `"Transimex Canada Logistics" <${process.env.SMTP_USER || "notifications@transimex-canada.com"}>`;
  const transporter = getTransporter();

  if (!transporter) {
    console.warn("\n================ [MOCK EMAIL SERVICE] ================");
    console.warn(`[SMTP Warning] SMTP credentials not set in .env.local.`);
    console.warn(`To: ${to}`);
    console.warn(`Subject: ${subject}`);
    console.warn(`Message preview available in terminal.\n`);
    return { success: true, messageId: "simulated-dev-id" };
  }

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text: text || "Please view this email in an HTML-compatible client.",
      html,
    });
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error("[Nodemailer Error] Failed to send email:", error);
    throw error;
  }
}

/**
 * Institutional Logistics Branded HTML Wrapper
 */
function emailTemplateWrapper(contentHtml: string, previewText: string = "Transimex Canada Client Portal Notification") {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Transimex Canada Logistics</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    .wrapper { width: 100%; background-color: #f4f6f9; padding: 30px 15px; box-sizing: border-box; }
    .container { max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(11, 37, 69, 0.05); }
    .header { background-color: #0B2545; padding: 28px 30px; text-align: left; }
    .logo-text { color: #ffffff; font-size: 24px; font-weight: 700; font-family: 'Georgia', serif; letter-spacing: -0.5px; margin: 0; }
    .logo-sub { color: #d21f27; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2.5px; margin-top: 2px; }
    .body-content { padding: 36px 30px; color: #1e293b; font-size: 14px; line-height: 1.6; }
    .h1 { font-family: 'Georgia', serif; font-size: 22px; color: #0B2545; font-weight: 700; margin: 0 0 16px 0; }
    .btn { display: inline-block; background-color: #d21f27; color: #ffffff !important; text-decoration: none; padding: 13px 26px; border-radius: 10px; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; margin: 22px 0; }
    .alert-box { background-color: #f8fafc; border-left: 4px solid #d21f27; border-radius: 6px; padding: 14px; margin: 18px 0; font-size: 12px; color: #475569; }
    .cred-box { background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin: 18px 0; font-family: monospace; font-size: 13px; color: #0f172a; }
    .footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 22px 30px; text-align: center; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <span style="display:none;font-size:0;color:#ffffff;line-height:0;max-height:0;overflow:hidden;">${previewText}</span>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo-text">Transimex</div>
        <div class="logo-sub">Canada Logistics Inc.</div>
      </div>
      <div class="body-content">
        ${contentHtml}
      </div>
      <div class="footer">
        <p style="margin: 0 0 6px 0;"><strong>Transimex Canada Logistics Inc.</strong> &bull; Montreal &bull; Toronto &bull; Vancouver</p>
        <p style="margin: 0;">Institutional Logistics &amp; Cross-Border CBSA / PIP Compliance. This is an automated notification.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * 1. Send Password Reset Recovery Email
 */
export async function sendPasswordResetEmail({
  to,
  name,
  token,
}: {
  to: string;
  name?: string;
  token: string;
}) {
  const appUrl = getAppUrl();
  const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;

  const content = `
    <h1 class="h1">Password Recovery Request</h1>
    <p>Hello ${name ? `<strong>${name}</strong>` : "there"},</p>
    <p>We received a request to reset the password for your Transimex Canada commercial portal account associated with <strong>${to}</strong>.</p>
    
    <div style="text-align: center;">
      <a href="${resetUrl}" class="btn" target="_blank">Reset Password Now</a>
    </div>

    <div class="alert-box">
      <strong>Security Notice:</strong> This secure tokenized link is valid for <strong>1 hour</strong>. If you did not initiate this request, you can safely ignore this email and your password will remain unchanged.
    </div>

    <p style="font-size: 12px; color: #64748b; margin-top: 24px;">
      If the button above does not work, copy and paste this link into your browser:<br>
      <a href="${resetUrl}" style="color: #0B2545; word-break: break-all;">${resetUrl}</a>
    </p>
  `;

  return sendEmail({
    to,
    subject: "Reset Your Transimex Portal Password",
    html: emailTemplateWrapper(content, "Reset your password for Transimex Canada Client Portal"),
    text: `Reset your Transimex password by visiting: ${resetUrl}`,
  });
}

/**
 * 2. Send Account Application & Email Verification Email
 */
export async function sendVerificationEmail({
  to,
  name,
  companyName,
  token,
}: {
  to: string;
  name: string;
  companyName: string;
  token?: string;
}) {
  const appUrl = getAppUrl();
  const verifyUrl = token
    ? `${appUrl}/verify-email?token=${encodeURIComponent(token)}`
    : `${appUrl}/login`;

  const content = `
    <h1 class="h1">Verify Your Corporate Logistics Account</h1>
    <p>Dear <strong>${name}</strong>,</p>
    <p>Thank you for submitting a commercial registration for <strong>${companyName}</strong> with Transimex Canada Logistics.</p>
    <p>To confirm your email address and verify your dispatch permissions, please click the verification button below:</p>

    <div style="text-align: center;">
      <a href="${verifyUrl}" class="btn" target="_blank">Verify Email &amp; Activate Portal</a>
    </div>

    <div class="alert-box">
      <strong>Verification Link:</strong> This verification request is active for <strong>24 hours</strong>. Once confirmed, you can submit real-time freight quotes and track highway manifests across Canada.
    </div>

    <p style="font-size: 12px; color: #64748b; margin-top: 24px;">
      Direct link: <a href="${verifyUrl}" style="color: #0B2545; word-break: break-all;">${verifyUrl}</a>
    </p>
  `;

  return sendEmail({
    to,
    subject: "Verify Your Transimex Canada Logistics Account",
    html: emailTemplateWrapper(content, "Verify your corporate email for Transimex Canada"),
    text: `Verify your Transimex account by visiting: ${verifyUrl}`,
  });
}

/**
 * 3. Send Sub-Admin / Staff Invitation Email
 */
export async function sendStaffInvitationEmail({
  to,
  name,
  temporaryPassword,
  role,
}: {
  to: string;
  name: string;
  temporaryPassword: string;
  role: string;
}) {
  const appUrl = getAppUrl();
  const loginUrl = `${appUrl}/login`;

  const content = `
    <h1 class="h1">Staff Access Granted: Transimex Admin Console</h1>
    <p>Hello <strong>${name}</strong>,</p>
    <p>You have been granted <strong>${role.toUpperCase()}</strong> permissions for the Transimex Canada Enterprise Portal.</p>
    
    <div class="cred-box">
      <div><strong>Login Email:</strong> ${to}</div>
      <div style="margin-top: 6px;"><strong>Temporary Password:</strong> ${temporaryPassword}</div>
      <div style="margin-top: 6px;"><strong>Role:</strong> ${role.toUpperCase()}</div>
    </div>

    <div style="text-align: center;">
      <a href="${loginUrl}" class="btn" target="_blank">Sign In to Admin Console</a>
    </div>

    <div class="alert-box">
      <strong>Security Notice:</strong> Please sign in and change your password in your Account Settings immediately upon first login.
    </div>
  `;

  return sendEmail({
    to,
    subject: "Your Transimex Canada Staff Account Credentials",
    html: emailTemplateWrapper(content, "Your staff account credentials for Transimex Canada"),
    text: `Your Transimex Staff account is ready. Login at: ${loginUrl} with email: ${to} and temporary password: ${temporaryPassword}`,
  });
}

/**
 * 4. Send Quote Accepted & Shipment Generated Email
 */
export async function sendQuoteAcceptedEmail({
  to,
  name,
  companyName,
  quoteId,
  trackingId,
  origin,
  destination,
  priceCad,
  equipment,
}: {
  to: string;
  name: string;
  companyName?: string;
  quoteId: string;
  trackingId: string;
  origin: string;
  destination: string;
  priceCad: string;
  equipment?: string;
}) {
  const appUrl = getAppUrl();
  const trackingUrl = `${appUrl}/dashboard/shipments?id=${encodeURIComponent(trackingId)}`;

  const content = `
    <h1 class="h1">Freight Quote Accepted &amp; Dispatched</h1>
    <p>Dear <strong>${name}</strong> ${companyName ? `(${companyName})` : ""},</p>
    <p>We are pleased to inform you that your freight quote request <strong>${quoteId}</strong> has been finalized, approved, and converted into an active commercial shipment.</p>
    
    <div class="cred-box">
      <div style="font-size: 15px; font-weight: bold; color: #0B2545; margin-bottom: 8px;">
        Tracking Manifest: <span style="color: #D21F27;">${trackingId}</span>
      </div>
      <div><strong>Agreed Freight Rate:</strong> ${priceCad}</div>
      <div style="margin-top: 4px;"><strong>Corridor Route:</strong> ${origin} &rarr; ${destination}</div>
      ${equipment ? `<div style="margin-top: 4px;"><strong>Assigned Equipment:</strong> ${equipment}</div>` : ""}
      <div style="margin-top: 4px;"><strong>Initial Status:</strong> <span style="color: #10b981; font-weight: bold;">Pending Dispatch / Carrier Assigned</span></div>
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${trackingUrl}" class="btn" target="_blank">Track Shipment in Client Portal</a>
    </div>

    <div class="alert-box">
      <strong>Live Telematics &amp; Documents:</strong> Bill of Lading (BOL), customs PARS entry, and driver milestone tracking are now available under your portal tracking dashboard.
    </div>
  `;

  return sendEmail({
    to,
    subject: `Quote Approved [${quoteId}] & Shipment Created: ${trackingId}`,
    html: emailTemplateWrapper(content, `Your freight quote ${quoteId} has been accepted and assigned tracking ID ${trackingId}`),
    text: `Your quote ${quoteId} has been accepted at rate ${priceCad}. Track shipment ${trackingId} at ${trackingUrl}`,
  });
}

/**
 * 5. Send Quote Rejected Email
 */
export async function sendQuoteRejectedEmail({
  to,
  name,
  companyName,
  quoteId,
  origin,
  destination,
  rejectionReason,
}: {
  to: string;
  name: string;
  companyName?: string;
  quoteId: string;
  origin: string;
  destination: string;
  rejectionReason: string;
}) {
  const appUrl = getAppUrl();
  const contactUrl = `${appUrl}/dashboard/support`;

  const content = `
    <h1 class="h1">Freight Quote Assessment Update</h1>
    <p>Dear <strong>${name}</strong> ${companyName ? `(${companyName})` : ""},</p>
    <p>Thank you for submitting freight request <strong>${quoteId}</strong> for the route <strong>${origin} &rarr; ${destination}</strong>.</p>
    <p>After review by our cross-border logistics dispatch team, we regret to inform you that we are unable to accept or service this specific quote request at this time.</p>
    
    <div style="background-color: #fef2f2; border-left: 4px solid #D21F27; padding: 14px; margin: 18px 0; border-radius: 4px;">
      <div style="font-weight: bold; color: #991b1b; margin-bottom: 4px;">Reason for Decision:</div>
      <div style="color: #7f1d1d; font-size: 13px; line-height: 1.5;">${rejectionReason}</div>
    </div>

    <p>If your cargo requirements, pickup dates, or specifications can be adjusted, please submit an updated request or contact our dispatch team directly.</p>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${contactUrl}" class="btn" target="_blank">Contact Dispatch Support</a>
    </div>
  `;

  return sendEmail({
    to,
    subject: `Update Regarding Freight Quote Request ${quoteId}`,
    html: emailTemplateWrapper(content, `Status update on your Transimex freight quote ${quoteId}`),
    text: `Your freight quote ${quoteId} could not be accepted. Reason: ${rejectionReason}. Contact dispatch at ${contactUrl}`,
  });
}

/**
 * 6. Send Duties & Tax Payment Notice Email
 */
export async function sendDutiesNoticeEmail({
  to,
  name,
  companyName,
  trackingId,
  dutiesAmount,
  taxesAmount,
  brokerageFee,
  totalOwed,
  portOfEntry,
  cbsaPars,
  wirePaymentInstructions,
}: {
  to: string;
  name: string;
  companyName?: string;
  trackingId: string;
  dutiesAmount: string;
  taxesAmount: string;
  brokerageFee: string;
  totalOwed: string;
  portOfEntry?: string;
  cbsaPars?: string;
  wirePaymentInstructions?: string;
}) {
  const appUrl = getAppUrl();
  const paymentUrl = `${appUrl}/dashboard/shipments?id=${encodeURIComponent(trackingId)}`;

  const content = `
    <h1 class="h1">Customs Clearance: Duties &amp; Taxes Notice</h1>
    <p>Dear <strong>${name}</strong> ${companyName ? `(${companyName})` : ""},</p>
    <p>This is a regulatory compliance notification from the Transimex Canada Customs Brokerage Gateway regarding active shipment <strong>${trackingId}</strong>.</p>
    
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 14px; margin: 18px 0; border-radius: 4px;">
      <div style="font-weight: bold; color: #92400e; font-size: 14px;">Regulatory Status: Customs Duties Assessment Pending Payment</div>
      <div style="color: #78350f; font-size: 12px; margin-top: 4px;">
        ${cbsaPars ? `<strong>CBSA Entry:</strong> ${cbsaPars} &bull; ` : ""}
        ${portOfEntry ? `<strong>Port of Entry:</strong> ${portOfEntry}` : "Canadian Border Port of Entry"}
      </div>
    </div>

    <div class="cred-box">
      <div style="font-size: 16px; font-weight: bold; color: #0B2545; margin-bottom: 8px;">
        Total Tariff &amp; Regulatory Duties Owed: <span style="color: #D21F27;">${totalOwed}</span>
      </div>
      <div style="font-size: 13px; line-height: 1.6;">
        <div>&bull; <strong>Customs Tariff Duties:</strong> ${dutiesAmount}</div>
        <div>&bull; <strong>Federal / Provincial Taxes (GST/HST):</strong> ${taxesAmount}</div>
        <div>&bull; <strong>Brokerage &amp; Harbor Filing Fee:</strong> ${brokerageFee}</div>
      </div>
    </div>

    <p style="margin-top: 18px;">
      ${wirePaymentInstructions || "Payment can be executed via Electronic Funds Transfer (EFT), certified corporate cheque, or credit card directly in the client portal."}
    </p>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${paymentUrl}" class="btn" target="_blank">Review &amp; Clear Duties in Portal</a>
    </div>

    <div class="alert-box">
      <strong>Important Border Release Notice:</strong> In accordance with CBSA &amp; CBP regulations, freight release from border customs hold will occur immediately upon settlement verification.
    </div>
  `;

  return sendEmail({
    to,
    subject: `URGENT: Customs Duties Assessment for Shipment ${trackingId}`,
    html: emailTemplateWrapper(content, `Customs duties notice for shipment ${trackingId} - Total Owed: ${totalOwed}`),
    text: `Customs duties notice for ${trackingId}. Total owed: ${totalOwed}. Pay and clear at ${paymentUrl}`,
  });
}

/**
 * 7. Send Contact Inquiry Reply Email
 */
export async function sendInquiryReplyEmail({
  to,
  name,
  subject,
  originalMessage,
  replyContent,
  responderName,
}: {
  to: string;
  name: string;
  subject: string;
  originalMessage: string;
  replyContent: string;
  responderName?: string;
}) {
  const appUrl = getAppUrl();

  const content = `
    <h1 class="h1">Response from Transimex Canada Logistics</h1>
    <p>Dear <strong>${name}</strong>,</p>
    <p>Thank you for contacting Transimex Canada. In response to your inquiry regarding <strong>${subject}</strong>, our logistics team has provided the following reply:</p>

    <div style="background-color: #f8fafc; border-left: 4px solid #0B2545; padding: 16px; margin: 18px 0; border-radius: 4px;">
      <div style="font-weight: bold; color: #0B2545; font-size: 13px; margin-bottom: 6px;">
        Transimex Operations Response ${responderName ? `by ${responderName}` : ""}:
      </div>
      <div style="color: #334155; font-size: 13px; line-height: 1.6; white-space: pre-wrap;">${replyContent}</div>
    </div>

    <div style="background-color: #f1f5f9; padding: 12px; margin-top: 20px; border-radius: 4px; font-size: 12px; color: #64748b;">
      <div style="font-weight: bold; margin-bottom: 4px;">Your Original Inquiry:</div>
      <div style="font-style: italic;">"${originalMessage}"</div>
    </div>

    <p style="margin-top: 20px;">If you have further questions or require freight scheduling assistance, you can reply directly to this email or visit our logistics portal.</p>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${appUrl}/quote" class="btn" target="_blank">Request Instant Freight Quote</a>
    </div>
  `;

  return sendEmail({
    to,
    subject: `Re: ${subject} - Transimex Canada`,
    html: emailTemplateWrapper(content, `Reply regarding your inquiry: ${subject}`),
    text: `Reply from Transimex Canada:\n\n${replyContent}\n\nOriginal Inquiry: ${originalMessage}`,
  });
}

/**
 * 8. Send Support Ticket Update / Response Email
 */
export async function sendTicketUpdateEmail({
  to,
  name,
  ticketId,
  subject,
  status,
  latestMessage,
  shipmentId,
}: {
  to: string;
  name: string;
  ticketId: string;
  subject: string;
  status: string;
  latestMessage: string;
  shipmentId?: string;
}) {
  const appUrl = getAppUrl();
  const ticketUrl = `${appUrl}/dashboard/support`;

  const content = `
    <h1 class="h1">Support Ticket Update: ${ticketId}</h1>
    <p>Dear <strong>${name}</strong>,</p>
    <p>There has been a new response to your support ticket regarding <strong>${subject}</strong>.</p>

    <div class="cred-box">
      <div><strong>Ticket Reference:</strong> ${ticketId}</div>
      <div><strong>Status:</strong> <span style="color: #D21F27; font-weight: bold;">${status}</span></div>
      ${shipmentId ? `<div><strong>Associated Shipment:</strong> ${shipmentId}</div>` : ""}
    </div>

    <div style="background-color: #f8fafc; border-left: 4px solid #D21F27; padding: 16px; margin: 18px 0; border-radius: 4px;">
      <div style="font-weight: bold; color: #0B2545; font-size: 13px; margin-bottom: 6px;">
        Latest Dispatcher Response:
      </div>
      <div style="color: #334155; font-size: 13px; line-height: 1.6; white-space: pre-wrap;">${latestMessage}</div>
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${ticketUrl}" class="btn" target="_blank">View Conversation in Client Portal</a>
    </div>
  `;

  return sendEmail({
    to,
    subject: `[${ticketId}] Support Update: ${subject}`,
    html: emailTemplateWrapper(content, `Support update on ticket ${ticketId}`),
    text: `Support ticket ${ticketId} update (${status}):\n\n${latestMessage}\n\nView at ${ticketUrl}`,
  });
}



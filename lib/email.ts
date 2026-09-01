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
    // If SMTP credentials aren't provided in .env, create an ethereal or simulated logger
    return null;
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
  });
}

export async function sendEmail({ to, subject, html, text }: SendEmailParams): Promise<{ success: boolean; messageId?: string }> {
  const from = process.env.SMTP_FROM || `"Transimex Canada Logistics" <${process.env.SMTP_USER || "no-reply@transimex-canada.com"}>`;
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
 * Send Password Reset Recovery Email
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
 * Send Account Application & Verification Email
 */
export async function sendVerificationEmail({
  to,
  name,
  companyName,
}: {
  to: string;
  name: string;
  companyName: string;
}) {
  const appUrl = getAppUrl();
  const loginUrl = `${appUrl}/login`;

  const content = `
    <h1 class="h1">Corporate Account Application Received</h1>
    <p>Dear <strong>${name}</strong>,</p>
    <p>Thank you for registering <strong>${companyName}</strong> with Transimex Canada Logistics.</p>
    <p>Our commercial dispatch and compliance team is reviewing your company credentials. You can access your client portal dashboard to begin submitting preliminary freight quote requests and reviewing highway corridor schedules.</p>

    <div style="text-align: center;">
      <a href="${loginUrl}" class="btn" target="_blank">Access Client Portal</a>
    </div>

    <div class="alert-box">
      <strong>Need expedited dispatch?</strong> You can contact your dedicated logistics account manager 24/7 at <strong>+1 (800) 555-TXMX</strong>.
    </div>
  `;

  return sendEmail({
    to,
    subject: "Welcome to Transimex Canada Logistics Portal",
    html: emailTemplateWrapper(content, "Welcome to Transimex Canada Commercial Client Portal"),
    text: `Welcome to Transimex Canada! Access your portal at: ${loginUrl}`,
  });
}

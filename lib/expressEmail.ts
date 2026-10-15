import { emailTemplateWrapper, escapeHtml, getAdminNotificationEmail, sendEmail } from "@/lib/email";

type Lang = "en" | "fr";

/**
 * Express emails are OFF until EXPRESS_EMAILS_ENABLED=true, so nothing is sent
 * to real people while the feature is being built and tested. In-app
 * notifications are unaffected.
 */
export function expressEmailsEnabled(): boolean {
  return process.env.EXPRESS_EMAILS_ENABLED === "true";
}

type SendParams = Parameters<typeof sendEmail>[0];

async function sendExpressEmail(params: SendParams): Promise<{ success: boolean; skipped?: boolean; messageId?: string }> {
  if (!expressEmailsEnabled()) {
    console.info(`[Express] Email disabled (EXPRESS_EMAILS_ENABLED is not true); not sending "${params.subject}".`);
    return { success: false, skipped: true };
  }
  return sendEmail(params);
}

const appUrl = () => process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";

/** Alerts staff that a B2B application is waiting for review. */
export async function sendExpressApplicationAdminAlert(params: {
  companyName: string;
  contactName: string;
  phone: string;
  country: string;
  businessType: string;
  expectedMonthlyVolume: string;
  accountId: string;
}) {
  const url = `${appUrl()}/admin/express/${params.accountId}`;
  const content = `
    <h1 class="h1">New Transimex Express B2B application</h1>
    <p>A business has applied for a Transimex Express B2B account and is waiting for review.</p>
    <div class="cred-box">
      <div><strong>Company:</strong> ${escapeHtml(params.companyName)}</div>
      <div><strong>Contact:</strong> ${escapeHtml(params.contactName)} (${escapeHtml(params.phone)})</div>
      <div><strong>Country:</strong> ${escapeHtml(params.country)}</div>
      <div><strong>Business type:</strong> ${escapeHtml(params.businessType)}</div>
      <div><strong>Expected monthly volume:</strong> ${escapeHtml(params.expectedMonthlyVolume)}</div>
    </div>
    <div style="text-align:center;"><a href="${url}" class="btn" target="_blank">Review application</a></div>
  `;
  return sendExpressEmail({
    to: getAdminNotificationEmail(),
    subject: `New Express B2B application: ${params.companyName}`,
    html: emailTemplateWrapper(content, `${params.companyName} applied for a Transimex Express B2B account`),
    text: `${params.companyName} applied for a Transimex Express B2B account. Review it at ${url}`,
    category: "express-application",
  });
}

export type ExpressDecision = "approved" | "rejected" | "suspended" | "reactivated";

const COPY: Record<Lang, Record<ExpressDecision, { subject: string; heading: string; body: string; cta: string }>> = {
  en: {
    approved: {
      subject: "Your Transimex Express account is approved",
      heading: "Your Express account is approved",
      body: "Good news: your Transimex Express business account is now active. You can get quotes and book shipments from your Express area.",
      cta: "Open Transimex Express",
    },
    rejected: {
      subject: "Update on your Transimex Express application",
      heading: "Your application was not approved",
      body: "We reviewed your Transimex Express business application and could not approve it at this time.",
      cta: "View your application",
    },
    suspended: {
      subject: "Your Transimex Express account is suspended",
      heading: "Your Express account is suspended",
      body: "Your Transimex Express account has been suspended. You cannot get quotes or book new shipments until it is reactivated.",
      cta: "View your account",
    },
    reactivated: {
      subject: "Your Transimex Express account is active again",
      heading: "Your Express account is active again",
      body: "Your Transimex Express account has been reactivated. You can get quotes and book shipments again.",
      cta: "Open Transimex Express",
    },
  },
  fr: {
    approved: {
      subject: "Votre compte Transimex Express est approuvé",
      heading: "Votre compte Express est approuvé",
      body: "Bonne nouvelle : votre compte d'entreprise Transimex Express est maintenant actif. Vous pouvez obtenir des soumissions et réserver des envois depuis votre espace Express.",
      cta: "Ouvrir Transimex Express",
    },
    rejected: {
      subject: "Mise à jour de votre demande Transimex Express",
      heading: "Votre demande n'a pas été approuvée",
      body: "Nous avons examiné votre demande de compte d'entreprise Transimex Express et n'avons pas pu l'approuver pour le moment.",
      cta: "Voir votre demande",
    },
    suspended: {
      subject: "Votre compte Transimex Express est suspendu",
      heading: "Votre compte Express est suspendu",
      body: "Votre compte Transimex Express a été suspendu. Vous ne pouvez pas obtenir de soumissions ni réserver de nouveaux envois tant qu'il n'est pas réactivé.",
      cta: "Voir votre compte",
    },
    reactivated: {
      subject: "Votre compte Transimex Express est de nouveau actif",
      heading: "Votre compte Express est de nouveau actif",
      body: "Votre compte Transimex Express a été réactivé. Vous pouvez de nouveau obtenir des soumissions et réserver des envois.",
      cta: "Ouvrir Transimex Express",
    },
  },
};

const REASON_LABEL: Record<Lang, string> = { en: "Reason", fr: "Motif" };

/** Tells a client about a staff decision on their account, in their language. */
export async function sendExpressDecisionEmail(params: {
  to: string;
  name: string;
  language: Lang;
  decision: ExpressDecision;
  reason?: string;
}) {
  const lang: Lang = params.language === "fr" ? "fr" : "en";
  const copy = COPY[lang][params.decision];
  const url = `${appUrl()}/express`;
  const greeting = lang === "fr" ? "Bonjour" : "Hello";

  const reasonHtml = params.reason
    ? `<div class="alert-box"><strong>${REASON_LABEL[lang]}:</strong> ${escapeHtml(params.reason)}</div>`
    : "";
  const content = `
    <h1 class="h1">${copy.heading}</h1>
    <p>${greeting} <strong>${escapeHtml(params.name)}</strong>,</p>
    <p>${copy.body}</p>
    ${reasonHtml}
    <div style="text-align:center;"><a href="${url}" class="btn" target="_blank">${copy.cta}</a></div>
  `;
  return sendExpressEmail({
    to: params.to,
    subject: copy.subject,
    html: emailTemplateWrapper(content, copy.heading),
    text: `${copy.heading}. ${copy.body}${params.reason ? ` ${REASON_LABEL[lang]}: ${params.reason}` : ""} ${url}`,
    category: `express-${params.decision}`,
  });
}

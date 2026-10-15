import { emailTemplateWrapper, escapeHtml, getAdminNotificationEmail, sendEmail } from "@/lib/email";
import { optionLabel, type Category, type PaymentPreference, type Restricted, type ShipsFor } from "@/lib/express/shippingProfile";

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
  shipsFor?: ShipsFor;
  categories?: Category[];
  restrictedGoods?: Restricted[];
  paymentPreference?: PaymentPreference;
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
      ${params.categories?.length ? `<div><strong>Ships:</strong> ${escapeHtml(params.categories.map((c) => optionLabel("categories", c, "en")).join(", "))}</div>` : ""}
      ${params.shipsFor ? `<div><strong>Ships for:</strong> ${escapeHtml(optionLabel("shipsFor", params.shipsFor, "en"))}</div>` : ""}
      ${params.restrictedGoods?.length ? `<div><strong>Restricted goods:</strong> ${escapeHtml(params.restrictedGoods.map((r) => optionLabel("restrictedGoods", r, "en")).join(", "))}</div>` : ""}
      ${params.paymentPreference ? `<div><strong>Would like to pay:</strong> ${escapeHtml(optionLabel("paymentPreference", params.paymentPreference, "en"))}</div>` : ""}
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

export type ExpressShipmentEmailKind = "payment_received" | "label_ready" | "cancelled" | "refunded" | "in_transit" | "out_for_delivery" | "delivered" | "delivery_exception" | "returned";

const SHIPMENT_COPY: Record<Lang, Record<ExpressShipmentEmailKind, { subject: string; heading: string; body: string }>> = {
  en: {
    payment_received: {
      subject: "Payment received for your Express shipment",
      heading: "Payment received",
      body: "We received your payment. We are now creating your DHL label and will email you as soon as it is ready.",
    },
    label_ready: {
      subject: "Your Express shipping label is ready",
      heading: "Your label is ready",
      body: "Your DHL label and tracking number are ready. Download the label from your shipment page, attach it to the parcel, then use DHL pickup or drop it off at a DHL service point.",
    },
    cancelled: {
      subject: "Your Express booking was cancelled",
      heading: "Booking cancelled",
      body: "Your Express booking was cancelled.",
    },
    refunded: {
      subject: "Your Express refund was issued",
      heading: "Refund issued",
      body: "A refund for your Express booking was issued to your card. It can take a few business days to appear on your statement.",
    },
    in_transit: {
      subject: "Your Express shipment is on its way",
      heading: "Your shipment is on its way",
      body: "DHL has picked up your parcel and it is now in transit. You can follow every step on your shipment page.",
    },
    out_for_delivery: {
      subject: "Your Express shipment is out for delivery",
      heading: "Out for delivery",
      body: "Your parcel is with the DHL courier and should be delivered soon.",
    },
    delivered: {
      subject: "Your Express shipment was delivered",
      heading: "Delivered",
      body: "DHL reports that your parcel was delivered.",
    },
    delivery_exception: {
      subject: "There is a delay with your Express shipment",
      heading: "A delivery issue needs attention",
      body: "DHL reported an issue with your parcel, such as a delivery attempt that failed or a customs hold. Open your shipment page for the latest update. Our team is following it with DHL.",
    },
    returned: {
      subject: "Your Express shipment is being returned",
      heading: "Shipment returned",
      body: "DHL is returning your parcel to the sender. Please contact us if you need help.",
    },
  },
  fr: {
    payment_received: {
      subject: "Paiement reçu pour votre envoi Express",
      heading: "Paiement reçu",
      body: "Nous avons reçu votre paiement. Nous créons maintenant votre étiquette DHL et vous écrirons dès qu'elle sera prête.",
    },
    label_ready: {
      subject: "Votre étiquette d'expédition Express est prête",
      heading: "Votre étiquette est prête",
      body: "Votre étiquette DHL et votre numéro de suivi sont prêts. Téléchargez l'étiquette depuis la page de votre envoi, collez-la sur le colis, puis demandez le ramassage DHL ou déposez-le dans un point de service DHL.",
    },
    cancelled: {
      subject: "Votre réservation Express a été annulée",
      heading: "Réservation annulée",
      body: "Votre réservation Express a été annulée.",
    },
    refunded: {
      subject: "Votre remboursement Express a été émis",
      heading: "Remboursement émis",
      body: "Un remboursement pour votre réservation Express a été émis sur votre carte. Il peut prendre quelques jours ouvrables pour apparaître sur votre relevé.",
    },
    in_transit: {
      subject: "Votre envoi Express est en route",
      heading: "Votre envoi est en route",
      body: "DHL a pris en charge votre colis et il est maintenant en transit. Vous pouvez suivre chaque étape sur la page de votre envoi.",
    },
    out_for_delivery: {
      subject: "Votre envoi Express est en cours de livraison",
      heading: "En cours de livraison",
      body: "Votre colis est avec le livreur DHL et devrait être livré bientôt.",
    },
    delivered: {
      subject: "Votre envoi Express a été livré",
      heading: "Livré",
      body: "DHL indique que votre colis a été livré.",
    },
    delivery_exception: {
      subject: "Un retard touche votre envoi Express",
      heading: "Un problème de livraison demande votre attention",
      body: "DHL a signalé un problème avec votre colis, par exemple une tentative de livraison échouée ou une retenue douanière. Ouvrez la page de votre envoi pour la dernière mise à jour. Notre équipe suit le dossier avec DHL.",
    },
    returned: {
      subject: "Votre envoi Express est retourné",
      heading: "Envoi retourné",
      body: "DHL retourne votre colis à l'expéditeur. Contactez-nous si vous avez besoin d'aide.",
    },
  },
};

/** Tells a client about a status change on one of their bookings, in their language. */
export async function sendExpressShipmentEmail(params: {
  to: string;
  name: string;
  language: Lang;
  kind: ExpressShipmentEmailKind;
  reference: string;
  shipmentId: string;
  detail?: string;
}) {
  const lang: Lang = params.language === "fr" ? "fr" : "en";
  const copy = SHIPMENT_COPY[lang][params.kind];
  const url = `${appUrl()}/express/shipments/${params.shipmentId}`;
  const greeting = lang === "fr" ? "Bonjour" : "Hello";
  const view = lang === "fr" ? "Voir l'envoi" : "View shipment";
  const content = `
    <h1 class="h1">${copy.heading}</h1>
    <p>${greeting} <strong>${escapeHtml(params.name)}</strong>,</p>
    <p>${copy.body}</p>
    <div class="cred-box"><strong>${lang === "fr" ? "Référence" : "Reference"}:</strong> ${escapeHtml(params.reference)}</div>
    ${params.detail ? `<div class="alert-box">${escapeHtml(params.detail)}</div>` : ""}
    <div style="text-align:center;"><a href="${url}" class="btn" target="_blank">${view}</a></div>
  `;
  return sendExpressEmail({
    to: params.to,
    subject: `${copy.subject} (${params.reference})`,
    html: emailTemplateWrapper(content, copy.heading),
    text: `${copy.heading}. ${copy.body} ${params.reference} ${url}`,
    category: `express-shipment-${params.kind}`,
  });
}

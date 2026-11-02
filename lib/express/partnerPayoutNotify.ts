import { isValidObjectId } from "mongoose";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import ExpressAccount from "@/models/ExpressAccount";
import { notifyUser } from "@/lib/notifications";
import { sendExpressPayoutAdminAlert, sendExpressPayoutEmail, type ExpressPayoutEmailKind } from "@/lib/expressEmail";

const TEXT: Record<ExpressPayoutEmailKind, { en: [string, string]; fr: [string, string] }> = {
  requested: {
    en: ["Payout requested", "We received your payout request. We send payouts to the details on file and will confirm here once it is sent."],
    fr: ["Versement demandé", "Nous avons reçu votre demande de versement. Nous l'envoyons aux coordonnées au dossier et le confirmerons ici."],
  },
  paid: {
    en: ["Payout sent", "Your payout was sent. It can take a business day or two to arrive."],
    fr: ["Versement envoyé", "Votre versement a été envoyé. Il peut prendre un ou deux jours ouvrables à arriver."],
  },
  rejected: {
    en: ["Payout not sent", "Your payout request was not sent. The reason is shown on your earnings page."],
    fr: ["Versement non envoyé", "Votre demande de versement n'a pas été envoyée. La raison est indiquée sur votre page de revenus."],
  },
  details_changed: {
    en: ["Payout details changed", "Your payout details were changed. If this was not you, contact us right away. Payout requests are paused for 24 hours."],
    fr: ["Coordonnées de versement modifiées", "Vos coordonnées de versement ont été modifiées. Si ce n'était pas vous, contactez-nous immédiatement. Les demandes de versement sont suspendues pendant 24 heures."],
  },
};

/**
 * Tells the partner about their payout: always an in-app notification, plus an email when Express emails are on.
 * Best effort: it never throws, so a notification problem cannot undo a payout.
 */
export async function notifyPartnerPayout(params: { partnerAccountId: string; kind: ExpressPayoutEmailKind; amountCents?: number; reference?: string; reason?: string }): Promise<void> {
  try {
    await connectDB();
    if (!isValidObjectId(params.partnerAccountId)) return;
    const account = await ExpressAccount.findById(params.partnerAccountId).select("userId language contactName").lean<any>();
    if (!account) return;
    const user = isValidObjectId(account.userId) ? await User.findById(account.userId).select("name email").lean<any>() : null;
    const [titleEn, descEn] = TEXT[params.kind].en;
    const [titleFr, descFr] = TEXT[params.kind].fr;
    await notifyUser({ userId: String(account.userId), title: titleEn, titleFr, desc: descEn, descFr, category: "system", link: "/express/partner/earnings" });
    if (user?.email) {
      await sendExpressPayoutEmail({ to: user.email, name: account.contactName || user.name, language: account.language || "en", kind: params.kind, amountCents: params.amountCents, reference: params.reference, reason: params.reason });
    }
  } catch (error) {
    console.warn("[Express] Payout notification failed:", error);
  }
}

/** Tells staff a partner is waiting to be paid. Best effort. */
export async function alertStaffPayoutRequested(params: { partnerAccountId: string; amountCents: number }): Promise<void> {
  try {
    await connectDB();
    const account = isValidObjectId(params.partnerAccountId) ? await ExpressAccount.findById(params.partnerAccountId).select("contactName company.name").lean<any>() : null;
    await sendExpressPayoutAdminAlert({ partnerName: account?.company?.name || account?.contactName || "A partner", amountCents: params.amountCents });
  } catch (error) {
    console.warn("[Express] Payout staff alert failed:", error);
  }
}
